import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCertificationDto } from './create-certification.dto.js';

export class UpdateCertificationDto extends PartialType(CreateCertificationDto) {
  // true records the signed-in staff member and the time; false clears it.
  // Left out, a change to the card's details clears it.
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
