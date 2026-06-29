import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MessageType } from '../message.entity';

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  conversationId!: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.Text })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 8000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  body!: string;
}

export class ListMessagesQuery {
  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  // Keyset pagination cursor: return messages created before this ISO time.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  before?: string;
}

export class MarkReadDto {
  @ApiProperty()
  @IsUUID()
  messageId!: string;
}
