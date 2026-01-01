import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'John Doe', description: 'Sender name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  senderName: string;

  @ApiProperty({ example: 'Jane Smith', description: 'Recipient name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  recipientName: string;

  @ApiProperty({ example: 'Jakarta', description: 'Origin city/address' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  origin: string;

  @ApiProperty({ example: 'Surabaya', description: 'Destination city/address' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  destination: string;
}
