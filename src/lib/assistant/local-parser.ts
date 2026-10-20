import { assistantResultSchema, type AssistantResult, type QuickCaptureRequest } from "./schema";

const CATEGORY_MATCHERS: Array<[RegExp, string]> = [
  [/mercado|supermercado|comida|restaurante|lanche/i, "Comida"],
  [/aluguel|moradia/i, "Aluguel"],
  [/jogo|game/i, "Jogos"],
  [/ônibus|onibus|uber|combustível|combustivel|transporte/i, "Transporte"],
  [/academia|médic|medic|farmácia|farmacia|saúde|saude/i, "Saúde"],
  [/internet|energia|telefone|conta/i, "Contas"],
  [/curso|livro|faculdade|educação|educacao/i, "Educação"],
  [/salário|salario|freelance|pagamento recebido|renda/i, "Renda"],
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveDate(message: string, today: string) {
  const base = new Date(`${today}T12:00:00`);
  if (/ontem/i.test(message)) base.setDate(base.getDate() - 1);
  if (/amanhã|amanha/i.test(message)) base.setDate(base.getDate() + 1);
  const explicit = message.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return explicit ? explicit[0] : localDateKey(base);
}

function resolveCurrency(message: string, currencies: string[]) {
  if (/\b(BRL|reais|real)\b|R\$/i.test(message)) return "BRL";
  if (/\b(AUD|dólar australiano|dolar australiano)\b/i.test(message)) return "AUD";
  if (/\b(USD|dólar americano|dolar americano)\b/i.test(message)) return "USD";
  return currencies[0] ?? "BRL";
}

function parseAmountCents(message: string) {
  const match = message.match(/(?:R\$|AUD|USD|\$)?\s*(\d{1,9}(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function titleFromContent(content: string) {
  const cleaned = content.trim().replace(/[.!?]+$/, "");
  return cleaned.length <= 60 ? cleaned : `${cleaned.slice(0, 57).trim()}…`;
}

function parseTransaction(request: QuickCaptureRequest): AssistantResult | null {
  const expense = /\b(gastei|paguei|comprei|saída|saida|despesa)\b/i.test(request.message);
  const income = /\b(recebi|ganhei|entrada|salário|salario)\b/i.test(request.message);
  if (!expense && !income) return null;
  const amountCents = parseAmountCents(request.message);
  if (!amountCents) return clarification("Qual é o valor da movimentação?");
  const currency = resolveCurrency(request.message, request.currencies);
  const account = request.accounts.find((item) => item.currency === currency) ?? null;
  const category = CATEGORY_MATCHERS.find(([pattern]) => pattern.test(request.message))?.[1] ?? (income ? "Renda" : "Outros");
  const type = income ? "income" : "expense";
  const description = category === "Comida" && /mercado|supermercado/i.test(request.message) ? "Compras de mercado" : category;
  return assistantResultSchema.parse({
    action: { kind: "transaction", type, description, amountCents, currency, category, date: resolveDate(request.message, request.today), notes: "", accountId: account?.id ?? null },
    confirmation: `${type === "expense" ? "Saída" : "Entrada"} preparada em ${currency}.`,
    provider: "local",
    model: "regras da demonstração",
  });
}

function parseNote(request: QuickCaptureRequest): AssistantResult | null {
  const match = request.message.match(/(?:criar|adicione|adicionar)?\s*(?:uma\s+)?nota\s*[:\-]?\s*(.+)/i) ?? request.message.match(/anote\s*[:\-]?\s*(.+)/i);
  if (!match) return null;
  const content = match[1].trim();
  if (!content) return clarification("O que você quer registrar na nota?");
  const important = /\b(importante|destaque)\b/i.test(request.message);
  const pinned = /\b(fixar|fixada|dashboard)\b/i.test(request.message);
  return assistantResultSchema.parse({
    action: { kind: "note", title: titleFromContent(content), content, tags: [], isPinned: pinned, isImportant: important },
    confirmation: "Nota pronta para o seu segundo cérebro.",
    provider: "local",
    model: "regras da demonstração",
  });
}

function parseEvent(request: QuickCaptureRequest): AssistantResult | null {
  if (!/\b(agendar|agenda|marcar|compromisso|reunião|reuniao|consulta|treino)\b/i.test(request.message)) return null;
  const date = resolveDate(request.message, request.today);
  const timeMatch = request.message.match(/(?:às|as|pelas?)\s*(\d{1,2})(?::(\d{2}))?\s*h?/i);
  if (!timeMatch) return clarification("Em qual horário devo criar o compromisso?");
  const hour = Math.min(23, Number(timeMatch[1]));
  const minute = Math.min(59, Number(timeMatch[2] ?? 0));
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const title = request.message
    .replace(/\b(agendar|agenda|marcar)\b/gi, "")
    .replace(/(hoje|amanhã|amanha|ontem)/gi, "")
    .replace(/(?:às|as|pelas?)\s*\d{1,2}(?::\d{2})?\s*h?/i, "")
    .trim().replace(/^uma?\s+/i, "") || "Novo compromisso";
  return assistantResultSchema.parse({
    action: { kind: "event", title: titleFromContent(title), description: "", startAt: start.toISOString(), endAt: end.toISOString(), allDay: false, tag: /treino|academia/i.test(request.message) ? "Saúde" : "Pessoal", color: /treino|academia/i.test(request.message) ? "#2ec4b6" : "#ffd600" },
    confirmation: "Compromisso preparado na agenda.",
    provider: "local",
    model: "regras da demonstração",
  });
}

function clarification(question: string): AssistantResult {
  return assistantResultSchema.parse({ action: { kind: "clarification", question }, confirmation: question, provider: "local", model: "regras da demonstração" });
}

export function interpretLocally(input: QuickCaptureRequest): AssistantResult {
  const request = input;
  return parseTransaction(request) ?? parseNote(request) ?? parseEvent(request) ?? clarification("Posso registrar uma movimentação, criar uma nota ou agendar um compromisso. O que você deseja adicionar?");
}
