import { IsArray, IsDateString, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBoatPrepDto {
  @IsUUID()
  locationId: string;

  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  session: string;

  @IsOptional()
  @IsUUID()
  boatId?: string | null;

  @IsArray()
  @IsUUID(undefined, { each: true })
  diverIds: string[];

  @IsOptional()
  @IsUUID()
  diveSiteId?: string | null;

  @IsOptional()
  @IsUUID()
  actualDiveSiteId?: string | null;

  @IsOptional()
  @IsObject()
  diveSiteStatus?: any;

  @IsOptional()
  @IsObject()
  postDiveReport?: any;

  @IsOptional()
  @IsObject()
  staff?: any;
}
