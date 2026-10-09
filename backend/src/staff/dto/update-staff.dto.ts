import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto.js';

// The account a profile belongs to cannot change.
export class UpdateStaffDto extends PartialType(OmitType(CreateStaffDto, ['userId'] as const)) {}
