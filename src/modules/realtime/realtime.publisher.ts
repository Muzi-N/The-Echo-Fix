import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { REDIS_PUBLISHER, REDIS_SUBSCRIBER } from '../presence/redis.module';
import {
  REALTIME_CHANNEL,
  RealtimeEnvelope,
} from './ws-events';

/**
 * Bridges the local Socket.IO server with a Redis pub/sub channel. Any
 * instance can publish an envelope; every instance receives it and emits to
 * the sockets it personally holds for the target users. This makes realtime
 * delivery correct under horizontal scaling without sticky sessions.
 *
 * Per-user rooms are named `user:{id}`. A user's every device-socket joins
 * that room on connect.
 */
@Injectable()
export class RealtimePublisher implements OnModuleInit {
  private readonly logger = new Logger(RealtimePublisher.name);
  private server: Server | null = null;

  constructor(
    @Inject(REDIS_PUBLISHER) private readonly pub: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly sub: Redis,
  ) {}

  // The gateway hands its server instance here once initialised.
  bindServer(server: Server) {
    this.server = server;
  }

  async onModuleInit() {
    await this.sub.subscribe(REALTIME_CHANNEL);
    this.sub.on('message', (_channel, raw) => {
      try {
        const envelope = JSON.parse(raw) as RealtimeEnvelope;
        this.deliverLocal(envelope);
      } catch (err) {
        this.logger.error('Failed to process realtime envelope', err as Error);
      }
    });
  }

  // Publish to all instances (including self) for consistent fan-out.
  async publish(envelope: RealtimeEnvelope): Promise<void> {
    try {
      await this.pub.publish(REALTIME_CHANNEL, JSON.stringify(envelope));
    } catch (err) {
      this.logger.error('Failed to publish realtime envelope', err as Error);
    }
  }

  private deliverLocal(envelope: RealtimeEnvelope) {
    if (!this.server) return;
    for (const userId of envelope.targetUserIds) {
      this.server.to(`user:${userId}`).emit(envelope.event, envelope.payload);
    }
  }

  static userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
