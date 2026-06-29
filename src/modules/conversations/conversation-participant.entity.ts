import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Conversation } from './conversation.entity';
import { User } from '../users/user.entity';

export enum ParticipantRole {
  Member = 'member',
  Admin = 'admin',
  Owner = 'owner',
}

/**
 * Membership of a user in a conversation. lastReadMessageId is the read
 * cursor used to compute unread counts and drive read receipts without
 * scanning the whole message table.
 */
@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
export class ConversationParticipant extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, (c) => c.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (u) => u.participations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: ParticipantRole, default: ParticipantRole.Member })
  role!: ParticipantRole;

  @Column({ type: 'uuid', nullable: true })
  lastReadMessageId!: string | null;

  @Column({ type: 'boolean', default: false })
  muted!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null;
}
