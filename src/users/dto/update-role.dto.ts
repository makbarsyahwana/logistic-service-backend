import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.ADMIN, description: 'User role' })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
