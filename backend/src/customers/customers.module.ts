import { Module } from '@nestjs/common';
import { CustomerCertificationsController } from './customer-certifications.controller.js';
import { CustomerCertificationsService } from './customer-certifications.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  controllers: [CustomersController, CustomerCertificationsController],
  providers: [CustomersService, CustomerCertificationsService],
})
export class CustomersModule {}
