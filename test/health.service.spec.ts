import 'reflect-metadata';
import { describe, test, expect, jest } from 'bun:test';
import { HealthService } from '../src/health/health.service';

describe('HealthService', () => {
  test('checkHealth: healthy when db + redis are up', async () => {
    const prisma = {
      $queryRaw: jest.fn(async () => 1),
    };

    const redis = {
      set: jest.fn(async () => undefined),
      get: jest.fn(async () => 'ok'),
    };

    const service = new HealthService(prisma as any, redis as any);
    const result = await service.checkHealth();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalledTimes(1);

    expect(result.status).toBe('healthy');
    expect(result.services.database.status).toBe('up');
    expect(result.services.redis.status).toBe('up');
  });
});
