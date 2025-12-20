import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { ConsentType, ConsentMethod } from '@prisma/client';

class CreateConsentDto {
  consentType: ConsentType;
  consentGiven: boolean;
  consentMethod?: ConsentMethod;
  ipAddress?: string;
  userAgent?: string;
}

@ApiTags('consents')
@Controller('customers/:customerId/consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all consents for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'List of consents' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerConsents(@Param('customerId') customerId: string) {
    return this.consentsService.getCustomerConsents(customerId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active consents for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getActiveConsents(@Param('customerId') customerId: string) {
    return this.consentsService.getActiveConsents(customerId);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if customer has consent for a specific type' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiQuery({ name: 'type', enum: ConsentType, description: 'Consent type' })
  async hasConsent(
    @Param('customerId') customerId: string,
    @Query('type') type: ConsentType,
  ) {
    const hasConsent = await this.consentsService.hasConsent(customerId, type);
    return { hasConsent, customerId, consentType: type };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record consent for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async recordConsent(
    @Param('customerId') customerId: string,
    @Body() createConsentDto: CreateConsentDto,
  ) {
    return this.consentsService.recordConsent({
      customerId,
      consentType: createConsentDto.consentType,
      consentGiven: createConsentDto.consentGiven,
      consentMethod: (createConsentDto.consentMethod as any) || 'online',
      ipAddress: createConsentDto.ipAddress,
      userAgent: createConsentDto.userAgent,
    });
  }

  @Delete(':type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw consent for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiParam({ name: 'type', enum: ConsentType, description: 'Consent type to withdraw' })
  @ApiResponse({ status: 200, description: 'Consent withdrawn' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw data_processing consent' })
  async withdrawConsent(
    @Param('customerId') customerId: string,
    @Param('type') type: ConsentType,
  ) {
    return this.consentsService.withdrawConsent(customerId, type);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all consents for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async deleteCustomerConsents(@Param('customerId') customerId: string) {
    return this.consentsService.deleteCustomerConsents(customerId);
  }
}

