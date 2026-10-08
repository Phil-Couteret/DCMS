import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerDto } from './create-partner.dto.js';

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}
