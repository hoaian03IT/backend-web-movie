import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as jwt from 'jsonwebtoken';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly mailerService: MailerService,
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
    const accessToken = jwt.sign(
      { id: user._id, isActive: user.is_active, isVerified: user.is_verified },
      accessTokenSecret || 'access_secret',
      {
        expiresIn: 1000 * 60, // 60 seconds
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
    const refreshToken = jwt.sign(
      { id: user._id, isActive: user.is_active, isVerified: user.is_verified },
      refreshTokenSecret || 'refresh_secret',
      {
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

  async createOTPVerification(userId: string): Promise<number | null> {
    // Generate a random 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000);
    // Store the OTP in a cache with a TTL of 5 minutes
    try {
      console.log(`otp:${userId}`);

      await this.cacheManager.set(`otp_verify_${userId}`, otp, 1000 * 60 * 5);
      console.log(otp);
      return otp;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async sendOTPViaEmail(userEmail: string, otp: number): Promise<void> {
    try {
      // Send the OTP via email to the user's registered email address
      const info = await this.mailerService.sendMail({
        to: userEmail,
        subject: 'IMDb - OTP Verification',
        text: `You need to verify your OTP to register your account. Your OTP is: ${otp}`,
        html: `<p>You need to verify your OTP to register your account.</p><p><strong>Your OTP is: ${otp}</strong></p>`,
      });

      console.log('OTP email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending OTP email:', error.message);
      throw new NotFoundException(
        'Failed to send OTP email. Please try again later.',
      );
    }
  }

  async verifyOTP(userId: string, otp: number): Promise<boolean> {
    const result = await this.cacheManager.get(`otp:${userId}`);
    return result === otp;
  }
}
