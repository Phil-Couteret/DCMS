import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateScheduleSlotGuideDto {
  @IsUUID()
  locationId: string;

  @IsDateString()
  date: string;

  @IsIn(['mole', 'boat'])
  slotType: string;

  // Opaque identifier the frontend already builds for a slot (e.g.
  // "mole-2026-08-10-09-00" or "boat-<boatId>-2026-08-10-morning") - see
  // docs/roadmap.md Phase 6.17 for why this isn't re-derived from date/boatId
  // on the backend.
  @IsString()
  @MinLength(1)
  slotKey: string;

  @IsOptional()
  @IsUUID()
  boatId?: string | null;

  @IsArray()
  @IsUUID(undefined, { each: true })
  guideIds: string[];
}
