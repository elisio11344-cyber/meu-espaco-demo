import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./local-data";

describe("valores financeiros", () => {
  it.each([
    ["10,50", 1050],
    ["10.50", 1050],
    ["1.800,00", 180000],
    ["1800", 180000],
    ["R$ 29,90", 2990],
  ])("converte %s para centavos", (value, expected) => {
    expect(parseMoney(value)).toBe(expected);
  });

  it("formata centavos em reais", () => {
    expect(formatMoney(12990)).toContain("129,90");
  });
});
