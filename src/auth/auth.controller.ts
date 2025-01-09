import { Body, Controller, Inject, Post, UseFilters } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpExceptionFilter } from 'src/http-exception';
import { User } from 'src/schemas/user.schema';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@UseFilters(new HttpExceptionFilter())
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    const newUser = await this.userService.createNewUser(body);
    const {} = this.authService.createTokens();
    return newUser;
  }
}
