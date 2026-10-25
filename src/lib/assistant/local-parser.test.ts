import { describe, expect, it } from "vitest";
import { interpretLocally } from "./local-parser";

const context = {
  timezone: "Australia/Sydney",
  today: "2026-10-19",
  currencies: ["AUD", "BRL", "USD"],
  accounts: [{ id: "account-br", name: "Conta Brasil", currency: "BRL" }],
};

describe("interpretador da captura rápida", () => {
  function eventParts(message: string) {
    const result = interpretLocally({ ...context, message });
    expect(result.action.kind).toBe("event");
    if (result.action.kind !== "event") throw new Error("Esperava um compromisso");
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: context.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(result.action.startAt));
    return { action: result.action, date: Object.fromEntries(parts.map((part) => [part.type, part.value])) };
  }

  it("interpreta uma despesa em reais e centavos", () => {
    const result = interpretLocally({ ...context, message: "Gastei 200 reais hoje em compras de mercado" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "expense", amountCents: 20_000, currency: "BRL", category: "Comida", accountId: "account-br" });
  });

  it("interpreta uma nota importante", () => {
    const result = interpretLocally({ ...context, message: "Criar nota: revisar o planejamento do projeto importante" });
    expect(result.action).toMatchObject({ kind: "note", isImportant: true });
  });

  it("interpreta um compromisso para amanhã no horário local", () => {
    const { action, date } = eventParts("Agendar treino amanhã às 18h");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-20 18:00");
    expect(action).toMatchObject({ title: "treino", tag: "Saúde" });
  });

  it("entende erros de escrita no verbo, na data e no horário", () => {
    const { action, date } = eventParts("agenar reuniao amanhaa as 18h30");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-20 18:30");
    expect(action).toMatchObject({ title: "reuniao", tag: "Trabalho" });
  });

  it("entende horário natural e abreviação de hoje", () => {
    const { action, date } = eventParts("marca academia hj 7 da noite");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-19 19:00");
    expect(action.tag).toBe("Saúde");
  });

  it("calcula o próximo dia da semana e respeita duração", () => {
    const { action, date } = eventParts("me lembre da aula prox terça às 9 por 2 horas");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-20 09:00");
    expect(action.title).toBe("aula");
    expect(new Date(action.endAt).getTime() - new Date(action.startAt).getTime()).toBe(120 * 60_000);
  });

  it("corrige uma grafia aproximada do dia da semana sem poluir o título", () => {
    const { action, date } = eventParts("me lembra dentista prox tersa 9h");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-20 09:00");
    expect(action).toMatchObject({ title: "dentista", tag: "Saúde" });
  });

  it("entende intervalo de horário e data numérica", () => {
    const { action, date } = eventParts("coloca na agnda reunião dia 30/10 das 14 as 15:30");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-30 14:00");
    expect(new Date(action.endAt).getTime() - new Date(action.startAt).getTime()).toBe(90 * 60_000);
  });

  it("cria compromissos de dia inteiro quando isso estiver explícito", () => {
    const { action, date } = eventParts("agendar viagem dia 25 o dia todo");
    expect(`${date.year}-${date.month}-${date.day}`).toBe("2026-10-25");
    expect(action.allDay).toBe(true);
  });

  it("pede o horário quando ele estiver ausente", () => {
    const result = interpretLocally({ ...context, message: "Agendar consulta amanhã" });
    expect(result.action.kind).toBe("clarification");
  });
});
