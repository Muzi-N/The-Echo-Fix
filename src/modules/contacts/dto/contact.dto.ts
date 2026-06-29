import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class AddContactDto {
  @ApiProperty()
  @IsUUID()
  contactUserId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 64)
  alias?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 64)
  alias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}
