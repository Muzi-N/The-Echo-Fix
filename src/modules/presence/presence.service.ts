import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

/**
 * Presence is tracked in Redis so it works across multiple API instances.
 * Each user maps to a set of active socket ids. A user is online while that
 * set is non-empty. This avoids marking a user offline when only one of
 * several devices disconnects.
 */
@Injectable()
export class PresenceService {
  private readonly onlineKey = (userId: string) => `presence:user:${userId}`;
  private readonly ttlSeconds = 60;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addSocket(userId: string, socketId: string): Promise<boolean> {
    const key = this.onlineKey(userId);
    const countBefore = await this.redis.scard(key);
    await this.redis.sadd(key, socketId);
    await this.redis.expire(key, this.ttlSeconds);
    // Returns true if this connection brought the user from offline to online.
    return countBefore === 0;
  }

  async removeSocket(userId: string, socketId: string): Promise<boolean> {
    const key = this.onlineKey(userId);
    await this.redis.srem(key, socketId);
    const countAfter = await this.redis.scard(key);
    // Returns true if this was the user's last connection (now offline).
    return countAfter === 0;
  }

  async heartbeat(userId: string): Promise<void> {
    await this.redis.expire(this.onlineKey(userId), this.ttlSeconds);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.scard(this.onlineKey(userId))) > 0;
  }

  async getSocketIds(userId: string): Promise<string[]> {
    return this.redis.smembers(this.onlineKey(userId));
  }
}
