import { Prisma } from '@prisma/client';

const containsInsensitive = (value: string) =>
  ({
    contains: value,
    mode: 'insensitive',
  }) as const;

const buildCreatedAtRange = (dateFrom?: Date, dateTo?: Date) => {
  if (!dateFrom && !dateTo) return undefined;

  const range: Prisma.DateTimeFilter = {};
  if (dateFrom) range.gte = dateFrom;
  if (dateTo) range.lte = dateTo;
  return range;
};

const USER_SELECT_MINIMAL = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
});

const USER_SELECT_AUTH = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  role: true,
});

const USER_SELECT_STANDARD = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
});

const USER_SELECT_FULL = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
});

export const USER_SELECT = {
  minimal: USER_SELECT_MINIMAL,
  auth: USER_SELECT_AUTH,
  standard: USER_SELECT_STANDARD,
  full: USER_SELECT_FULL,
} as const;

const ORDER_SELECT_MINIMAL = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  trackingNumber: true,
  status: true,
  createdAt: true,
});

const ORDER_SELECT_STANDARD = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  trackingNumber: true,
  senderName: true,
  recipientName: true,
  origin: true,
  destination: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

const ORDER_SELECT_WITH_USER = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  trackingNumber: true,
  senderName: true,
  recipientName: true,
  origin: true,
  destination: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: USER_SELECT_MINIMAL,
  },
});

export const ORDER_SELECT = {
  minimal: ORDER_SELECT_MINIMAL,
  standard: ORDER_SELECT_STANDARD,
  withUser: ORDER_SELECT_WITH_USER,
} as const;

export interface OrderWhereParams {
  userId?: string;
  isAdmin?: boolean;
  status?: Prisma.OrderWhereInput['status'];
  senderName?: string;
  recipientName?: string;
  trackingNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function buildOrderWhereClause(
  params: OrderWhereParams,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (!params.isAdmin && params.userId) {
    where.userId = params.userId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.senderName) {
    where.senderName = containsInsensitive(params.senderName);
  }

  if (params.recipientName) {
    where.recipientName = containsInsensitive(params.recipientName);
  }

  if (params.trackingNumber) {
    where.trackingNumber = containsInsensitive(params.trackingNumber);
  }

  const createdAt = buildCreatedAtRange(params.dateFrom, params.dateTo);
  if (createdAt) {
    where.createdAt = createdAt;
  }

  return where;
}

export interface UserWhereParams {
  email?: string;
  name?: string;
  role?: Prisma.UserWhereInput['role'];
}

export function buildUserWhereClause(
  params: UserWhereParams,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (params.email) {
    where.email = containsInsensitive(params.email);
  }

  if (params.name) {
    where.name = containsInsensitive(params.name);
  }

  if (params.role) {
    where.role = params.role;
  }

  return where;
}
