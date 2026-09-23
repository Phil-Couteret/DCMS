import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceDto } from './create-invoice.dto.js';

// Only accepted while the invoice is DRAFT. Sending items replaces them all.
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}
