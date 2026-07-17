import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @MinLength(1)
  key: string;

  // Genuinely free-form JSON value (string/number/object/array/boolean) -
  // intentionally left without a type validator.
  value: any;

  @IsOptional()
  @IsString()
  description?: string;
}
