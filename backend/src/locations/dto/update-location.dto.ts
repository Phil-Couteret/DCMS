import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

// See create-location.dto.ts - locations.type is a free VARCHAR(50), not a
// fixed DB enum, to support user-defined location types.
export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  type?: string;

  @IsOptional()
  @IsObject()
  address?: any;

  @IsOptional()
  @IsObject()
  contactInfo?: any;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
