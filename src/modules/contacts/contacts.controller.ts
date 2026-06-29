import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';
import { AddContactDto, UpdateContactDto } from './dto/contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a contact' })
  add(@CurrentUser() user: AuthUser, @Body() dto: AddContactDto) {
    return this.contacts.add(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts, favorites first' })
  list(@CurrentUser() user: AuthUser) {
    return this.contacts.list(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact (alias, favorite, block)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a contact' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contacts.remove(user.id, id);
    return { removed: true };
  }
}
