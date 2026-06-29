import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../users/user.entity';

/**
 * Directed contact edge. owner adds contactUser. Blocking and favoriting are
 * properties of the directed edge, so A can block B without affecting B's
 * view of A.
 */
@Entity('contacts')
@Unique(['ownerId', 'contactUserId'])
export class Contact extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Index()
  @Column({ type: 'uuid' })
  contactUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactUserId' })
  contactUser!: User;

  // Local alias the owner assigns, overriding the contact's display name.
  @Column({ type: 'varchar', length: 64, nullable: true })
  alias!: string | null;

  @Column({ type: 'boolean', default: false })
  favorite!: boolean;

  @Column({ type: 'boolean', default: false })
  blocked!: boolean;
}
