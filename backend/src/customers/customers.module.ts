import { Module } from '@nestjs/common';
import { CustomerCertificationsController } from './customer-certifications.controller.js';
import { CustomerCertificationsService } from './customer-certifications.service.js';
import { CustomerDocumentsController } from './customer-documents.controller.js';
import { CustomerDocumentsService } from './customer-documents.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  controllers: [CustomersController, CustomerCertificationsController, CustomerDocumentsController],
  providers: [CustomersService, CustomerCertificationsService, CustomerDocumentsService],
})
export class CustomersModule {}
