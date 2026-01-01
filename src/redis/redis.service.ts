import {
  Injectable,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';

interface RedisOptions {
  host: string;
  port: number;
  ttl: number;
}

@Injectable()
export class RedisService {
  private defaultTtl: number;

  constructor(
    @Inject('REDIS_OPTIONS') private options: RedisOptions,
    @Inject('REDIS_CLIENT') private readonly client: Redis,
  ) {
    this.defaultTtl = options.ttl;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await this.client.get(key);
      if (!data) return undefined;
      return JSON.parse(data) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl || this.defaultTtl;
    await this.client.setex(key, expiry, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async reset(): Promise<void> {
    await this.client.flushdb();
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys && keys.length > 0) {
      await Promise.all(keys.map((key: string) => this.del(key)));
    }
  }
}
