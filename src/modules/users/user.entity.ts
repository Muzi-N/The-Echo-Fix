import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Contact } from '../contacts/contact.entity';
import { ConversationParticipant } from '../conversations/conversation-participant.entity';
import { Message } from '../messages/message.entity';

export enum LastSeenVisibility {
  Everyone = 'everyone',
  Contacts = 'contacts',
  Nobody = 'nobody',
}

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  username!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  phoneNumber!: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 64 })
  displayName!: string;

  @Column({ type: 'varchar', length: 280, nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl!: string | null;

  // argon2id hash. Never selected by default to avoid accidental exposure.
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false })
  phoneVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isOnline!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  // Privacy controls
  @Column({
    type: 'enum',
    enum: LastSeenVisibility,
    default: LastSeenVisibility.Everyone,
  })
  lastSeenVisibility!: LastSeenVisibility;

  @Column({ type: 'boolean', default: true })
  readReceiptsEnabled!: boolean;

  @OneToMany(() => Contact, (contact) => contact.owner)
  contacts!: Contact[];

  @OneToMany(() => ConversationParticipant, (p) => p.user)
  participations!: ConversationParticipant[];

  @OneToMany(() => Message, (message) => message.sender)
  messages!: Message[];
}
