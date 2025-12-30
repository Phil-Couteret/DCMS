import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CustomerBillsService, CreateCustomerBillDto, UpdateCustomerBillDto } from './customer-bills.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('customer-bills')
@Controller('customer-bills')
export class CustomerBillsController {
  constructor(private readonly customerBillsService: CustomerBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer bill' })
  create(@Body() createCustomerBillDto: CreateCustomerBillDto) {
    return this.customerBillsService.create(createCustomerBillDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customer bills with optional filters' })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customerBillsService.findAll(customerId, startDate, endDate);
  }

  @Get('by-customer/:customerId')
  @ApiOperation({ summary: 'Get all bills for a specific customer' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.customerBillsService.findByCustomer(customerId);
  }

  @Get('by-number/:billNumber')
  @ApiOperation({ summary: 'Get a bill by bill number' })
  findByBillNumber(@Param('billNumber') billNumber: string) {
    return this.customerBillsService.findByBillNumber(billNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer bill by ID' })
  findOne(@Param('id') id: string) {
    return this.customerBillsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer bill' })
  update(@Param('id') id: string, @Body() updateCustomerBillDto: UpdateCustomerBillDto) {
    return this.customerBillsService.update(id, updateCustomerBillDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer bill' })
  remove(@Param('id') id: string) {
    return this.customerBillsService.remove(id);
  }
}

