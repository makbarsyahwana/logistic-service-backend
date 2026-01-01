import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrdersDto } from './dto/filter-orders.dto';

interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all orders with filters' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELED'] })
  @ApiQuery({ name: 'senderName', required: false })
  @ApiQuery({ name: 'recipientName', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query() filterDto: FilterOrdersDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.ordersService.findAll(filterDto, user.id, user.role);
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track order by tracking number (Public)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  track(@Param('trackingNumber') trackingNumber: string) {
    return this.ordersService.track(trackingNumber);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, user.id, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel order (only if status is Pending)' })
  @ApiResponse({ status: 200, description: 'Order canceled' })
  @ApiResponse({ status: 400, description: 'Order cannot be canceled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancel(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.ordersService.cancel(id, user.id, user.role);
  }
}
