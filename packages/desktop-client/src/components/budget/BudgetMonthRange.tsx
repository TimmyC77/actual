import React from 'react';
import type { CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { useBudgetMonthStartDay } from '#hooks/useBudgetMonthStartDay';
import { useLocale } from '#hooks/useLocale';

type BudgetMonthRangeProps = {
  month: string;
  style?: CSSProperties;
};

// Shows the dates a budget month covers when it doesn't start on the 1st.
export function BudgetMonthRange({ month, style }: BudgetMonthRangeProps) {
  const startDay = useBudgetMonthStartDay();
  const locale = useLocale();
  if (startDay <= 1) {
    return null;
  }
  const { start, end } = monthUtils.budgetMonthDateRange(month, startDay);
  return (
    <View
      data-testid="budget-month-range"
      style={{
        fontSize: 11,
        color: theme.pageTextLight,
        textAlign: 'center',
        ...style,
      }}
    >
      {monthUtils.format(start, 'd MMM', locale)} –{' '}
      {monthUtils.format(end, 'd MMM', locale)}
    </View>
  );
}
