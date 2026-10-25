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

const EVENT_INTENT_WORDS = [
  "agenda", "agendar", "agende", "marcar", "marque", "compromisso", "evento", "lembrete",
  "lembrar", "reuniao", "consulta", "dentista", "medico", "treino", "academia", "aula", "call",
];

const EVENT_COMMAND_WORDS = ["agenda", "agendar", "agende", "marcar", "marque", "colocar", "coloque", "incluir", "adicione", "adicionar", "criar"];
const EVENT_METADATA_WORDS = ["hoje", "amanha", "ontem", "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo", "proximo", "proxima", "prox"];

const WEEKDAYS: Array<{ day: number; words: string[] }> = [
  { day: 1, words: ["segunda", "seg"] },
  { day: 2, words: ["terca", "ter"] },
  { day: 3, words: ["quarta", "qua"] },
  { day: 4, words: ["quinta", "qui"] },
  { day: 5, words: ["sexta", "sex"] },
  { day: 6, words: ["sabado", "sab"] },
  { day: 0, words: ["domingo", "dom"] },
];

const EVENT_TAGS: Array<{ words: RegExp; tag: string; color: string }> = [
  { words: /treino|academia|corrida|medic|dentista|consulta|saude|terapia/, tag: "Saúde", color: "#2ec4b6" },
  { words: /reuniao|trabalho|cliente|projeto|entrega|call/, tag: "Trabalho", color: "#7b61ff" },
  { words: /aula|estudo|curso|prova|faculdade|ingles|leitura/, tag: "Estudo", color: "#4d96ff" },
  { words: /pagamento|pagar|banco|financeir|conta/, tag: "Finanças", color: "#ff9f1c" },
  { words: /planejar|planejamento|revisar|organizar/, tag: "Planejamento", color: "#ffd600" },
];

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function resembles(token: string, expected: string) {
  if (token === expected) return true;
  const limit = expected.length >= 7 ? 2 : expected.length >= 4 ? 1 : 0;
  return Math.abs(token.length - expected.length) <= limit && levenshtein(token, expected) <= limit;
}

function words(value: string) {
  return normalizeText(value).match(/[a-z]+/g) ?? [];
}

function hasApproximateWord(message: string, expectedWords: string[]) {
  return words(message).some((token) => expectedWords.some((expected) => resembles(token, expected)));
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function localDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return localDateKey(date);
}

function validDateKey(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return localDateKey(date);
}

