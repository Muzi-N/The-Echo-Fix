import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
} from './config/configuration';
import { validateEnv } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { entities } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { HealthModule } from './modules/health/health.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PresenceModule } from './modules/presence/presence.module';
import { RedisModule } from './modules/presence/redis.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, jwtConfig, databaseConfig, redisConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities,
        // Migrations are the source of truth for schema. Never synchronize in
        // any environment to avoid accidental destructive changes.
        synchronize: false,
        autoLoadEntities: true,
        ssl:
          config.get<string>('app.env') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    // Global rate limiting: 120 requests per minute per IP by default.
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 120 },
    ]),
    RedisModule,
    PresenceModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    RealtimeModule,
    HealthModule,
  ],
  providers: [
    // Secure by default: JWT auth on every route unless @Public.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Throttling applied globally.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
