import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

test('getQuarter returns the quarter number for a given month', () => {
  expect(monthUtils.getQuarter('2024-01')).toBe(1);
  expect(monthUtils.getQuarter('2024-03')).toBe(1);
  expect(monthUtils.getQuarter('2024-04')).toBe(2);
  expect(monthUtils.getQuarter('2024-06')).toBe(2);
  expect(monthUtils.getQuarter('2024-07')).toBe(3);
  expect(monthUtils.getQuarter('2024-09')).toBe(3);
  expect(monthUtils.getQuarter('2024-10')).toBe(4);
  expect(monthUtils.getQuarter('2024-12')).toBe(4);
});

test('getQuarterStart and getQuarterEnd return the bounding months of the quarter', () => {
  expect(monthUtils.getQuarterStart('2024-02')).toBe('2024-01');
  expect(monthUtils.getQuarterEnd('2024-02')).toBe('2024-03');
  expect(monthUtils.getQuarterStart('2024-11')).toBe('2024-10');
  expect(monthUtils.getQuarterEnd('2024-11')).toBe('2024-12');
});

test('prevQuarter subtracts three months, landing in the previous quarter', () => {
  expect(monthUtils.prevQuarter('2024-02')).toBe('2023-11');
  expect(monthUtils.prevQuarter('2024-01')).toBe('2023-10');
  expect(monthUtils.prevQuarter('2024-04')).toBe('2024-01');
});

test('isValidYearMonthDay validates the day against the month and year', () => {
  expect(monthUtils.isValidYearMonthDay('2024-02-29')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2023-02-29')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-04-31')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-12-31')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2024-00-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-13-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02-00')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02')).toBe(false);
});

describe('budget month start day', () => {
  test('calendar months when the start day is 1', () => {
    expect(monthUtils.budgetMonthBounds('2026-11', 1)).toEqual(
      monthUtils.bounds('2026-11'),
    );
    expect(monthUtils.budgetMonthFromDate('2026-10-31', 1)).toBe('2026-10');
  });

  test('budget month bounds start in the previous month', () => {
    expect(monthUtils.budgetMonthBounds('2026-11', 27)).toEqual({
      start: 20261027,
      end: 20261126,
    });
    expect(monthUtils.budgetMonthDateRange('2027-01', 27)).toEqual({
      start: '2026-12-27',
      end: '2027-01-26',
    });
    expect(monthUtils.budgetMonthDateRange('2027-03', 28)).toEqual({
      start: '2027-02-28',
      end: '2027-03-27',
    });
  });

  test('dates map to the budget month they fall in', () => {
    expect(monthUtils.budgetMonthFromDate('2026-10-26', 27)).toBe('2026-10');
    expect(monthUtils.budgetMonthFromDate('2026-10-27', 27)).toBe('2026-11');
    expect(monthUtils.budgetMonthFromDate('2026-12-31', 27)).toBe('2027-01');
  });

  test('normalizes stored start days', () => {
    expect(monthUtils.normalizeBudgetMonthStartDay('27')).toBe(27);
    expect(monthUtils.normalizeBudgetMonthStartDay(undefined)).toBe(1);
    expect(monthUtils.normalizeBudgetMonthStartDay('31')).toBe(1);
    expect(monthUtils.normalizeBudgetMonthStartDay('abc')).toBe(1);
  });
});
