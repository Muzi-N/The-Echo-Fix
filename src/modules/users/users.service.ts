import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdatePrivacyDto, UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    await this.users.update({ id }, dto);
    return this.findById(id);
  }

  async updatePrivacy(id: string, dto: UpdatePrivacyDto): Promise<User> {
    await this.users.update({ id }, dto);
    return this.findById(id);
  }

  /**
   * Search by username or display name, excluding the caller. Capped to keep
   * the response bounded; pagination can be layered on later.
   */
  async search(query: string, excludeId: string): Promise<User[]> {
    const term = `%${query}%`;
    return this.users.find({
      where: [
        { username: ILike(term), id: Not(excludeId) },
        { displayName: ILike(term), id: Not(excludeId) },
      ],
      take: 25,
    });
  }

  async setOnline(id: string, online: boolean): Promise<void> {
    await this.users.update(
      { id },
      { isOnline: online, lastSeenAt: online ? null : new Date() },
    );
  }

  async deleteAccount(id: string): Promise<void> {
    await this.users.delete({ id });
  }
}
