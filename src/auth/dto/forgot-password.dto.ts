import {
  IsEmail,
  IsNotEmpty,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from 'src/decorators/password.decorator';

export class ForgotPasswordDTO {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be valid' })
  readonly email: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be valid' })
  readonly otp: number;

  @MinLength(8, { message: 'Password is at least 8 characters' })
  @MaxLength(64, { message: 'Password is at most 64 characters' })
  @IsStrongPassword()
  readonly password: string;
}
