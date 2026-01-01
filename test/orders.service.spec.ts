import 'reflect-metadata';
import { describe, test, expect, jest } from 'bun:test';
import { OrdersService } from '../src/orders/orders.service';
import { OrderStatus, Role } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  test('track: returns factory result via redis.getOrSet', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn(async () => ({
          id: 'o1',
          trackingNumber: 'TRK-1',
          senderName: 'S',
          recipientName: 'R',
          origin: 'A',
          destination: 'B',
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    };

    const redis = {
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<any>) =>
        factory(),
      ),
      del: jest.fn(async () => undefined),
    };

    const service = new OrdersService(prisma as any, redis as any);
    const result = await service.track('TRK-1');

    expect(redis.getOrSet).toHaveBeenCalledTimes(1);
    expect(prisma.order.findUnique).toHaveBeenCalledTimes(1);
    expect(result.trackingNumber).toBe('TRK-1');
  });

  test('track: throws when order not found', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn(async () => null),
      },
    };

    const redis = {
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<any>) =>
        factory(),
      ),
      del: jest.fn(async () => undefined),
    };

    const service = new OrdersService(prisma as any, redis as any);

    await expect(service.track('TRK-X')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('updateStatus: blocks canceled orders', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn(async () => ({
          userId: 'u1',
          status: OrderStatus.CANCELED,
        })),
        update: jest.fn(),
      },
    };

    const redis = {
      del: jest.fn(async () => undefined),
    };

    const service = new OrdersService(prisma as any, redis as any);

    await expect(
      service.updateStatus(
        'o1',
        { status: OrderStatus.IN_TRANSIT },
        'u1',
        Role.USER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
