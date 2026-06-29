import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Conversation } from '../conversations/conversation.entity';
import { User } from '../users/user.entity';

export enum MessageType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
  VoiceNote = 'voice_note',
}

export enum MessageStatus {
  Sent = 'sent',
  Delivered = 'delivered',
  Read = 'read',
}

@Entity('messages')
// Composite index drives the primary access pattern: fetch a conversation's
// messages newest-first with keyset pagination.
@Index(['conversationId', 'createdAt'])
export class Message extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Index()
  @Column({ type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => User, (u) => u.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.Text })
  type!: MessageType;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  // For media types, points to stored object. Media pipeline lands in a later
  // milestone; the column exists now so the contract is stable.
  @Column({ type: 'varchar', length: 512, nullable: true })
  mediaUrl!: string | null;

  @Column({ type: 'uuid', nullable: true })
  replyToId!: string | null;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.Sent })
  status!: MessageStatus;

  @Column({ type: 'boolean', default: false })
  edited!: boolean;

  // Soft delete: preserves the row for receipt integrity while hiding content.
  @Column({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
