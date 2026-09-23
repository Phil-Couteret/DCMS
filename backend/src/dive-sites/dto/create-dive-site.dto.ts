import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDiveSiteDto {
  @IsString() @IsNotEmpty() nameEs: string;
  @IsString() @IsNotEmpty() nameEn: string;
  @IsString() @IsNotEmpty() nameDe: string;
  @IsString() @IsNotEmpty() nameFr: string;

  @IsString() @IsNotEmpty() descriptionEs: string;
  @IsString() @IsNotEmpty() descriptionEn: string;
  @IsString() @IsNotEmpty() descriptionDe: string;
  @IsString() @IsNotEmpty() descriptionFr: string;

  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsInt() @Min(0) depthMin: number;
  @IsInt() @Min(0) depthMax: number;

  @IsInt() @Min(0) requiredCertLevel: number;

  @IsInt() @Min(1) @Max(5) difficultyLevel: number;

  @IsOptional() @IsInt() @Min(0) typicalVisibility?: number;

  @IsOptional() @IsString() @IsNotEmpty() typicalCurrent?: string;

  // Json columns: shape is not constrained yet, only presence.
  @IsDefined() waterTempRange: unknown;
  @IsDefined() marineLife: unknown;
  @IsDefined() pointsOfInterest: unknown;
  @IsDefined() bestSeason: unknown;
  @IsDefined() facilities: unknown;
  @IsOptional() restrictions?: unknown;
  @IsOptional() photos?: unknown;

  @IsInt() @Min(0) travelTimeMinutes: number;
  @IsInt() @Min(1) maxDiversPerTrip: number;

  @IsOptional() @IsString() @IsNotEmpty() accessibility?: string;

  @IsOptional() @IsInt() @Min(0) totalDives?: number;

  // Decimal(3,2): at most 9.99
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9.99)
  averageRating?: number;
}
