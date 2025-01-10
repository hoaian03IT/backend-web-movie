import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Res,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpExceptionFilter } from 'src/http-exception';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { Response } from 'express';
import { OtpDto } from './dto/opt.dto';

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

    // create OPT
    const otp = await this.authService.createOTPVerification(
      newUser._id.toString(),
    );

    // send OTP via email
    if (otp) await this.authService.sendOTPViaEmail(newUser.email, otp);
    else throw new InternalServerErrorException();

    return newUser._id.toString();
  }

  @Post('registration-verify')
  async verifyRegistration(
    @Body() body: OtpDto,
    @Res() res: Response,
  ): Promise<void> {
    const { userId, otp } = body;
    const valid = await this.authService.verifyOTP(userId, Number(otp));

    // throw error if OTP is invalid or expired
    if (!valid) {
      throw new BadRequestException('Invalid OTP or expired OTP');
    }

    // update user's is_verified status to true
    const user = await this.userService.updateVerifiedStatus(userId, valid);

    // throw new BadRequestException if user does not exist after updating
    if (!user) {
      throw new NotFoundException('User not found');
    }
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
}
