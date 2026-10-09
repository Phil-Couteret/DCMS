import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsOptional,
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

export class AddOnPricesDto {
  @Price() nightDive: number; // per diver
  @Price() personalInstructor: number; // per booking
}

export class InsurancePricesDto {
  @Price() day: number;
  @Price() week: number;
  @Price() month: number;
  @Price() year: number;
}

export class DivePackDto {
  @IsInt()
  @Min(2)
  @Max(100)
  diveCount: number;

  @Price() price: number; // per diver, for all the dives
}

// The whole price list: a save replaces it. Add-on prices and dive packs may
// be left out, which keeps them as they are.
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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddOnPricesDto)
  addOns?: AddOnPricesDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InsurancePricesDto)
  insurance?: InsurancePricesDto;

  // An empty list removes every pack.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DivePackDto)
  divePacks?: DivePackDto[];
}
