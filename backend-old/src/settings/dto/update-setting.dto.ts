import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  key?: string;

  // Genuinely free-form JSON value - intentionally left without a type validator.
  value?: any;

  @IsOptional()
  @IsString()
  description?: string;
}
