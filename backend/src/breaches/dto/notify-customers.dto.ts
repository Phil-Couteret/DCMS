import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { NOTIFY_METHODS } from '../breach-rules.js';

// The people affected have been told of the breach: how, and when (now when
// left out).
export class NotifyCustomersDto {
  @IsIn(NOTIFY_METHODS)
  method: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  notifiedAt?: string;
}
