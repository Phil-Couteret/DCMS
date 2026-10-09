import { IsEnum } from 'class-validator';
import { CustomerDocumentType } from '../../generated/prisma/enums.js';

// The form fields sent with the file (multipart/form-data).
export class UploadDocumentDto {
  @IsEnum(CustomerDocumentType)
  type: CustomerDocumentType;
}
