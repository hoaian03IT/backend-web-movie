import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpExceptionFilter } from 'src/http-exception';
import { CreateAuthDto } from './dto/create-auth.dto';
import { User } from 'src/schemas/user.schema';

@UseFilters(new HttpExceptionFilter())
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: CreateAuthDto): Promise<User> {
    console.log(body);
    return await this.authService.createNewUser(body);
  }
}
