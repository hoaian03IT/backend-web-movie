import { IsEmail, IsNotEmpty } from 'class-validator';

export class OTPForgotPasswordDTO {
  @IsNotEmpty({ message: 'Email must not be empty' })
  @IsEmail({}, { message: 'Email must be valid' })
  readonly email: string;
}
