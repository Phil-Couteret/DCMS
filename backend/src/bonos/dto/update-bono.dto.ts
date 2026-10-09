import { PartialType } from '@nestjs/mapped-types';
import { CreateBonoDto } from './create-bono.dto.js';

export class UpdateBonoDto extends PartialType(CreateBonoDto) {}
