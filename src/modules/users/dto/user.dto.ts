import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { LastSeenVisibility } from '../user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 64)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 280)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 512)
  avatarUrl?: string;
}

export class UpdatePrivacyDto {
  @ApiPropertyOptional({ enum: LastSeenVisibility })
  @IsOptional()
  @IsEnum(LastSeenVisibility)
  lastSeenVisibility?: LastSeenVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readReceiptsEnabled?: boolean;
}
