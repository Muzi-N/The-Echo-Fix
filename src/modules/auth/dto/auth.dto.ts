import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export class RegisterDto {
  @ApiProperty({ example: 'muzi' })
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'username may contain only lowercase letters, digits, underscore',
  })
  username!: string;

  @ApiProperty({ example: '+27821234567' })
  @Matches(PHONE_REGEX, { message: 'phoneNumber must be E.164 format' })
  phoneNumber!: string;

  @ApiProperty({ example: 'Muzi Nkosi' })
  @IsString()
  @Length(1, 64)
  displayName!: string;

  @ApiProperty({ example: 'StrongPassw0rd!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false, example: 'muzi@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class LoginDto {
  @ApiProperty({ example: '+27821234567' })
  @IsString()
  @IsNotEmpty()
  identifier!: string; // phone or username

  @ApiProperty({ example: 'StrongPassw0rd!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ required: false, example: 'Pixel 9 Pro' })
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '+27821234567' })
  @IsString()
  @IsNotEmpty()
  destination!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+27821234567' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+27821234567' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NewStrongPassw0rd!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
