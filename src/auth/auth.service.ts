import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TokenPayloadDTO } from './dto/token-payload.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
  ) {}

  async createTokens(user: UserDocument): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiredInSeconds: number;
  }> {
    const accessToken = this.createAccessToken(user);
    const { refreshToken, expiredInMilliseconds } =
      this.createRefreshToken(user);

    await this.storeRefreshTokenOnCache(
      user,
      refreshToken,
      expiredInMilliseconds,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiredInSeconds: expiredInMilliseconds,
    };
  }

  private createAccessToken(user: UserDocument): string {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const accessToken = this.jwtService.sign(
      {
        sub: user._id.toString(),
        isActive: user.is_active,
        isVerified: user.is_verified,
      },
      {
        secret: accessTokenSecret || 'access_secret',
        expiresIn: 60 * 5, // 5 minutes
      },
    );
    return accessToken;
  }

  private createRefreshToken(user: UserDocument): {
    refreshToken: string;
    expiredInMilliseconds: number;
  } {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    const expiredInMilliseconds = 1000 * 60 * 60 * 24 * 365; // 365 days in milliseconds
    const refreshToken = this.jwtService.sign(
      {
        sub: user._id.toString(),
        isActive: user.is_active,
        isVerified: user.is_verified,
      },
      {
        secret: refreshTokenSecret || 'refresh_secret',
        expiresIn: expiredInMilliseconds, // 365 days in milliseconds
      },
    );
    return { refreshToken, expiredInMilliseconds };
  }

  private async storeRefreshTokenOnCache(
    user: UserDocument,
    refreshToken: string,
    ttl: number,
  ) {
    await this.cacheManager.set(
      `refreshtoken:${user._id}:${refreshToken}`,
      1,
      ttl,
    );
  }

  async createOTPVerification(
    unique: string,
    keyCache: string,
  ): Promise<number> {
    // Generate a random 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store the OTP in a cache with a TTL of 5 minutes
    await this.cacheManager.set(`${keyCache}:${unique}`, otp, 1000 * 60 * 5);
    return otp;
  }

  async sendOTPViaEmail(userEmail: string, otp: number): Promise<void> {
    try {
      // Send the OTP via email to the user's registered email address
      const info = await this.mailerService.sendMail({
        to: userEmail,
        subject: 'IMDb - OTP Verification',
        text: `You need to verify your OTP to register your account. Your OTP is: ${otp}`,
        html: `<p>You need to verify your OTP to register your account.</p><p><strong>Your OTP is: ${otp}</strong></p>
               <p>This OTP code is expired in 5 minutes</p>`,
      });

      console.log('OTP email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending OTP email:', error.message);
      throw new NotFoundException(
        'Failed to send OTP email. Please try again later.',
      );
    }
  }

  async verifyOTP(
    unique: string,
    otp: number,
    keyCache: string,
  ): Promise<boolean> {
    const result = await this.cacheManager.get(`${keyCache}:${unique}`);
    console.log({ key: `${keyCache}:${unique}`, otp, result });
    if (Number(result) !== Number(otp)) {
      throw new BadRequestException('Invalid OTP or OTP is expired');
    }
    await this.cacheManager.del(`${keyCache}:${unique}`);
    return true;
  }

  async verifyLoginUser(
    email: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      email: email,
      is_active: true,
      is_verified: true,
    });

    // throw errors
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    } else if (!user.is_active) {
      throw new ForbiddenException('User was disabled');
    } else if (!user.is_verified) {
      throw new ForbiddenException('User was not verified');
    }

    // compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    return user;
  }

  async clearRefreshTokenOnCache(
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    let result = await this.cacheManager.get(
      `refreshtoken:${userId}:${refreshToken}`,
    );

    if (!result) throw new ForbiddenException('Invalid refresh token');

    // Remove the refresh token from cache when it's expired
    await this.cacheManager.del(`refreshtoken:${userId}:${refreshToken}`);
  }

  async refreshToken(currentRefreshToken: string) {
    const refreshTokenSecret =
      process.env.REFRESH_TOKEN_SECRET || 'refresh_token';

    // decode the refresh token
    const payload: TokenPayloadDTO = await this.jwtService.verifyAsync(
      currentRefreshToken,
      {
        secret: refreshTokenSecret,
      },
    );
    if (!payload) throw new ForbiddenException();

    // get refresh token with id
    let result = await this.cacheManager.get(
      `refreshtoken:${payload.sub}:${currentRefreshToken}`,
    );
    if (!result) throw new ForbiddenException('Invalid refresh token');

    // to optimize, store user information on cache, update cache when user update information
    const user = (await this.userModel.findById(payload.sub)) as UserDocument;

    // create tokens
    const { refreshToken, expiredInMilliseconds } =
      this.createRefreshToken(user);

    const accessToken = this.createAccessToken(user);

    // clear old refresh token before store new refresh token
    this.clearRefreshTokenOnCache(currentRefreshToken, user._id.toString());

    // store tokens
    await this.storeRefreshTokenOnCache(
      user,
      refreshToken,
      expiredInMilliseconds,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiredInSeconds: expiredInMilliseconds,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email: email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate a random 8-digit password
    const otp = Math.floor(100000 + Math.random() * 999999);
    const info = await this.mailerService.sendMail({
      to: email,
      subject: 'IMDb - OTP Verification',
      text: `You need to verify your OTP to reset your account's password. Your OTP is: ${otp}`,
      html: `<p>You need to verify your OTP to reset your account's password.</p><p><strong>Your OTP is: ${otp}</strong></p>
             <p>This OTP code is expired in 5 minutes</p>`,
    });

    // Send the new password via email to the user's registered email address
  }
}
