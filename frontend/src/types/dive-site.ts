// Mirrors GET /dive-sites. Decimal columns arrive as strings, and the JSON
// columns are free-form, so marineLife and photos are not guaranteed to hold
// only strings.
export interface DiveSite {
  id: string;
  nameEs: string;
  nameEn: string;
  nameDe: string;
  nameFr: string;
  descriptionEs: string;
  descriptionEn: string;
  descriptionDe: string;
  descriptionFr: string;
  depthMin: number;
  depthMax: number;
  requiredCertLevel: number;
  difficultyLevel: number;
  typicalCurrent: string;
  marineLife: unknown;
  travelTimeMinutes: number;
  maxDiversPerTrip: number;
  photos: unknown;
  totalDives: number;
  averageRating: string | null;
}
