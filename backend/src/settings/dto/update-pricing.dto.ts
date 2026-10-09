import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
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
  // Left out, the transfer price stays as it is.
  @IsOptional() @Price() transfer?: number; // per booking
  @Price() nightDive: number; // per diver
  @Price() personalInstructor: number; // per booking
}

// A period of dive insurance: its name, the days it covers, its price. id:
// an existing period (kept, even when renamed); left out for a new one.
export class InsurancePeriodDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @IsInt()
  @Min(1)
  @Max(3660)
  days: number;

  @Price() price: number;
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

  // The whole list; an empty one removes every period.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InsurancePeriodDto)
  insurance?: InsurancePeriodDto[];

  // An empty list removes every pack.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DivePackDto)
  divePacks?: DivePackDto[];
}
