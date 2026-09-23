import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ActivityType, Language, TimeSlot } from '../../generated/prisma/enums.js';

export class GuestBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  country: string;

  // Accepts the site locale as sent ("es") as well as the enum ("ES").
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(Language)
  language: Language;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  // Must be an existing dive site when given.
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;

  // Stored as the calendar day at 00:00 UTC.
  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(16)
  participantCount: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  certificationLevel?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  selectedEquipment?: string[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice?: number;
}
