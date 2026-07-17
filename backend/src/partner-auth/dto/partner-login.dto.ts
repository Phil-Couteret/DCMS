import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class PartnerLoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsString()
  @MinLength(1)
  apiSecret: string;
}
