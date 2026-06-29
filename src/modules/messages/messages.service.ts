import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  EditMessageDto,
  ListMessagesQuery,
  SendMessageDto,
} from './dto/message.dto';
import { Message, MessageStatus, MessageType } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    private readonly conversations: ConversationsService,
    private readonly contacts: ContactsService,
  ) {}

  async send(senderId: string, dto: SendMessageDto): Promise<Message> {
    await this.conversations.assertMember(dto.conversationId, senderId);

    // Block enforcement for direct conversations.
    const participantIds = await this.conversations.getParticipantUserIds(
      dto.conversationId,
    );
    const others = participantIds.filter((id) => id !== senderId);
    for (const other of others) {
      if (await this.contacts.isBlockedBetween(senderId, other)) {
        throw new ForbiddenException('Messaging blocked between users');
      }
    }

    const message = this.messages.create({
      conversationId: dto.conversationId,
      senderId,
      type: dto.type ?? MessageType.Text,
      body: dto.body ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      replyToId: dto.replyToId ?? null,
      status: MessageStatus.Sent,
    });
    const saved = await this.messages.save(message);
    await this.conversations.touchLastMessage(
      dto.conversationId,
      saved.createdAt,
    );
    return saved;
  }

  /**
   * Newest-first keyset pagination on (conversationId, createdAt). Avoids the
   * OFFSET performance cliff on large conversations.
   */
  async list(
    userId: string,
    conversationId: string,
    query: ListMessagesQuery,
  ): Promise<Message[]> {
    await this.conversations.assertMember(conversationId, userId);
    const where: Record<string, unknown> = { conversationId };
    if (query.before) {
      where.createdAt = LessThan(new Date(query.before));
    }
    return this.messages.find({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
    });
  }

  async edit(
    userId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<Message> {
    const message = await this.findOwned(userId, messageId);
    message.body = dto.body;
    message.edited = true;
    return this.messages.save(message);
  }

  async softDelete(userId: string, messageId: string): Promise<Message> {
    const message = await this.findOwned(userId, messageId);
    message.deletedAt = new Date();
    message.body = null;
    message.mediaUrl = null;
    return this.messages.save(message);
  }

  /**
   * Marks all messages up to and including messageId as read for the caller,
   * and advances the participant read cursor. Returns the sender ids that
   * should be notified of the read receipt.
   */
  async markRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this.conversations.assertMember(conversationId, userId);
    const target = await this.messages.findOne({ where: { id: messageId } });
    if (!target) {
      throw new NotFoundException('Message not found');
    }
    await this.messages
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.Read })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('createdAt <= :ts', { ts: target.createdAt })
      .andWhere('status != :read', { read: MessageStatus.Read })
      .execute();
    await this.conversations.setReadCursor(conversationId, userId, messageId);
  }

  async markDelivered(conversationId: string, recipientId: string) {
    await this.messages
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.Delivered })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :recipientId', { recipientId })
      .andWhere('status = :sent', { sent: MessageStatus.Sent })
      .execute();
  }

  async search(
    userId: string,
    term: string,
  ): Promise<Message[]> {
    // Restricts results to conversations the user belongs to.
    return this.messages
      .createQueryBuilder('m')
      .innerJoin(
        'conversation_participants',
        'p',
        'p.conversationId = m.conversationId AND p.userId = :userId',
        { userId },
      )
      .where('m.deletedAt IS NULL')
      .andWhere('m.body ILIKE :term', { term: `%${term}%` })
      .orderBy('m.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  private async findOwned(
    userId: string,
    messageId: string,
  ): Promise<Message> {
    const message = await this.messages.findOne({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('Not your message');
    }
    return message;
  }
}
