import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { SpreadsheetProvider, useSpreadsheet } from '#hooks/useSpreadsheet';

import { createSpendingSpreadsheet } from './spending-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

afterEach(async () => {
  await clearServer();
});

it('excludes income from the tracking spending budget query', async () => {
  let budgetQueryCalled = false;

  initServer({
    'make-filters-from-conditions': async () => ({ filters: [] }),
    'get-categories': async () => ({
      list: [
        {
          id: 'cat-food',
          name: 'Food',
          group: 'group-expenses',
          is_income: false,
        },
        {
          id: 'cat-income',
          name: 'Salary',
          group: 'group-income',
          is_income: true,
        },
      ],
      grouped: [
        { id: 'group-expenses', name: 'Expenses' },
        { id: 'group-income', name: 'Income' },
      ],
    }),
    query: async query => {
      if (query.table !== 'reflect_budgets') {
        return { data: [], dependencies: [] };
      }

      budgetQueryCalled = true;

      expect(query.filterExpressions).toContainEqual({
        $and: [
          { month: { $eq: 202609 } },
          { category: { $oneof: ['cat-food'] } },
        ],
      });

      return {
        data: [{ category: 'cat-food', amount: 10000 }],
        dependencies: [],
      };
    },
  });

  const { result } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });

  let finalBudget: number | undefined;

  await createSpendingSpreadsheet({
    budgetType: 'tracking',
    compare: '2026-09',
    compareTo: '2026-08',
    conditions: [],
  })(result.current, data => {
    finalBudget = data.intervalData.at(-1)?.budget;
  });

  expect(budgetQueryCalled).toBe(true);
  expect(finalBudget).toBe(-10000);
});

it('folds transactions into budget months that start on the 27th', async () => {
  const transactionFilters: unknown[] = [];

  initServer({
    'make-filters-from-conditions': async () => ({ filters: [] }),
    'get-categories': async () => ({
      list: [
        {
          id: 'cat-food',
          name: 'Food',
          group: 'group-expenses',
          is_income: false,
        },
      ],
      grouped: [{ id: 'group-expenses', name: 'Expenses' }],
    }),
    query: async query => {
      if (query.table !== 'transactions') {
        return { data: [], dependencies: [] };
      }
      transactionFilters.push(...query.filterExpressions);
      const isDebts = query.filterExpressions.some(
        (f: { amount?: { $lt?: number } }) => f.amount?.$lt === 0,
      );
      if (!isDebts) {
        return { data: [], dependencies: [] };
      }
      const row = (date: string, amount: number) => ({
        date,
        amount,
        category: 'cat-food',
        categoryIncome: false,
        accountOffBudget: false,
      });
      return {
        data: [
          // October budget month runs 27 Sep - 26 Oct
          row('2026-09-27', -1000),
          row('2026-10-26', -2000),
          // September budget month runs 27 Aug - 26 Sep
          row('2026-08-27', -500),
        ],
        dependencies: [],
      };
    },
  });

  const { result } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });

  let intervalData;
  await createSpendingSpreadsheet({
    compare: '2026-10',
    compareTo: '2026-09',
    conditions: [],
    budgetMonthStartDay: 27,
  })(result.current, data => {
    intervalData = data.intervalData;
  });

  // The compare-to query covers September's budget month exactly
  expect(transactionFilters).toContainEqual({
    $and: [
      { date: { $transform: '$day', $gte: '2026-08-27' } },
      { date: { $transform: '$day', $lte: '2026-09-26' } },
    ],
  });
  // Day 1 of October's budget month is 27 Sep
  expect(intervalData[0].months['2026-10'].daily).toBe(-1000);
  // 26 Oct is day 30, which folds into day 28 like month ends do
  expect(intervalData[27].months['2026-10'].daily).toBe(-2000);
  expect(intervalData[0].months['2026-09'].daily).toBe(-500);
});
