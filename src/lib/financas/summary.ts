import type { Currency, FinancialAccount, Transaction } from "@/lib/local-data";

export function calculateAccumulatedTotal(
  accounts: FinancialAccount[],
  transactions: Transaction[],
  currency: Currency,
) {
  const currencyAccounts = accounts.filter((account) => account.active && account.currency === currency);
  const accountIds = new Set(currencyAccounts.map((account) => account.id));
  const initialBalance = currencyAccounts.reduce((total, account) => total + account.initialBalanceCents, 0);
  const movements = transactions
    .filter((transaction) => transaction.currency === currency && accountIds.has(transaction.accountId))
    .reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amountCents : -transaction.amountCents), 0);

  return initialBalance + movements;
}
