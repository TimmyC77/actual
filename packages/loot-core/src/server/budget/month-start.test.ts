import * as db from '#server/db';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';

import { applyBudgetMonthStartDay, createAllBudgets } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

const ACCOUNT_ID = 'acct-1';

async function setupCategory() {
  await db.insertAccount({ id: ACCOUNT_ID, name: 'Joint' });
  await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
  await db.insertCategoryGroup({ id: 'income', name: 'income', is_income: 1 });
  return db.insertCategory({ name: 'Food', cat_group: 'group1' });
}

async function insertSpend(categoryId: string, date: string, amount: number) {
  await db.insertTransaction({
    date,
    amount,
    account: ACCOUNT_ID,
    category: categoryId,
  });
}

async function setStartDayPrefs(enabled: boolean, day: string) {
  db.runQuery(
    'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?), (?, ?)',
    [
      'flags.customBudgetMonthStart',
      String(enabled),
      'budgetMonthStartDay',
      day,
    ],
  );
}

function spent(month: string, categoryId: string) {
  return sheet.getCellValue(
    monthUtils.sheetForMonth(month),
    `sum-amount-${categoryId}`,
  );
}

describe('Custom budget month start day', () => {
  it('assigns spending to budget months starting on the 27th', async () => {
    await sheet.loadSpreadsheet(db);
    const catId = await setupCategory();
    await setStartDayPrefs(true, '27');
    sheet.get().meta().budgetMonthStartDay = 27;

    // Inserted before the budget is built (seeded path)
    await insertSpend(catId, '2016-11-26', -1000);
    await insertSpend(catId, '2016-11-27', -2000);
    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    // Inserted afterwards (incremental path, including a year boundary)
    await insertSpend(catId, '2016-12-31', -4000);
    await insertSpend(catId, '2017-01-02', -8000);
    await sheet.waitOnSpreadsheet();

    expect(spent('2016-11', catId)).toBe(-1000);
    expect(spent('2016-12', catId)).toBe(-2000);
    expect(spent('2017-01', catId)).toBe(-12000);
  });

  it('rebuilds the budget when the start day changes', async () => {
    await sheet.loadSpreadsheet(db);
    const catId = await setupCategory();
    await insertSpend(catId, '2016-11-28', -2000);
    await createAllBudgets();
    await sheet.waitOnSpreadsheet();

    expect(spent('2016-11', catId)).toBe(-2000);
    expect(spent('2016-12', catId)).toBe(0);

    await setStartDayPrefs(true, '27');
    await applyBudgetMonthStartDay();
    await sheet.waitOnSpreadsheet();

    expect(spent('2016-11', catId)).toBe(0);
    expect(spent('2016-12', catId)).toBe(-2000);

    // Turning the experimental flag off goes back to calendar months
    await setStartDayPrefs(false, '27');
    await applyBudgetMonthStartDay();
    await sheet.waitOnSpreadsheet();

    expect(spent('2016-11', catId)).toBe(-2000);
    expect(spent('2016-12', catId)).toBe(0);
  });
});
