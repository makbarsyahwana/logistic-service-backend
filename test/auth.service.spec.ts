import 'reflect-metadata';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  test,
} from 'bun:test';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

const bcryptMock = {
  hash: jest.fn(async () => 'hashed-password'),
  compare: jest.fn(async () => true),
};

mock.module('bcrypt', () => bcryptMock);

let AuthServiceClass: any;

beforeAll(async () => {
  const imported = await import('../src/auth/auth.service');
  AuthServiceClass = imported.AuthService;
});

describe('AuthService', () => {
  beforeEach(() => {
    bcryptMock.hash.mockClear();
    bcryptMock.compare.mockClear();
  });

  test('register: throws if email already exists', async () => {
    const usersService = {
      findByEmail: jest.fn(async () => ({ id: 'u1' })),
      create: jest.fn(),
    };

    const jwtService = { sign: jest.fn(() => 'token') };
    const service = new AuthServiceClass(usersService as any, jwtService as any);

    await expect(
      service.register({ email: 'a@a.com', password: 'pass123', name: 'A' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  test('register: creates user and returns token', async () => {
    const usersService = {
      findByEmail: jest.fn(async () => null),
      create: jest.fn(async () => ({
        id: 'u1',
        email: 'a@a.com',
        name: 'A',
        role: 'USER',
      })),
    };

    const jwtService = { sign: jest.fn(() => 'token') };
    const service = new AuthServiceClass(usersService as any, jwtService as any);

    const result = await service.register({
      email: 'a@a.com',
      password: 'pass123',
      name: 'A',
    });

    expect(bcryptMock.hash).toHaveBeenCalledTimes(1);
    expect(usersService.create).toHaveBeenCalledTimes(1);
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('token');
    expect(result.user.email).toBe('a@a.com');
  });

  test('login: throws if user not found', async () => {
    const usersService = {
      findByEmail: jest.fn(async () => null),
    };
    const jwtService = { sign: jest.fn(() => 'token') };
    const service = new AuthServiceClass(usersService as any, jwtService as any);

    await expect(
      service.login({ email: 'a@a.com', password: 'pass123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('login: throws if password invalid', async () => {
    bcryptMock.compare.mockResolvedValueOnce(false);

    const usersService = {
      findByEmail: jest.fn(async () => ({
        id: 'u1',
        email: 'a@a.com',
        name: 'A',
        role: 'USER',
        password: 'hashed',
      })),
    };
    const jwtService = { sign: jest.fn(() => 'token') };
    const service = new AuthServiceClass(usersService as any, jwtService as any);

    await expect(
      service.login({ email: 'a@a.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('login: returns token if valid', async () => {
    const usersService = {
      findByEmail: jest.fn(async () => ({
        id: 'u1',
        email: 'a@a.com',
        name: 'A',
        role: 'USER',
        password: 'hashed',
      })),
    };
    const jwtService = { sign: jest.fn(() => 'token') };
    const service = new AuthServiceClass(usersService as any, jwtService as any);

    const result = await service.login({ email: 'a@a.com', password: 'pass' });

    expect(bcryptMock.compare).toHaveBeenCalledTimes(1);
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('token');
  });
});
