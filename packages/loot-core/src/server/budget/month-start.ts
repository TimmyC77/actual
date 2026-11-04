import * as db from '#server/db';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';

// Synced preferences that control the custom budget month start
// (experimental `customBudgetMonthStart` feature).
export const BUDGET_MONTH_START_FLAG_PREF = 'flags.customBudgetMonthStart';
export const BUDGET_MONTH_START_DAY_PREF = 'budgetMonthStartDay';

export function isBudgetMonthStartPref(id: string | undefined): boolean {
  return (
    id === BUDGET_MONTH_START_FLAG_PREF || id === BUDGET_MONTH_START_DAY_PREF
  );
}

// Reads the effective start day (1-28) from the budget's synced preferences.
// Returns 1 (calendar months) unless the experimental flag is on.
export function readBudgetMonthStartDay(): number {
  const rows = db.runQuery<Pick<db.DbPreference, 'id' | 'value'>>(
    'SELECT id, value FROM preferences WHERE id IN (?, ?)',
    [BUDGET_MONTH_START_FLAG_PREF, BUDGET_MONTH_START_DAY_PREF],
    true,
  );
  const prefs = new Map(rows.map(row => [row.id, row.value]));
  if (prefs.get(BUDGET_MONTH_START_FLAG_PREF) !== 'true') {
    return 1;
  }
  return monthUtils.normalizeBudgetMonthStartDay(
    prefs.get(BUDGET_MONTH_START_DAY_PREF),
  );
}

// The start day the loaded spreadsheet was built with.
export function getBudgetMonthStartDay(): number {
  const s = sheet.get();
  return (s && s.meta().budgetMonthStartDay) || 1;
}

// SQL expression mapping an integer `yyyyMMdd` date column to the integer
// `yyyyMM` budget month it belongs to.
export function budgetMonthSql(column: string, startDay: number): string {
  const month = `CAST(${column} / 100 AS INTEGER)`;
  if (startDay <= 1) {
    return month;
  }
  return (
    `(CASE WHEN ${column} % 100 >= ${startDay} ` +
    `THEN (CASE WHEN ${month} % 100 = 12 THEN ${month} + 89 ELSE ${month} + 1 END) ` +
    `ELSE ${month} END)`
  );
}
