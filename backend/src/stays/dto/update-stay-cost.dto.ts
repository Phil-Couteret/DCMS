import { PartialType } from '@nestjs/mapped-types';
import { CreateStayCostDto } from './create-stay-cost.dto.js';

export class UpdateStayCostDto extends PartialType(CreateStayCostDto) {}
