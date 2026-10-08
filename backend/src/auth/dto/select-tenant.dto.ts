import { IsString, IsUUID, ValidateIf } from 'class-validator';

// tenantId null: a superadmin's platform console, with no tenant.
export class SelectTenantDto {
  @IsString()
  selectionToken: string;

  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  tenantId: string | null;
}

export class SwitchTenantDto {
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  tenantId: string | null;
}
