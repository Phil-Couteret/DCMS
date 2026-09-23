import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddParticipantDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string;
}
