import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';

import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

const START_DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1));

export function BudgetMonthStartSettings() {
  const { t } = useTranslation();
  const [startDayPref, setStartDayPref] = useSyncedPref('budgetMonthStartDay');
  const startDay = monthUtils.normalizeBudgetMonthStartDay(startDayPref);
  const [isSaving, setIsSaving] = useState(false);

  async function onChange(value: string) {
    setIsSaving(true);
    try {
      setStartDayPref(value);
      // Rebuild the budget so spent totals use the new month ranges
      await send('reset-budget-cache');
    } finally {
      setIsSaving(false);
    }
  }

  const example = monthUtils.budgetMonthDateRange(
    monthUtils.currentBudgetMonth(startDay),
    startDay,
  );

  return (
    <Setting
      primaryAction={
        <Select
          value={String(startDay)}
          onChange={onChange}
          disabledKeys={isSaving ? START_DAYS : []}
          options={START_DAYS.map(day => [
            day,
            day === '1' ? t('1 (calendar months)') : day,
          ])}
        />
      }
    >
      <Text>
        <Trans>
          <strong>Budget month start day</strong> sets the day each budget month
          begins, for example payday. With 27, the November budget covers 27
          October to 26 November.
        </Trans>
      </Text>
      <Text>
        <Trans>
          Current budget month: {{ start: example.start }} to{' '}
          {{ end: example.end }}
        </Trans>
      </Text>
    </Setting>
  );
}
