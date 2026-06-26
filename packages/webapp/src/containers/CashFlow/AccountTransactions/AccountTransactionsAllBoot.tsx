// @ts-nocheck
import React from 'react';
import { IntersectionObserver } from '@/components';
import { useAccountTransactionsInfinity } from '@/hooks/query';
import { useFlattenInfinityPages } from '@/hooks/utils';
import { useAccountTransactionsContext } from './AccountTransactionsProvider';

const AccountTransactionsAllBootContext = React.createContext();

interface AccountTransactionsAllPoviderProps {
  children: React.ReactNode;
}

/**
 * Account transctions all provider.
 */
function AccountTransactionsAllProvider({
  children,
}: AccountTransactionsAllPoviderProps) {
  const { accountId } = useAccountTransactionsContext();

  // Fetch cashflow account transactions list
  const {
    data: cashflowTransactionsPages,
    isFetching: isCashFlowTransactionsFetching,
    isLoading: isCashFlowTransactionsLoading,
    isSuccess: isCashflowTransactionsSuccess,
    fetchNextPage: fetchNextTransactionsPage,
    isFetchingNextPage: isCashflowTransactionsFetchingNextPage,
    hasNextPage: hasCashflowTransactionsNextPgae,
    // The hook (and SDK) already add `accountId` to the request. Passing
    // `account_id` here too produced a duplicated `account_id=..&account_id=..`
    // query, which the server parsed as an array and rejected ("must be a
    // number"), so no transactions loaded.
  } = useAccountTransactionsInfinity(accountId, {
    page_size: 50,
  });
  // Memorized the cashflow account transactions.
  const cashflowTransactions = useFlattenInfinityPages(
    isCashflowTransactionsSuccess ? cashflowTransactionsPages : undefined,
    (page) => page.transactions,
  );
  // Handle the observer ineraction.
  const handleObserverInteract = React.useCallback(() => {
    if (!isCashFlowTransactionsFetching && hasCashflowTransactionsNextPgae) {
      fetchNextTransactionsPage();
    }
  }, [
    isCashFlowTransactionsFetching,
    hasCashflowTransactionsNextPgae,
    fetchNextTransactionsPage,
  ]);
  // Provider payload.
  const provider = {
    cashflowTransactions,
    isCashFlowTransactionsFetching,
    isCashFlowTransactionsLoading,
  };

  return (
    <AccountTransactionsAllBootContext.Provider value={provider}>
      {children}
      <IntersectionObserver
        onIntersect={handleObserverInteract}
        enabled={!isCashflowTransactionsFetchingNextPage}
      />
    </AccountTransactionsAllBootContext.Provider>
  );
}

const useAccountTransactionsAllContext = () =>
  React.useContext(AccountTransactionsAllBootContext);

export { AccountTransactionsAllProvider, useAccountTransactionsAllContext };
