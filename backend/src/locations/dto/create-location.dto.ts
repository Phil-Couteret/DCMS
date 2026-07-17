import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

// locations.type is VARCHAR(50), not a fixed DB enum - the app supports
// user-defined location types configured in Settings > Location Types
// (see frontend/src/utils/locationTypes.js), so this stays a free string
// rather than @IsEnum against a closed list.
export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsObject()
  address: any;

  @IsOptional()
  @IsObject()
  contactInfo?: any;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