function resolveDateDetails(message: string, today: string) {
  const normalized = normalizeText(message);
  const isoDate = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDate) return { date: isoDate[0], explicit: true };

  const numericDate = normalized.match(/\b(?:dia\s+)?(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
  if (numericDate) {
    const [todayYear] = today.split("-").map(Number);
    const rawYear = numericDate[3] ? Number(numericDate[3]) : todayYear;
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const resolved = validDateKey(year, Number(numericDate[2]), Number(numericDate[1]));
    if (resolved) return { date: resolved, explicit: true };
  }

  const relativeDays = normalized.match(/\b(?:daqui\s+a|em)\s+(\d{1,3})\s+dias?\b/);
  if (relativeDays) return { date: addDays(today, Number(relativeDays[1])), explicit: true };

  const tokens = words(message);
  const hasTomorrow = tokens.some((token) => resembles(token, "amanha"));
  const hasAfter = tokens.some((token) => resembles(token, "depois"));
  if (hasTomorrow) return { date: addDays(today, hasAfter ? 2 : 1), explicit: true };
  if (tokens.some((token) => resembles(token, "hoje") || token === "hj")) return { date: today, explicit: true };
  if (tokens.some((token) => resembles(token, "ontem"))) return { date: addDays(today, -1), explicit: true };

  for (const weekday of WEEKDAYS) {
    if (!tokens.some((token) => weekday.words.some((word) => resembles(token, word)))) continue;
    const currentDay = dateFromKey(today).getUTCDay();
    const offset = (weekday.day - currentDay + 7) % 7 || 7;
    return { date: addDays(today, offset), explicit: true };
  }

  const dayOnly = normalized.match(/\bdia\s+(\d{1,2})\b/);
  if (dayOnly) {
    const [year, month, currentDay] = today.split("-").map(Number);
    const requestedDay = Number(dayOnly[1]);
    const sameMonth = requestedDay >= currentDay ? validDateKey(year, month, requestedDay) : null;
    if (sameMonth) return { date: sameMonth, explicit: true };
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const resolved = validDateKey(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, requestedDay);
    if (resolved) return { date: resolved, explicit: true };
  }

  return { date: today, explicit: false };
}

function resolveDate(message: string, today: string) {
  return resolveDateDetails(message, today).date;
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

type ParsedTime = { hour: number; minute: number; endHour?: number; endMinute?: number };

function periodAdjustedHour(hour: number, period?: string) {
  if (!period) return hour;
  if (period === "tarde" || period === "noite") return hour < 12 ? hour + 12 : hour;
  if (period === "manha" && hour === 12) return 0;
  return hour;
}

function parseClock(rawHour: string, rawMinute?: string, period?: string) {
  const hour = periodAdjustedHour(Number(rawHour), period);
  const minute = Number(rawMinute ?? 0);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : null;
}

function parseTime(message: string): ParsedTime | null {
  const normalized = normalizeText(message);
  if (/\bmeia[- ]?noite\b/.test(normalized)) return { hour: 0, minute: 0 };
  if (/\bmeio[- ]?dia\b/.test(normalized)) return { hour: 12, minute: 0 };

  const range = normalized.match(/\b(?:das?|de)\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas?)?\s*(?:as|a|ate|-)\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas?)?\b/);
  if (range) {
    const start = parseClock(range[1], range[2]);
    const end = parseClock(range[3], range[4]);
    if (start && end) return { ...start, endHour: end.hour, endMinute: end.minute };
  }

  const naturalPeriod = normalized.match(/\b(?:as|a|pelas?|pras?|para as)?\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas?)?\s+da\s+(manha|tarde|noite)\b/);
  if (naturalPeriod) return parseClock(naturalPeriod[1], naturalPeriod[2], naturalPeriod[3]);

  const introduced = normalized.match(/\b(?:as|a|pelas?|pras?|para as|por volta das?)\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas?)?\b/);
  if (introduced) return parseClock(introduced[1], introduced[2]);

  const direct = normalized.match(/\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))\b/);
  if (direct) return parseClock(direct[1], direct[2] ?? direct[3]);
  return null;
}

function zonedDateTimeToIso(dateKey: string, hour: number, minute: number, timezone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = desired;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    timestamp += desired - represented;
  }
  return new Date(timestamp).toISOString();
}

function eventTitle(message: string) {
  let cleaned = message
    .replace(/(?:^|\s)(?:hoje|hj|amanh[aã]+|ontem|depois\s+de\s+amanh[aã]+)(?=\s|$)/gi, " ")
    .replace(/(?:^|\s)(?:pr[oó]xim[ao]\s+|prox\s+)?(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?(?=\s|$)/gi, " ")
    .replace(/\b(?:dia\s+)?\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,4})?\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\b/gi, " ")
    .replace(/\b(?:daqui\s+a|em)\s+\d+\s+dias?\b/gi, " ")
    .replace(/\b(?:das?|de)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?\s*(?:às|as|a|até|ate|-)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?\b/gi, " ")
    .replace(/(?:^|\s)(?:às|as|a|pelas?|pras?|para as|por volta das?)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?(?:\s+da\s+(?:manhã|manha|tarde|noite))?(?=\s|$)/gi, " ")
    .replace(/\b\d{1,2}(?:h\d{0,2}|:\d{2})\b/gi, " ")
    .replace(/\b(?:ao\s+)?(?:meio[- ]?dia|meia[- ]?noite)\b/gi, " ")
    .replace(/\b(?:por|durante)\s+\d+\s*(?:h|horas?|minutos?|min)\b/gi, " ");

  cleaned = cleaned.split(/\s+/).filter((part) => {
    const token = normalizeText(part).replace(/[^a-z]/g, "");
    return !token || ![...EVENT_COMMAND_WORDS, ...EVENT_METADATA_WORDS].some((word) => resembles(token, word));
  }).join(" ");

  cleaned = cleaned
    .replace(/^\s*(?:me\s+)?(?:lembra|lembre|lembrar|lembrete)(?:\s+(?:de|da|do))?\s+/i, "")
    .replace(/^\s*(?:um|uma|o|a|para|na|no|na agenda)\s+/i, "")
    .replace(/\s+/g, " ").replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "");
  return titleFromContent(cleaned || "Novo compromisso");
}

