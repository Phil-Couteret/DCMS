import { PartialType } from '@nestjs/mapped-types';
import { CreateTankDto } from './create-tank.dto.js';

export class UpdateTankDto extends PartialType(CreateTankDto) {}
