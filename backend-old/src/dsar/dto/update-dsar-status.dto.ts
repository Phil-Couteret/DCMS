import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDsarStatusDto {
  @IsString()
  @MinLength(1)
  status: string;

  @IsOptional()
  @IsObject()
  responseData?: any;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
