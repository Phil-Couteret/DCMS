import { IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsObject()
  settings?: object;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfLocations?: number;

  @IsOptional()
  @IsString()
  locationType?: string;
}
