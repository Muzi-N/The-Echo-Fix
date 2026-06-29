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
import { UsersService } from './users.service';
import { UpdatePrivacyDto, UpdateProfileDto } from './dto/user.dto';
import { LastSeenVisibility, User } from './user.entity';

// Shapes the public-facing user view, honoring privacy settings.
function toPublicView(user: User, viewerIsContact = false) {
  const showLastSeen =
    user.lastSeenVisibility === LastSeenVisibility.Everyone ||
    (user.lastSeenVisibility === LastSeenVisibility.Contacts &&
      viewerIsContact);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isOnline: showLastSeen ? user.isOnline : false,
    lastSeenAt: showLastSeen ? user.lastSeenAt : null,
  };
}

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async me(@CurrentUser() user: AuthUser) {
    const full = await this.users.findById(user.id);
    return {
      ...toPublicView(full, true),
      phoneNumber: full.phoneNumber,
      email: full.email,
      phoneVerified: full.phoneVerified,
      lastSeenVisibility: full.lastSeenVisibility,
      readReceiptsEnabled: full.readReceiptsEnabled,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile fields' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return toPublicView(await this.users.updateProfile(user.id, dto), true);
  }

  @Patch('me/privacy')
  @ApiOperation({ summary: 'Update privacy settings' })
  async updatePrivacy(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePrivacyDto,
  ) {
    const updated = await this.users.updatePrivacy(user.id, dto);
    return {
      lastSeenVisibility: updated.lastSeenVisibility,
      readReceiptsEnabled: updated.readReceiptsEnabled,
    };
  }

  @Delete('me')
  @ApiOperation({ summary: 'Permanently delete the account' })
  async deleteMe(@CurrentUser() user: AuthUser) {
    await this.users.deleteAccount(user.id);
    return { deleted: true };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or display name' })
  async search(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    const results = await this.users.search(q ?? '', user.id);
    return results.map((u) => toPublicView(u));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public user profile by id' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return toPublicView(await this.users.findById(id));
  }
}
