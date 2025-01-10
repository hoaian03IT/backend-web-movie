import { IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Id must not be empty' })
  readonly userId: string;
}
