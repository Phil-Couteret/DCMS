import { IsObject, IsOptional, IsString } from 'class-validator';

// customerId comes from the :customerId route param, not the body - see
// DsarController.createDsar, which merges it in before calling the service.
export class CreateDsarDto {
  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;

  @IsOptional()
  @IsObject()
  requestDetails?: any;

  @IsOptional()
  @IsString()
  responseFormat?: string;

  @IsOptional()
  @IsString()
  responseDeliveryMethod?: string;
}
