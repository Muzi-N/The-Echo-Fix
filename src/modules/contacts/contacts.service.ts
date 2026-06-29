import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { AddContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contacts: Repository<Contact>,
  ) {}

  async add(ownerId: string, dto: AddContactDto): Promise<Contact> {
    if (ownerId === dto.contactUserId) {
      throw new BadRequestException('Cannot add yourself as a contact');
    }
    const existing = await this.contacts.findOne({
      where: { ownerId, contactUserId: dto.contactUserId },
    });
    if (existing) {
      return existing;
    }
    const contact = this.contacts.create({
      ownerId,
      contactUserId: dto.contactUserId,
      alias: dto.alias ?? null,
    });
    return this.contacts.save(contact);
  }

  async list(ownerId: string): Promise<Contact[]> {
    return this.contacts.find({
      where: { ownerId },
      relations: { contactUser: true },
      order: { favorite: 'DESC', createdAt: 'ASC' },
    });
  }

  async update(
    ownerId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.contacts.findOne({
      where: { id: contactId, ownerId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    Object.assign(contact, dto);
    return this.contacts.save(contact);
  }

  async remove(ownerId: string, contactId: string): Promise<void> {
    const result = await this.contacts.delete({ id: contactId, ownerId });
    if (!result.affected) {
      throw new NotFoundException('Contact not found');
    }
  }

  /**
   * True if either direction has a block in place. Used by messaging to
   * prevent delivery between blocked parties.
   */
  async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const count = await this.contacts.count({
      where: [
        { ownerId: a, contactUserId: b, blocked: true },
        { ownerId: b, contactUserId: a, blocked: true },
      ],
    });
    return count > 0;
  }
}
