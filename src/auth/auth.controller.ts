import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpExceptionFilter } from 'src/http-exception';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { Request, Response } from 'express';
import { OtpDto } from './dto/otp.dto';
import { ResendOtpDto } from './dto/resendOtp.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { TokenPayloadDTO } from './dto/token-payload.dto';
import { OTPForgotPasswordDTO } from './dto/otp-forgot-password.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';

@UseFilters(new HttpExceptionFilter())
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: CreateUserDto): Promise<string> {
    // create a new user with verified status is false
    const newUser = await this.userService.createNewUser(body);

    // create OTP
    const otp = await this.authService.createOTPVerification(
      newUser._id.toString(),
      'user-register:otp',
    );

    // send OTP via email
    await this.authService.sendOTPViaEmail(newUser.email, otp);

    return newUser._id.toString();
  }

  @Post('registration-verify')
  async verifyRegistration(
    @Body() body: OtpDto,
    @Res() res: Response,
  ): Promise<void> {
    const { userId, otp } = body;
    const valid = await this.authService.verifyOTP(
      userId,
      Number(otp),
      'user-register:otp',
    );

    // update user's is_verified status to true
    const user = await this.userService.updateVerifiedStatus(userId, valid);

    // create tokens for client session
    const { accessToken, refreshToken, refreshTokenExpiredInSeconds } =
      await this.authService.createTokens(user);

    // send success response with tokens
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: refreshTokenExpiredInSeconds,
      })
      .json({
        message: 'Register successfully',
        token: accessToken,
        userInfo: {
          email: user.email,
          name: user.name,
        },
      });
  }

  @Post('registration-resend-otp')
  async resendRegistrationOTP(@Body() body: ResendOtpDto): Promise<string> {
    const user = await this.userService.findUserUnVerifiedById(body.userId);

    // create OTP
    const otp = await this.authService.createOTPVerification(
      user._id.toString(),
      'user-register:otp',
    );

    // sent OTP
    await this.authService.sendOTPViaEmail(user.email, otp);

    return 'Resend successfully';
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response): Promise<void> {
    const user = await this.authService.verifyLoginUser(
      body.email,
      body.password,
    );

    // create tokens for client session
    const { accessToken, refreshToken, refreshTokenExpiredInSeconds } =
      await this.authService.createTokens(user);

    // send success response with tokens
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: refreshTokenExpiredInSeconds,
      })
      .json({
        message: 'Login successfully',
        token: accessToken,
        userInfo: {
          email: user.email,
          name: user.name,
        },
      });
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies['refreshToken'];

    const user = req.user as TokenPayloadDTO;

    // delete refresh token from cache
    await this.authService.clearRefreshTokenOnCache(refreshToken, user.sub);

    // clear cookies from client
    res.clearCookie('refreshToken').json({ message: 'Login successfully' });
  }

  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken, refreshTokenExpiredInSeconds } =
      await this.authService.refreshToken(req.cookies['refreshToken'] || '');

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: refreshTokenExpiredInSeconds,
      })
      .json({
        message: 'Refresh token successfully',
        token: accessToken,
      });
  }

  @Post('otp-forgot-password')
  async OTPForgotPassword(
    @Body() body: OTPForgotPasswordDTO,
  ): Promise<{ message: string }> {
    // create otp
    const otp = await this.authService.createOTPVerification(
      body.email,
      'user-forgot-password:otp',
    );

    // send OTP via email
    await this.authService.sendOTPViaEmail(body.email, otp);

    return { message: 'Sent email successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDTO) {
    await this.authService.verifyOTP(
      body.email,
      body.otp,
      'user-forgot-password:otp',
    );

    // update user's password
    await this.userService.updatePassword(body.email, undefined, body.password);

    return { message: 'Password updated successfully' };
  }
}
