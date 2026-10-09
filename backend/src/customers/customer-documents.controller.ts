import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import type { UploadedFileData } from '../common/csv.js';
import { CustomerDocumentsService } from './customer-documents.service.js';
import { MAX_DOCUMENT_BYTES } from './document-storage.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

// Documents kept with a customer's record (medical certificates, insurance,
// certification cards). Staff only.
@Controller('customers/:id/documents')
@UseGuards(StaffAuthGuard)
export class CustomerDocumentsController {
  constructor(private readonly documents: CustomerDocumentsService) {}

  @Get()
  findAll(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.findAll(id);
  }

  // multipart/form-data: "file" (at most 10 MB; over that, 413) and "type".
  // Browsers send the file's name as UTF-8 (multer would read it as Latin-1).
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 5 }, defParamCharset: 'utf8' }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: UploadedFileData | undefined,
    @CurrentUser() user: { sub: string },
  ) {
    return this.documents.upload(id, dto, file, user.sub);
  }

  // The file. Shown in the browser (?download=1: saved), never run: the
  // type is the one detected on upload, with a sandbox policy.
  @Get(':documentId/file')
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { doc, stream } = await this.documents.open(id, documentId);
    const ascii = doc.filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.size),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${rfc5987(doc.filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    });
    return new StreamableFile(stream);
  }

  @Delete(':documentId')
  remove(@Param('id', ParseUUIDPipe) id: string, @Param('documentId', ParseUUIDPipe) documentId: string) {
    return this.documents.remove(id, documentId);
  }
}

function rfc5987(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
