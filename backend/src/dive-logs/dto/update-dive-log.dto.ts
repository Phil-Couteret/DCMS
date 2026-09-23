import { PartialType } from '@nestjs/mapped-types';
import { CreateDiveLogDto } from './create-dive-log.dto.js';

// logNumber is assigned on create and is not editable.
export class UpdateDiveLogDto extends PartialType(CreateDiveLogDto) {}
