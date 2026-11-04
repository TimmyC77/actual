import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { ObjectExpression } from '@actual-app/core/shared/query';

import { ReportOptions } from '#components/reports/ReportOptions';

export function makeQuery(
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
  groupBy?: string,
  budgetMonthStartDay = 1,
) {
  // Budget months that don't start on the 1st are grouped by day here and
  // folded into budget months by the caller.
  const useBudgetMonths = interval === 'Monthly' && budgetMonthStartDay > 1;
  const intervalGroup =
    interval === 'Monthly' && !useBudgetMonths
      ? { $month: '$date' }
      : interval === 'Yearly'
        ? { $year: '$date' }
        : { $day: '$date' };
  const intervalFilter =
    interval === 'Weekly'
      ? '$day'
      : '$' + ReportOptions.intervalMap.get(interval)?.toLowerCase() || 'month';

  const query = q('transactions')
    //Apply filters and split by "Group By"
    .filter({
      [conditionsOpKey]: filters,
    })
    //Apply month range filters
    .filter({
      $and: useBudgetMonths
        ? [
            {
              date: {
                $gte: monthUtils.budgetMonthDateRange(
                  startDate,
                  budgetMonthStartDay,
                ).start,
              },
            },
            {
              date: {
                $lte: monthUtils.budgetMonthDateRange(
                  endDate,
                  budgetMonthStartDay,
                ).end,
              },
            },
          ]
        : [
            { date: { $transform: intervalFilter, $gte: startDate } },
            { date: { $transform: intervalFilter, $lte: endDate } },
          ],
    })
    //Show assets or debts
    .filter(
      name === 'assets' ? { amount: { $gt: 0 } } : { amount: { $lt: 0 } },
    );

  const groupByFields: Array<ObjectExpression | string> = [
    intervalGroup,
    { $id: '$account' },
    { $id: '$payee' },
    { $id: '$category' },
    { $id: '$payee.transfer_acct.id' },
  ];
  const selectedFields: Array<ObjectExpression | string> = [
    { date: intervalGroup },
    { category: { $id: '$category.id' } },
    { categoryHidden: { $id: '$category.hidden' } },
    { categoryIncome: { $id: '$category.is_income' } },
    { categoryGroup: { $id: '$category.group.id' } },
    { categoryGroupHidden: { $id: '$category.group.hidden' } },
    { account: { $id: '$account.id' } },
    { accountOffBudget: { $id: '$account.offbudget' } },
    { payee: { $id: '$payee.id' } },
    { transferAccount: { $id: '$payee.transfer_acct.id' } },
    { amount: { $sum: '$amount' } },
  ];

  if (groupBy === 'Tag') {
    groupByFields.push('notes');
    selectedFields.push('notes');
  }

  return query.groupBy(groupByFields).select(selectedFields);
}
