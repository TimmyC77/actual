import * as monthUtils from '@actual-app/core/shared/months';

import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';

// The day of the month on which budget months start (1 = calendar months).
// Only takes effect when the `customBudgetMonthStart` experimental feature
// is enabled for this budget.
export function useBudgetMonthStartDay(): number {
  const enabled = useFeatureFlag('customBudgetMonthStart');
  const [startDay] = useSyncedPref('budgetMonthStartDay');
  return enabled ? monthUtils.normalizeBudgetMonthStartDay(startDay) : 1;
}

// The budget month that today falls in.
export function useCurrentBudgetMonth(): string {
  return monthUtils.currentBudgetMonth(useBudgetMonthStartDay());
}
