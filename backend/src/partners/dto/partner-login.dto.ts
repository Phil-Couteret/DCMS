import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Either the contact email or the API key, with the API secret.
export class PartnerLoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apiKey?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  apiSecret: string;
}
