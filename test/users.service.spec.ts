import 'reflect-metadata';
import { describe, test, expect, jest } from 'bun:test';
import { UsersService } from '../src/users/users.service';
import { Role } from '@prisma/client';

describe('UsersService', () => {
  test('findByEmail: queries prisma with email', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({ id: 'u1', email: 'a@a.com' })),
      },
    };

    const service = new UsersService(prisma as any);
    const result = await service.findByEmail('a@a.com');

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'a@a.com' } }),
    );
    expect(result?.email).toBe('a@a.com');
  });

  test('create: calls prisma.user.create', async () => {
    const prisma = {
      user: {
        create: jest.fn(async () => ({ id: 'u1' })),
      },
    };

    const service = new UsersService(prisma as any);
    await service.create({
      email: 'a@a.com',
      password: 'hashed',
      name: 'A',
      role: Role.USER,
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
