import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';

class CreateDirectDto {
  @IsUUID()
  userId!: string;
}

@ApiTags('conversations')
@ApiBearerAuth()
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post('direct')
  @ApiOperation({ summary: 'Get or create a direct conversation with a user' })
  createDirect(@CurrentUser() user: AuthUser, @Body() dto: CreateDirectDto) {
    return this.conversations.getOrCreateDirect(user.id, dto.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List the caller conversations, most recent first' })
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.listForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation the caller belongs to' })
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.conversations.assertMember(id, user.id);
    return this.conversations.findById(id);
  }
}
