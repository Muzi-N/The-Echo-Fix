import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/guards/jwt.strategy';
import { RefreshToken } from './refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Access tokens are short-lived JWTs. Refresh tokens are opaque random
 * strings stored only as SHA-256 hashes, one row per device session. On
 * refresh the presented token is revoked and a new one issued (rotation), so
 * a stolen refresh token is usable at most once before detection.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
    return value * (factor as number);
  }

  async issuePair(
    userId: string,
    username: string,
    deviceLabel?: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, username };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });

    const rawRefresh = randomBytes(48).toString('hex');
    const refreshTtl = this.config.get<string>('jwt.refreshTtl') as string;
    const entity = this.refreshRepo.create({
      userId,
      tokenHash: this.hash(rawRefresh),
      deviceLabel: deviceLabel ?? null,
      expiresAt: new Date(Date.now() + this.parseTtlMs(refreshTtl)),
    });
    await this.refreshRepo.save(entity);

    return { accessToken, refreshToken: rawRefresh };
  }

  async rotate(rawRefresh: string): Promise<TokenPair & { userId: string }> {
    const tokenHash = this.hash(rawRefresh);
    const record = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!record || record.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the presented token, then issue a fresh pair.
    record.revoked = true;
    await this.refreshRepo.save(record);

    const pair = await this.issuePair(
      record.userId,
      record.user.username,
      record.deviceLabel ?? undefined,
    );
    return { ...pair, userId: record.userId };
  }

  async revoke(rawRefresh: string): Promise<void> {
    await this.refreshRepo.update(
      { tokenHash: this.hash(rawRefresh) },
      { revoked: true },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshRepo.update({ userId }, { revoked: true });
  }
}
