import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from '../messages/message.entity';

export enum ConversationType {
  Direct = 'direct',
  Group = 'group',
}

/**
 * A conversation is the container for messages. Milestone one uses only
 * Direct (exactly two participants), but the model carries a type and a
 * participant join table so Group can be added later without a schema
 * rewrite.
 */
@Entity('conversations')
export class Conversation extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.Direct,
  })
  type!: ConversationType;

  // Group-only fields, null for direct conversations.
  @Column({ type: 'varchar', length: 128, nullable: true })
  title!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants!: ConversationParticipant[];

  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[];
}
