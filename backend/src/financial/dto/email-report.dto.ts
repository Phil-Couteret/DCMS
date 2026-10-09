import { IsIn, IsString, MaxLength } from 'class-validator';

// A closed day's report, as the backoffice rendered it (an HTML document),
// sent by email to an address on record: the center's, or the signed-in
// user's own. Never one the caller types.
export class EmailReportDto {
  @IsIn(['center', 'me'])
  to: 'center' | 'me';

  @IsString()
  @MaxLength(900_000)
  html: string;
}
