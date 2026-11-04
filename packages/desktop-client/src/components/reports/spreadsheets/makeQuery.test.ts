import { describe, expect, it } from 'vitest';

import { makeQuery } from './makeQuery';

function serialize(groupBy?: string) {
  return makeQuery(
    'assets',
    '2026-01-01',
    '2026-01-31',
    'Daily',
    '$and',
    [],
    groupBy,
  ).serialize();
}

describe('makeQuery', () => {
  it('groups and selects notes for tag reports', () => {
    const query = serialize('Tag');

    expect(query.groupExpressions).toContain('notes');
    expect(query.selectExpressions).toContain('notes');
  });

  it.each(['Category', 'Payee', 'Account', 'Interval', undefined])(
    'does not select notes for %s reports',
    groupBy => {
      const query = serialize(groupBy);

      expect(query.groupExpressions).not.toContain('notes');
      expect(query.selectExpressions).not.toContain('notes');
    },
  );
});

describe('makeQuery with budget months', () => {
  it('filters by the real day range and groups by day', () => {
    const query = makeQuery(
      'assets',
      '2026-10',
      '2026-11',
      'Monthly',
      '$and',
      [],
      undefined,
      27,
    ).serialize();

    expect(query.filterExpressions).toContainEqual({
      $and: [
        { date: { $gte: '2026-09-27' } },
        { date: { $lte: '2026-11-26' } },
      ],
    });
    expect(query.groupExpressions).toContainEqual({ $day: '$date' });
  });

  it('keeps calendar months when the start day is 1', () => {
    const query = makeQuery(
      'assets',
      '2026-10',
      '2026-11',
      'Monthly',
      '$and',
      [],
    ).serialize();

    expect(query.groupExpressions).toContainEqual({ $month: '$date' });
  });
});
