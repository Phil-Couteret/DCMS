import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsNumber,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MAX_PRICE = 99999.99; // DECIMAL(8, 2)

// A required price in EUR, with at most 2 decimals.
function Price() {
  return (target: object, key: string) => {
    IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })(target, key);
    Min(0)(target, key);
    Max(MAX_PRICE)(target, key);
  };
}

// The same, or null for no price: bookings for the activity cannot be invoiced.
function OptionalPrice() {
  return (target: object, key: string) => {
    ValidateIf((_o, v) => v !== null)(target, key);
    Price()(target, key);
  };
}

export class ActivityPricesDto {
  @OptionalPrice() snorkeling: number | null;
  @OptionalPrice() discoverScuba: number | null;
  @OptionalPrice() funDive: number | null;
  @OptionalPrice() owCert: number | null;
  @OptionalPrice() aowCert: number | null;
  @OptionalPrice() rescueCert: number | null;
  @OptionalPrice() dmCert: number | null;
}

export class EquipmentPricesDto {
  @Price() wetsuit: number;
  @Price() bcd: number;
  @Price() regulator: number;
  @Price() maskFins: number;
  @Price() diveComputer: number;
  @Price() fullPackage: number;
}

export class FunDiveTierDto {
  @IsInt()
  @Min(1)
  @Max(999)
  minDives: number;

  @Price() tourist: number;
  @Price() local: number;
  @Price() recurrent: number;
}

// The whole price list: every field is required, so a save replaces it.
export class UpdatePricingDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ActivityPricesDto)
  activities: ActivityPricesDto;

  @IsObject()
  @ValidateNested()
  @Type(() => EquipmentPricesDto)
  equipment: EquipmentPricesDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FunDiveTierDto)
  funDiveTiers: FunDiveTierDto[];
}
