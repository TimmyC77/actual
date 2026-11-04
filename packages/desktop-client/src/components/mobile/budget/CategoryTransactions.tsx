import React, { useCallback, useMemo, useState } from 'react';

import { q } from '@actual-app/core/shared/query';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type {
  CategoryEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { TransactionListWithBalances } from '#components/mobile/transactions/TransactionListWithBalances';
import { useBudgetMonthStartDay } from '#hooks/useBudgetMonthStartDay';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategoryPreviewTransactions } from '#hooks/useCategoryPreviewTransactions';
import { useDateFormat } from '#hooks/useDateFormat';
import { useNavigate } from '#hooks/useNavigate';
import { useTransactions } from '#hooks/useTransactions';
import { useTransactionsSearch } from '#hooks/useTransactionsSearch';
import * as bindings from '#spreadsheet/bindings';

type CategoryTransactionsProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryTransactions({
  category,
  month,
}: CategoryTransactionsProps) {
  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <SchedulesProvider query={schedulesQuery}>
      <TransactionListWithPreviews category={category} month={month} />
    </SchedulesProvider>
  );
}

type TransactionListWithPreviewsProps = {
  category: CategoryEntity;
  month: string;
};

function TransactionListWithPreviews({
  category,
  month,
}: TransactionListWithPreviewsProps) {
  const navigate = useNavigate();
  const startDay = useBudgetMonthStartDay();

  const baseTransactionsQuery = useCallback(
    () =>
      q('transactions')
        .options({ splits: 'inline' })
        .filter(getCategoryMonthFilter(category, month, startDay))
        .select('*'),
    [category, month, startDay],
  );

  const [transactionsQuery, setTransactionsQuery] = useState(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isPending: isTransactionsLoading,
    isFetchingNextPage: isLoadingMoreTransactions,
    fetchNextPage: fetchMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      // details of how the native app used to handle preview transactions here can be found at commit 05e58279
      if (!isPreviewId(transaction.id)) {
        void navigate(`/transactions/${transaction.id}`);
      }
    },
    [navigate],
  );

  const balance = bindings.categoryBalance(category.id, month, startDay);
  const balanceCleared = bindings.categoryBalanceCleared(
    category.id,
    month,
    startDay,
  );
  const balanceUncleared = bindings.categoryBalanceUncleared(
    category.id,
    month,
    startDay,
  );

  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    useCategoryPreviewTransactions({
      categoryId: category.id,
      month,
    });

  const transactionsToDisplay = !isSearching
    ? previewTransactions.concat(transactions)
    : transactions;

  return (
    <TransactionListWithBalances
      isLoading={
        isSearching
          ? isTransactionsLoading
          : isTransactionsLoading || isPreviewTransactionsLoading
      }
      transactions={transactionsToDisplay}
      balance={balance}
      balanceCleared={balanceCleared}
      balanceUncleared={balanceUncleared}
      searchPlaceholder={`Search ${category.name}`}
      onSearch={onSearch}
      isLoadingMore={isLoadingMoreTransactions}
      onLoadMore={fetchMoreTransactions}
      onOpenTransaction={onOpenTransaction}
    />
  );
}

function getCategoryMonthFilter(
  category: CategoryEntity,
  month: string,
  startDay: number,
) {
  return {
    category: category.id,
    date: bindings.budgetMonthDateFilter(month, startDay),
  };
}
