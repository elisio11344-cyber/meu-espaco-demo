import { describe, expect, it } from "vitest";
import { interpretLocally } from "./local-parser";

const context = {
  timezone: "Australia/Sydney",
  today: "2026-10-19",
  currencies: ["AUD", "BRL", "USD"],
  accounts: [{ id: "account-br", name: "Conta Brasil", currency: "BRL" }],
};

describe("interpretador da captura rápida", () => {
  it("interpreta uma despesa em reais e centavos", () => {
    const result = interpretLocally({ ...context, message: "Gastei 200 reais hoje em compras de mercado" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "expense", amountCents: 20_000, currency: "BRL", category: "Comida", accountId: "account-br" });
  });

  it("interpreta uma nota importante", () => {
    const result = interpretLocally({ ...context, message: "Criar nota: revisar o planejamento do projeto importante" });
    expect(result.action).toMatchObject({ kind: "note", isImportant: true });
  });

  it("interpreta um compromisso para amanhã no horário local", () => {
    const result = interpretLocally({ ...context, message: "Agendar treino amanhã às 18h" });
    expect(result.action.kind).toBe("event");
    if (result.action.kind === "event") {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(result.action.startAt));
      const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      expect(`${date.year}-${date.month}-${date.day}`).toBe("2026-10-20");
    }
  });

  it("pede o horário quando ele estiver ausente", () => {
    const result = interpretLocally({ ...context, message: "Agendar consulta amanhã" });
    expect(result.action.kind).toBe("clarification");
  });
});
