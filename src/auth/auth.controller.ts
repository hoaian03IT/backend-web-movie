import {
  Body,
  Controller,
  Inject,
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

@UseFilters(new HttpExceptionFilter())
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: CreateUserDto, @Res() res: Response) {
    const newUser = await this.userService.createNewUser(body);
    const { accessToken, refreshToken, refreshTokenExpiredInSeconds } =
      await this.authService.createTokens(newUser as UserDocument);
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: refreshTokenExpiredInSeconds,
      })
      .json({
        message: 'Register successfully',
        token: accessToken,
        userInfo: {
          email: newUser.email,
          name: newUser.name,
        },
      });
  }
}
