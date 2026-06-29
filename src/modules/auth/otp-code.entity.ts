import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';

export enum OtpChannel {
  Phone = 'phone',
  Email = 'email',
}

export enum OtpPurpose {
  Registration = 'registration',
  PasswordReset = 'password_reset',
  Verification = 'verification',
}

/**
 * One-time codes. Only the hash of the code is persisted. Codes are single use
 * and expire quickly; attempt counting blocks brute force.
 */
@Entity('otp_codes')
@Index(['destination', 'purpose'])
export class OtpCode extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  destination!: string;

  @Column({ type: 'enum', enum: OtpChannel })
  channel!: OtpChannel;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose!: OtpPurpose;

  @Column({ type: 'varchar', length: 64 })
  codeHash!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'boolean', default: false })
  consumed!: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
