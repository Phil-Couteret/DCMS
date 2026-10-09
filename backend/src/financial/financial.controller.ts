import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards, HttpCode } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { EmailReportDto } from './dto/email-report.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';
import { assertIsoDate, FinancialService } from './financial.service.js';

type User = { email: string };

// Admins only: takings, expenses, closing days and tax returns.
@Controller('financial')
@UseGuards(AdminAuthGuard)
export class FinancialController {
  constructor(private readonly financial: FinancialService) {}

  @Get('daily')
  daily(@Query('date') date?: string) {
    return this.financial.daily(assertIsoDate(date));
  }

  @Get('closed-days')
  closedDays() {
    return this.financial.closedDays();
  }

  @Get('closed-days/:date')
  closedDay(@Param('date') date: string) {
    return this.financial.closedDay(assertIsoDate(date));
  }

  @Post('closed-days/:date')
  closeDay(@Param('date') date: string, @CurrentUser() user: User) {
    return this.financial.closeDay(assertIsoDate(date), user.email);
  }

  @Post('closed-days/:date/email')
  @HttpCode(200)
  emailReport(@Param('date') date: string, @Body() dto: EmailReportDto, @CurrentUser() user: User) {
    return this.financial.emailReport(assertIsoDate(date), dto.to, dto.html, user.email);
  }

  @Post('expenses')
  addExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: User) {
    return this.financial.addExpense(dto, user.email);
  }

  @Delete('expenses/:id')
  removeExpense(@Param('id', ParseUUIDPipe) id: string) {
    return this.financial.removeExpense(id);
  }

  @Post('income')
  addIncome(@Body() dto: CreateIncomeDto, @CurrentUser() user: User) {
    return this.financial.addIncome(dto, user.email);
  }

  @Delete('income/:id')
  removeIncome(@Param('id', ParseUUIDPipe) id: string) {
    return this.financial.removeIncome(id);
  }

  @Get('invoices')
  invoices(@Query('from') from?: string, @Query('to') to?: string) {
    return this.financial.invoices(assertIsoDate(from, 'from'), assertIsoDate(to, 'to'));
  }

  @Get('tax-declaration')
  taxDeclaration(
    @Query('year', new ParseIntPipe()) year: number,
    @Query('quarter', new ParseIntPipe()) quarter: number,
  ) {
    if (year < 2000 || year > 2100) throw new BadRequestException('year must be between 2000 and 2100');
    if (quarter < 1 || quarter > 4) throw new BadRequestException('quarter must be 1 to 4');
    return this.financial.taxDeclaration(year, quarter);
  }
}
