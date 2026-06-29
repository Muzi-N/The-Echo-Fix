import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { REDIS_CLIENT } from '../presence/redis.module';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency readiness probe' })
  async check() {
    const [db, cache] = await Promise.allSettled([
      this.dataSource.query('SELECT 1'),
      this.redis.ping(),
    ]);
    const dbOk = db.status === 'fulfilled';
    const cacheOk = cache.status === 'fulfilled';
    return {
      status: dbOk && cacheOk ? 'ok' : 'degraded',
      checks: {
        database: dbOk ? 'up' : 'down',
        redis: cacheOk ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
