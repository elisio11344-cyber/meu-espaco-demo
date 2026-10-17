import { describe, expect, it } from "vitest";
import { convertNetWorth } from "./exchange";

const balances = { AUD: 10_000, BRL: 20_000, USD: 30_000 };
const rates = { AUD: 2, BRL: 5, USD: 1.25 };

describe("patrimônio consolidado", () => {
  it("converte todos os saldos para AUD antes de somar", () => {
    expect(convertNetWorth(balances, "AUD", rates)).toBe(66_000);
  });

  it("converte o mesmo patrimônio para a moeda escolhida", () => {
    expect(convertNetWorth(balances, "BRL", rates)).toBe(165_000);
    expect(convertNetWorth(balances, "USD", rates)).toBe(41_250);
  });
});
