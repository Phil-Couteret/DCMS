import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { UploadedFileData } from '../common/csv.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireTenantId } from '../tenant/tenant-context.js';
import {
  deleteDocumentFile,
  displayName,
  documentKind,
  documentPath,
  MAX_DOCUMENT_BYTES,
  saveDocument,
} from './document-storage.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

const LIST_SELECT = {
  id: true,
  customerId: true,
  type: true,
  filename: true,
  mimeType: true,
  size: true,
  uploadedAt: true,
  uploadedBy: true,
} as const;

@Injectable()
export class CustomerDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    await this.customer(customerId);
    return this.prisma.customerDocument.findMany({
      where: { customerId },
      select: LIST_SELECT,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(customerId: string, dto: UploadDocumentDto, file: UploadedFileData | undefined, uploadedBy: string) {
    if (!file || file.size === 0) throw new BadRequestException('Attach the document (field "file")');
    if (file.size > MAX_DOCUMENT_BYTES) throw new PayloadTooLargeException('Documents can be at most 10 MB');
    const kind = documentKind(file.buffer);
    if (!kind) throw new BadRequestException('Documents must be PDF files or photos (JPEG, PNG or WebP)');
    await this.customer(customerId);

    const id = randomUUID();
    const storagePath = `${requireTenantId()}/${customerId}/${id}${kind.ext}`;
    await saveDocument(storagePath, file.buffer);
    try {
      return await this.prisma.customerDocument.create({
        data: {
          id,
          customerId,
          type: dto.type,
          filename: displayName(file.originalname, kind.ext),
          mimeType: kind.mimeType,
          size: file.size,
          storagePath,
          uploadedBy,
        },
        select: LIST_SELECT,
      });
    } catch (e) {
      await deleteDocumentFile(storagePath);
      throw e;
    }
  }

  // The document and a stream of its file.
  async open(customerId: string, documentId: string) {
    const doc = await this.find(customerId, documentId);
    const path = documentPath(doc.storagePath);
    const stream = createReadStream(path);
    // A missing file is a 404, not a crash mid-response.
    await new Promise<void>((ok, fail) => {
      stream.once('open', () => ok());
      stream.once('error', () => fail(new NotFoundException('The file of this document is missing')));
    });
    return { doc, stream };
  }

  async remove(customerId: string, documentId: string) {
    const doc = await this.find(customerId, documentId);
    await this.prisma.customerDocument.delete({ where: { id: doc.id } });
    await deleteDocumentFile(doc.storagePath);
    return { id: doc.id };
  }

  private async find(customerId: string, documentId: string) {
    const doc = await this.prisma.customerDocument.findFirst({ where: { id: documentId, customerId } });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    return doc;
  }

  private async customer(id: string) {
    const found = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`Customer ${id} not found`);
  }
}
