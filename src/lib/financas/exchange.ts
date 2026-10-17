import type { Currency } from "@/lib/local-data";

export type ExchangeRates = Record<Currency, number>;
export type CurrencyBalances = Record<Currency, number>;

export function convertNetWorth(
  balances: CurrencyBalances,
  targetCurrency: Currency,
  ratesPerEuro: ExchangeRates,
) {
  return Math.round(
    (Object.entries(balances) as [Currency, number][]).reduce(
      (total, [sourceCurrency, balanceCents]) =>
        total + balanceCents * (ratesPerEuro[targetCurrency] / ratesPerEuro[sourceCurrency]),
      0,
    ),
  );
}
