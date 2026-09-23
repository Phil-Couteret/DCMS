import { PartialType } from '@nestjs/mapped-types';
import { CreateBoatDto } from './create-boat.dto.js';

export class UpdateBoatDto extends PartialType(CreateBoatDto) {}
