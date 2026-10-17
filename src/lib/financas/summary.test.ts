import { describe, expect, it } from "vitest";
import { calculateAccumulatedTotal } from "./summary";
import type { FinancialAccount, Transaction } from "@/lib/local-data";

const accounts: FinancialAccount[] = [
  { id: "aud-1", name: "Principal", institutionId: "bank-au", currency: "AUD", initialBalanceCents: 100_000, active: true },
  { id: "aud-2", name: "Reserva", institutionId: "bank-au", currency: "AUD", initialBalanceCents: 50_000, active: true },
  { id: "brl-1", name: "Brasil", institutionId: "bank-br", currency: "BRL", initialBalanceCents: 900_000, active: true },
  { id: "aud-old", name: "Arquivada", institutionId: "bank-au", currency: "AUD", initialBalanceCents: 75_000, active: false },
];

const baseTransaction = { description: "Teste", category: "Outros", date: "2026-10-11", notes: "" };
const transactions: Transaction[] = [
  { ...baseTransaction, id: "income", accountId: "aud-1", currency: "AUD", type: "income", amountCents: 20_000 },
  { ...baseTransaction, id: "expense", accountId: "aud-2", currency: "AUD", type: "expense", amountCents: 5_000 },
  { ...baseTransaction, id: "brl", accountId: "brl-1", currency: "BRL", type: "income", amountCents: 100_000 },
  { ...baseTransaction, id: "archived", accountId: "aud-old", currency: "AUD", type: "income", amountCents: 30_000 },
];

describe("total acumulado por moeda", () => {
  it("soma os saldos atuais de todas as contas ativas da moeda", () => {
    expect(calculateAccumulatedTotal(accounts, transactions, "AUD")).toBe(165_000);
  });

  it("mantém moedas e contas arquivadas fora do total selecionado", () => {
    expect(calculateAccumulatedTotal(accounts, transactions, "BRL")).toBe(1_000_000);
  });
});
