import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import {
  EditMessageDto,
  ListMessagesQuery,
} from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller({ version: '1' })
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List messages (newest first, keyset paginated)' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQuery,
  ) {
    return this.messages.list(user.id, id, query);
  }

  @Get('messages/search')
  @ApiOperation({ summary: 'Search messages across the caller conversations' })
  search(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.messages.search(user.id, q ?? '');
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit a message you sent' })
  edit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messages.edit(user.id, id, dto);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message you sent (soft delete)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.messages.softDelete(user.id, id);
  }
}
