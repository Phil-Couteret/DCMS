import { parsePaginationQuery, MAX_TAKE } from './pagination';

describe('parsePaginationQuery', () => {
  it('returns {} when neither skip nor take is provided (backward-compatible, unbounded default)', () => {
    expect(parsePaginationQuery()).toEqual({});
    expect(parsePaginationQuery(undefined, undefined)).toEqual({});
  });

  it('parses valid skip/take strings to numbers', () => {
    expect(parsePaginationQuery('20', '50')).toEqual({ skip: 20, take: 50 });
  });

  it('parses skip alone, take alone', () => {
    expect(parsePaginationQuery('10')).toEqual({ skip: 10 });
    expect(parsePaginationQuery(undefined, '25')).toEqual({ take: 25 });
  });

  it('caps take at MAX_TAKE even when a larger value is requested', () => {
    expect(parsePaginationQuery(undefined, '999999')).toEqual({ take: MAX_TAKE });
  });

  it('ignores a negative or zero take rather than passing it through to Prisma', () => {
    expect(parsePaginationQuery(undefined, '0')).toEqual({});
    expect(parsePaginationQuery(undefined, '-5')).toEqual({});
  });

  it('ignores a negative skip', () => {
    expect(parsePaginationQuery('-1')).toEqual({});
  });

  it('ignores non-numeric input rather than producing NaN', () => {
    expect(parsePaginationQuery('abc', 'xyz')).toEqual({});
  });

  it('floors fractional values', () => {
    expect(parsePaginationQuery('2.9', '10.1')).toEqual({ skip: 2, take: 10 });
  });
});
