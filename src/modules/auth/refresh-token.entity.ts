import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../users/user.entity';

/**
 * Persisted refresh tokens enable rotation and revocation. Only a hash of the
 * token is stored, so a database read cannot reconstruct a usable token. Each
 * row maps to one device/session, supporting multi-device login and per-device
 * logout.
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // SHA-256 hash of the raw refresh token.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceLabel!: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;
}
