import { PartialType } from '@nestjs/mapped-types';
import { CreateDiveSiteDto } from './create-dive-site.dto.js';

export class UpdateDiveSiteDto extends PartialType(CreateDiveSiteDto) {}
