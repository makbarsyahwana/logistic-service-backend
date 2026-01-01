import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys';
import {
  ORDER_SELECT,
  buildOrderWhereClause,
} from '../prisma/prisma-query.helper';
import { OrderStatus, Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrdersDto } from './dto/filter-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private generateTrackingNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK-${timestamp}-${random}`;
  }

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const trackingNumber = this.generateTrackingNumber();

    return this.prisma.order.create({
      data: {
        trackingNumber,
        senderName: createOrderDto.senderName,
        recipientName: createOrderDto.recipientName,
        origin: createOrderDto.origin,
        destination: createOrderDto.destination,
        status: OrderStatus.PENDING,
        userId,
      },
      select: ORDER_SELECT.standard,
    });
  }

  async findAll(filterDto: FilterOrdersDto, userId: string, userRole: Role) {
    const { status, senderName, recipientName, page = 1, limit = 10 } = filterDto;

    const where = buildOrderWhereClause({
      userId,
      isAdmin: userRole === Role.ADMIN,
      status,
      senderName,
      recipientName,
    });

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_SELECT.withUser,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: ORDER_SELECT.withUser,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Non-admin users can only see their own orders
    if (userRole !== Role.ADMIN && order.user.id !== userId) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async track(trackingNumber: string) {
    const cacheKey = CACHE_KEYS.ORDER_BY_TRACKING(trackingNumber);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const order = await this.prisma.order.findUnique({
          where: { trackingNumber },
          select: ORDER_SELECT.standard,
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        return order;
      },
      CACHE_TTL.MEDIUM,
    );
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: Role,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Non-admin users can only update their own orders
    if (userRole !== Role.ADMIN && order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    // Cannot update canceled orders
    if (order.status === OrderStatus.CANCELED) {
      throw new BadRequestException('Cannot update canceled orders');
    }

    // Cannot update delivered orders
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot update delivered orders');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: updateStatusDto.status },
      select: ORDER_SELECT.standard,
    });

    // Invalidate cache
    await this.redis.del(CACHE_KEYS.ORDER_BY_TRACKING(updated.trackingNumber));

    return updated;
  }

  async cancel(id: string, userId: string, userRole: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Non-admin users can only cancel their own orders
    if (userRole !== Role.ADMIN && order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    // Can only cancel pending orders
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only pending orders can be canceled',
      );
    }

    const canceled = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELED },
      select: ORDER_SELECT.standard,
    });

    // Invalidate cache
    await this.redis.del(CACHE_KEYS.ORDER_BY_TRACKING(canceled.trackingNumber));

    return canceled;
  }
}
