import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { SessionService } from './session.service';

interface RedisOptions {
  host: string;
  port: number;
  ttl: number;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_OPTIONS',
      useFactory: (configService: ConfigService): RedisOptions => ({
        host: configService.get<string>('REDIS_HOST') || 'localhost',
        port: configService.get<number>('REDIS_PORT') || 6379,
        ttl: configService.get<number>('CACHE_TTL') || 300,
      }),
      inject: [ConfigService],
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: (options: RedisOptions) => {
        const client = new Redis({
          host: options.host,
          port: options.port,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        return client;
      },
      inject: ['REDIS_OPTIONS'],
    },
    RedisService,
    SessionService,
    {
      provide: 'REDIS_CLIENT_LIFECYCLE',
      useFactory: (client: Redis) => ({
        async onModuleDestroy() {
          await client.quit();
        },
      }),
      inject: ['REDIS_CLIENT'],
    },
  ],
  exports: [RedisService, SessionService],
})
export class RedisModule {}
