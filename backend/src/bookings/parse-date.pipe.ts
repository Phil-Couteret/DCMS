import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Optional query date: passes undefined through, rejects anything unparseable.
@Injectable()
export class ParseDatePipe implements PipeTransform<string | undefined> {
  transform(value: string | undefined) {
    if (value === undefined || value === '') return undefined;
    if (Number.isNaN(Date.parse(value))) {
      throw new BadRequestException('date must be a valid ISO 8601 date');
    }
    return value;
  }
}