function resolveEventTag(message: string) {
  const normalized = normalizeText(message);
  return EVENT_TAGS.find((item) => item.words.test(normalized)) ?? { tag: "Pessoal", color: "#ffd600" };
}

function parseDurationMinutes(message: string) {
  const normalized = normalizeText(message);
  const hours = normalized.match(/\b(?:por|durante)\s+(\d{1,2})(?:[.,](\d))?\s*(?:h|horas?)\b/);
  if (hours) return Math.round((Number(hours[1]) + Number(`0.${hours[2] ?? 0}`)) * 60);
  const minutes = normalized.match(/\b(?:por|durante)\s+(\d{1,3})\s*(?:min|minutos?)\b/);
  return minutes ? Number(minutes[1]) : 60;
}

function parseEvent(request: QuickCaptureRequest): AssistantResult | null {
  if (!hasApproximateWord(request.message, EVENT_INTENT_WORDS)) return null;
  const date = resolveDateDetails(request.message, request.today);
  const allDay = /\b(dia inteiro|o dia todo|sem horario)\b/i.test(normalizeText(request.message));
  const time = parseTime(request.message);
  if (!time && !allDay) return clarification("Em qual horário devo criar o compromisso?");

  let startAt: string;
  let endAt: string;
  if (allDay) {
    startAt = zonedDateTimeToIso(date.date, 0, 0, request.timezone);
    endAt = zonedDateTimeToIso(addDays(date.date, 1), 0, 0, request.timezone);
  } else {
    const resolvedTime = time!;
    startAt = zonedDateTimeToIso(date.date, resolvedTime.hour, resolvedTime.minute, request.timezone);
    if (resolvedTime.endHour !== undefined) {
      const endDate = resolvedTime.endHour * 60 + (resolvedTime.endMinute ?? 0) <= resolvedTime.hour * 60 + resolvedTime.minute ? addDays(date.date, 1) : date.date;
      endAt = zonedDateTimeToIso(endDate, resolvedTime.endHour, resolvedTime.endMinute ?? 0, request.timezone);
    } else {
      endAt = new Date(new Date(startAt).getTime() + parseDurationMinutes(request.message) * 60_000).toISOString();
    }
  }

  const category = resolveEventTag(request.message);
  return assistantResultSchema.parse({
    action: { kind: "event", title: eventTitle(request.message), description: "", startAt, endAt, allDay, tag: category.tag, color: category.color },
    confirmation: "Compromisso preparado na agenda.",
    provider: "local",
    model: "regras tolerantes a escrita",
  });
}

function clarification(question: string): AssistantResult {
  return assistantResultSchema.parse({ action: { kind: "clarification", question }, confirmation: question, provider: "local", model: "regras da demonstração" });
}

export function interpretLocally(input: QuickCaptureRequest): AssistantResult {
  return parseTransaction(input) ?? parseNote(input) ?? parseEvent(input) ?? clarification("Posso registrar uma movimentação, criar uma nota ou agendar um compromisso. O que você deseja adicionar?");
}
