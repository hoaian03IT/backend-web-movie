import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  readonly email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password is at least 8 characters' })
  @MaxLength(64, { message: 'Password is at most 64 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#_&.])[A-Za-z\d!@#_&.]{8,64}$/,
    {
      message:
        'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (!@#_&.).',
    },
  )
  readonly password: string;

  @IsOptional()
  @IsBoolean({ message: 'Status account must be boolean' })
  readonly isActive: boolean;
}
