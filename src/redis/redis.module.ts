import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { SessionService } from './session.service';

interface RedisOptions {
  host: string;
  port: number;
  ttl: number;
  url?: string;
  password?: string;
  tls?: boolean;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_OPTIONS',
      useFactory: (configService: ConfigService): RedisOptions => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const ttl = configService.get<number>('CACHE_TTL') || 300;

        let host = configService.get<string>('REDIS_HOST') || 'localhost';
        let port = configService.get<number>('REDIS_PORT') || 6379;
        let password = configService.get<string>('REDIS_PASSWORD');
        let tls =
          (configService.get<string>('REDIS_TLS') || '').toLowerCase() === 'true';

        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            if (parsed.hostname) host = parsed.hostname;
            if (parsed.port) {
              const parsedPort = Number(parsed.port);
              if (Number.isFinite(parsedPort)) port = parsedPort;
            }
            if (parsed.password) password = decodeURIComponent(parsed.password);
            if (parsed.protocol === 'rediss:') tls = true;
          } catch {
            // ignore invalid REDIS_URL; fallback to REDIS_HOST/REDIS_PORT
          }
        }

        return {
          host,
          port,
          ttl,
          url: redisUrl,
          password,
          tls,
        };
      },
      inject: [ConfigService],
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: (options: RedisOptions) => {
        const baseOptions = {
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
          ...(options.password ? { password: options.password } : {}),
          ...(options.tls ? { tls: {} } : {}),
        };

        const client = options.url
          ? new Redis(options.url, baseOptions)
          : new Redis({
              host: options.host,
              port: options.port,
              ...baseOptions,
            });

        client.on('error', (err: Error) => {
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
