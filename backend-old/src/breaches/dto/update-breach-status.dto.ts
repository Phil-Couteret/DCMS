import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateBreachStatusDto {
  // Not a Prisma enum - data_breaches.status is a plain varchar with an
  // informal set of values ('detected', 'assessed', 'resolved', ...).
  @IsString()
  @MinLength(1)
  status: string;

  @IsOptional()
  @IsDateString()
  authorityNotificationDate?: string;

  @IsOptional()
  @IsString()
  authorityName?: string;

  @IsOptional()
  @IsDateString()
  customerNotificationDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  customersNotifiedCount?: number;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}
