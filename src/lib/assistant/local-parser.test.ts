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

  it("interpreta valores formatados e categorias por contexto", () => {
    const result = interpretLocally({ ...context, message: "Paguei R$ 1.250,50 de aluguel ontem" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "expense", amountCents: 125_050, currency: "BRL", category: "Aluguel", date: "2026-10-18" });
  });

  it("interpreta valores por extenso e gírias monetárias", () => {
    const result = interpretLocally({ ...context, message: "gastei duzentos e cinquenta conto no supermercado" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "expense", amountCents: 25_000, currency: "BRL", category: "Comida" });
  });

  it("tolera erros de digitação em valores e moedas por extenso", () => {
    const result = interpretLocally({ ...context, message: "gastei duzentu reias na padaria" });
    expect(result.action).toMatchObject({ kind: "transaction", amountCents: 20_000, currency: "BRL", category: "Comida" });
  });

  it("reconhece formas informais de registrar receita", () => {
    const result = interpretLocally({ ...context, message: "caiu 850 de freelance na conta" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "income", amountCents: 85_000, category: "Renda" });
  });

  it("entende uma movimentação escrita em inglês", () => {
    const result = interpretLocally({ ...context, message: "I spent 45 AUD on Uber today" });
    expect(result.action).toMatchObject({ kind: "transaction", type: "expense", amountCents: 4_500, currency: "AUD", category: "Transporte" });
  });

  it("não usa o dia de uma data como valor financeiro", () => {
    const result = interpretLocally({ ...context, message: "paguei a conta dia 30/10" });
    expect(result.action).toMatchObject({ kind: "clarification", question: "Qual é o valor da movimentação?" });
  });

  it("interpreta uma nota importante", () => {
    const result = interpretLocally({ ...context, message: "Criar nota: revisar o planejamento do projeto importante" });
    expect(result.action).toMatchObject({ kind: "note", isImportant: true });
  });

  it("entende sinônimos de anotação, etiquetas e destaque", () => {
    const result = interpretLocally({ ...context, message: "Guarde uma ideia sobre melhorar o onboarding #produto como prioridade" });
    expect(result.action).toMatchObject({ kind: "note", tags: ["produto"], isImportant: true });
  });

  it("entende pedido para fixar uma nota no painel", () => {
    const result = interpretLocally({ ...context, message: "Registre uma nota: revisar orçamento e deixe no topo" });
    expect(result.action).toMatchObject({ kind: "note", isPinned: true });
  });

  it("entende uma nota escrita em espanhol", () => {
    const result = interpretLocally({ ...context, message: "Guarda una nota: idea para el nuevo proyecto #trabajo" });
    expect(result.action).toMatchObject({ kind: "note", tags: ["trabajo"] });
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

  it("entende data com mês escrito e horário por extenso", () => {
    const { action, date } = eventParts("dentista 27 de outubro às nove e meia");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-27 09:30");
    expect(action).toMatchObject({ title: "dentista", tag: "Saúde" });
  });

  it("entende o dia do mês escrito por extenso", () => {
    const { date } = eventParts("marcar consulta vinte e sete de outubro às 10h");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-27 10:00");
  });

  it("entende compromissos naturais mesmo sem o verbo agendar", () => {
    const { action, date } = eventParts("jantar com Ana amanhã 20h");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-20 20:00");
    expect(action.title).toBe("jantar com Ana");
  });

  it("entende datas relativas com números por extenso", () => {
    const { date } = eventParts("marque terapia em três dias às oito da manhã");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-22 08:00");
  });

  it("entende duração por extenso", () => {
    const { action } = eventParts("programar estudo amanhã às 14h durante duas horas");
    expect(new Date(action.endAt).getTime() - new Date(action.startAt).getTime()).toBe(120 * 60_000);
  });

  it("entende dias da semana em inglês", () => {
    const { date } = eventParts("schedule a call next friday at 10h");
    expect(`${date.year}-${date.month}-${date.day} ${date.hour}:${date.minute}`).toBe("2026-10-23 10:00");
  });

  it("pede o horário quando ele estiver ausente", () => {
    const result = interpretLocally({ ...context, message: "Agendar consulta amanhã" });
    expect(result.action.kind).toBe("clarification");
  });
});
