import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import {
  OtpChannel,
  OtpCode,
  OtpPurpose,
} from './otp-code.entity';
import {
  OTP_DELIVERY_DRIVER,
  OtpDeliveryDriver,
} from './otp-delivery.driver';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    @Inject(OTP_DELIVERY_DRIVER)
    private readonly delivery: OtpDeliveryDriver,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async issue(
    destination: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
  ): Promise<void> {
    // Invalidate any outstanding codes for this destination+purpose.
    await this.otpRepo.update(
      { destination, purpose, consumed: false },
      { consumed: true },
    );

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const entity = this.otpRepo.create({
      destination,
      channel,
      purpose,
      codeHash: this.hash(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    await this.otpRepo.save(entity);
    await this.delivery.send(destination, code);
  }

  async verify(
    destination: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<boolean> {
    const record = await this.otpRepo.findOne({
      where: { destination, purpose, consumed: false },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('No active code for this destination');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expired');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new HttpException('Too many attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (record.codeHash !== this.hash(code)) {
      record.attempts += 1;
      await this.otpRepo.save(record);
      throw new BadRequestException('Incorrect code');
    }

    record.consumed = true;
    await this.otpRepo.save(record);
    return true;
  }
}
