import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';
export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';

/**
 * Three connections, each with a single responsibility:
 *  - REDIS_CLIENT: general commands (presence sets, health ping).
 *  - REDIS_SUBSCRIBER: enters subscriber mode; only ever subscribes.
 *  - REDIS_PUBLISHER: only ever publishes.
 * ioredis forbids mixing subscriber-mode and regular commands on one
 * connection, so keeping publish isolated from the subscriber connection
 * prevents "Connection in subscriber mode" errors under load.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('redis.url') as string, {
          maxRetriesPerRequest: null,
          lazyConnect: false,
        }),
    },
    {
      provide: REDIS_SUBSCRIBER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('redis.url') as string, {
          maxRetriesPerRequest: null,
          lazyConnect: false,
          // A subscriber connection must not run the INFO-based ready check;
          // INFO is rejected once the connection enters subscriber mode, which
          // otherwise prevents SUBSCRIBE from ever completing.
          enableReadyCheck: false,
        }),
    },
    {
      provide: REDIS_PUBLISHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('redis.url') as string, {
          maxRetriesPerRequest: null,
          lazyConnect: false,
        }),
    },
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER, REDIS_PUBLISHER],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}

  async onModuleDestroy() {
    // Connections are closed by the framework on shutdown; explicit quit is
    // handled in main.ts enableShutdownHooks path.
  }
}
