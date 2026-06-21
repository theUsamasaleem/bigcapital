// @ts-nocheck
import React from 'react';
import { useParams } from 'react-router-dom';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseFormPageProvider } from './ExpenseFormPageProvider';

/**
 * Expense page form.
 */
export function ExpenseFormPage() {
  const { id } = useParams();
  const expenseId = id ? parseInt(id, 10) : undefined;

  return (
    <ExpenseFormPageProvider expenseId={expenseId}>
      <ExpenseForm />
    </ExpenseFormPageProvider>
  );
}
