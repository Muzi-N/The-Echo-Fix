import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Conversation,
  ConversationType,
} from './conversation.entity';
import { ConversationParticipant } from './conversation-participant.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participants: Repository<ConversationParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns the existing direct conversation between two users, or creates one
   * atomically. The lookup finds a Direct conversation that has both users as
   * participants and exactly two participants total.
   */
  async getOrCreateDirect(
    userA: string,
    userB: string,
  ): Promise<Conversation> {
    const existing = await this.conversations
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p')
      .where('c.type = :type', { type: ConversationType.Direct })
      .andWhere('p.userId IN (:...ids)', { ids: [userA, userB] })
      .groupBy('c.id')
      .having('COUNT(DISTINCT p.userId) = 2')
      .getOne();

    if (existing) {
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      const conversation = manager.create(Conversation, {
        type: ConversationType.Direct,
      });
      await manager.save(conversation);
      await manager.save([
        manager.create(ConversationParticipant, {
          conversationId: conversation.id,
          userId: userA,
        }),
        manager.create(ConversationParticipant, {
          conversationId: conversation.id,
          userId: userB,
        }),
      ]);
      return conversation;
    });
  }

  async assertMember(
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipant> {
    const participant = await this.participants.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }
    return participant;
  }

  async getParticipantUserIds(conversationId: string): Promise<string[]> {
    const rows = await this.participants.find({
      where: { conversationId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async listForUser(userId: string): Promise<Conversation[]> {
    return this.conversations
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'mine', 'mine.userId = :userId', { userId })
      .leftJoinAndSelect('c.participants', 'p')
      .leftJoinAndSelect('p.user', 'u')
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();
  }

  async findById(id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async touchLastMessage(conversationId: string, when: Date): Promise<void> {
    await this.conversations.update(
      { id: conversationId },
      { lastMessageAt: when },
    );
  }

  async setReadCursor(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<void> {
    await this.participants.update(
      { conversationId, userId },
      { lastReadMessageId: messageId },
    );
  }
}
