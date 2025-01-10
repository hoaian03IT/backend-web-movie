import { IsNotEmpty } from 'class-validator';

export class OtpDto {
  @IsNotEmpty({ message: 'Id must not be empty' })
  readonly userId: string;

  @IsNotEmpty({ message: 'OPT must not be empty' })
  readonly otp: string;
}
