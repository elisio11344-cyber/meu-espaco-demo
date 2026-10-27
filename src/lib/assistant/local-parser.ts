import { assistantResultSchema, type AssistantResult, type QuickCaptureRequest } from "./schema";

const CATEGORY_MATCHERS: Array<[RegExp, string]> = [
  [/mercado|supermercado|hortifruti|padaria|acougue|comida|alimentacao|restaurante|lanchonete|lanche|cafe|delivery|ifood|ubereats|jantar|almoco/, "Comida"],
  [/aluguel|moradia|condominio|prestacao da casa|hipoteca/, "Aluguel"],
  [/jogo|game|steam|playstation|xbox|nintendo/, "Jogos"],
  [/onibus|metro|trem|uber|taxi|99|combustivel|gasolina|etanol|estacionamento|pedagio|transporte|passagem/, "Transporte"],
  [/academia|medic|dentista|farmacia|remedio|saude|terapia|psicolog|hospital|consulta|exame/, "Saúde"],
  [/internet|energia|luz|agua|telefone|celular|gas|assinatura|mensalidade|conta/, "Contas"],
  [/curso|livro|faculdade|escola|educacao|material|aula|estudo/, "Educação"],
  [/cinema|show|viagem|passeio|bar|festa|lazer|spotify|netflix/, "Lazer"],
  [/roupa|calcado|sapato|shopping|presente|compra/, "Compras"],
  [/salario|freelance|pagamento recebido|renda|comissao|reembolso|venda|dividendo|juros/, "Renda"],
];

const EVENT_INTENT_WORDS = [
  "agenda", "agendar", "agende", "programar", "programe", "marcar", "marque", "reservar", "reserve",
  "compromisso", "evento", "lembrete", "lembrar", "recordar", "reuniao", "encontro", "consulta",
  "dentista", "medico", "terapia", "treino", "academia", "corrida", "aula", "prova", "call", "ligacao",
  "entrevista", "apresentacao", "entrega", "prazo", "aniversario", "festa", "jantar", "almoco", "viagem", "voo",
  "schedule", "appointment", "meeting", "remind", "calendar", "programar", "recordatorio", "cita", "reunion",
];

const EVENT_COMMAND_WORDS = [
  "agenda", "agendar", "agende", "programar", "programe", "marcar", "marque", "reservar", "reserve", "colocar", "coloque",
  "incluir", "inclua", "adicione", "adicionar", "criar", "crie", "cadastrar", "cadastre", "registrar", "registre",
  "schedule", "add", "create", "remind", "programar", "agregar", "crear", "recordar",
];
const EVENT_METADATA_WORDS = [
  "hoje", "amanha", "ontem", "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo", "proximo", "proxima", "prox",
  "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "hoy", "manana", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
];

const EXPENSE_WORDS = [
  "gastei", "gasto", "paguei", "pagamento", "comprei", "compra", "despesa", "saida", "debito", "debitei", "custou", "saiu", "retirada",
  "spent", "paid", "bought", "expense", "purchase", "gaste", "pague", "compre", "gasto",
];
const INCOME_WORDS = [
  "recebi", "receita", "ganhei", "entrada", "salario", "renda", "deposito", "depositaram", "caiu", "entrou", "vendi", "reembolso", "comissao",
  "received", "earned", "income", "deposit", "refund", "recibi", "ingreso", "sueldo", "reembolso",
];
const NOTE_INTENT_WORDS = [
  "nota", "anotacao", "anotar", "anote", "anota", "escrever", "escreva", "registrar", "registre", "salvar", "salve", "guardar", "guarde", "ideia", "pensamento",
  "note", "write", "save", "idea", "thought", "nota", "escribe", "guardar", "idea",
];

const WEEKDAYS: Array<{ day: number; words: string[] }> = [
  { day: 1, words: ["segunda", "segunda-feira", "seg", "monday", "lunes"] },
  { day: 2, words: ["terca", "terca-feira", "ter", "tuesday", "martes"] },
  { day: 3, words: ["quarta", "quarta-feira", "qua", "wednesday", "miercoles"] },
  { day: 4, words: ["quinta", "quinta-feira", "qui", "thursday", "jueves"] },
  { day: 5, words: ["sexta", "sexta-feira", "sex", "friday", "viernes"] },
  { day: 6, words: ["sabado", "sab", "saturday"] },
  { day: 0, words: ["domingo", "dom", "sunday"] },
];

const MONTHS: Record<string, number> = {
  janeiro: 1, jan: 1, january: 1, enero: 1,
  fevereiro: 2, fev: 2, february: 2, febrero: 2,
  marco: 3, mar: 3, march: 3, marzo: 3,
  abril: 4, abr: 4, april: 4,
  maio: 5, mai: 5, may: 5, mayo: 5,
  junho: 6, jun: 6, june: 6, junio: 6,
  julho: 7, jul: 7, july: 7, julio: 7,
  agosto: 8, ago: 8, august: 8,
  setembro: 9, set: 9, september: 9, septiembre: 9,
  outubro: 10, out: 10, october: 10, octubre: 10,
  novembro: 11, nov: 11, november: 11, noviembre: 11,
  dezembro: 12, dez: 12, december: 12, diciembre: 12,
};

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0, uma: 1, um: 1, primeiro: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezassete: 17, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};

const HUNDREDS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800,
  oitocentas: 800, novecentos: 900, novecentas: 900,
};

const EVENT_TAGS: Array<{ words: RegExp; tag: string; color: string }> = [
  { words: /treino|academia|corrida|caminhada|natacao|futebol|medic|dentista|consulta|exame|saude|terapia|psicolog|hospital/, tag: "Saúde", color: "#2ec4b6" },
  { words: /reuniao|trabalho|cliente|projeto|entrega|prazo|call|ligacao|entrevista|apresentacao|equipe/, tag: "Trabalho", color: "#7b61ff" },
  { words: /aula|estudo|curso|prova|faculdade|escola|ingles|leitura|livro|revisao/, tag: "Estudo", color: "#4d96ff" },
  { words: /pagamento|pagar|banco|financeir|boleto|fatura|imposto|conta/, tag: "Finanças", color: "#ff9f1c" },
  { words: /planejar|planejamento|revisar|organizar|rotina|semana/, tag: "Planejamento", color: "#ffd600" },
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
  if (token.length === expected.length) {
    for (let index = 0; index < token.length - 1; index += 1) {
      const swapped = `${token.slice(0, index)}${token[index + 1]}${token[index]}${token.slice(index + 2)}`;
      if (swapped === expected) return true;
    }
  }
  const limit = expected.length >= 7 ? 2 : expected.length >= 4 ? 1 : 0;
  return Math.abs(token.length - expected.length) <= limit && levenshtein(token, expected) <= limit;
}

function words(value: string) {
  return normalizeText(value).match(/[a-z]+/g) ?? [];
}

function hasApproximateWord(message: string, expectedWords: string[]) {
  return words(message).some((token) => expectedWords.some((expected) => resembles(token, expected)));
}

function parseNumberWords(value: string) {
  const tokens = words(value).filter((token) => token !== "e");
  if (tokens.length === 0) return null;
  let total = 0;
  let group = 0;
  let recognized = 0;
  for (const token of tokens) {
    if (token === "mil") {
      total += (group || 1) * 1_000;
      group = 0;
      recognized += 1;
      continue;
    }
    const approximateHundred = Object.keys(HUNDREDS).find((candidate) => resembles(token, candidate));
    const approximateSmall = Object.keys(SMALL_NUMBERS).find((candidate) => resembles(token, candidate));
    const valueForToken = HUNDREDS[token] ?? SMALL_NUMBERS[token] ?? (approximateHundred ? HUNDREDS[approximateHundred] : undefined) ?? (approximateSmall ? SMALL_NUMBERS[approximateSmall] : undefined);
    if (valueForToken === undefined) continue;
    group += valueForToken;
    recognized += 1;
  }
  return recognized > 0 && recognized >= Math.ceil(tokens.length * 0.6) ? total + group : null;
}

function numberWordPattern() {
  return [...Object.keys(SMALL_NUMBERS), ...Object.keys(HUNDREDS), "mil", "e"].sort((left, right) => right.length - left.length).join("|");
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

  const monthNames = Object.keys(MONTHS).sort((left, right) => right.length - left.length).join("|");
  const namedDate = normalized.match(new RegExp(`\\b(?:dia\\s+)?(\\d{1,2})(?:º|o)?\\s+(?:de\\s+)?(${monthNames})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`));
  if (namedDate) {
    const [todayYear] = today.split("-").map(Number);
    const resolved = validDateKey(Number(namedDate[3] ?? todayYear), MONTHS[namedDate[2]], Number(namedDate[1]));
    if (resolved) return { date: resolved, explicit: true };
  }

  const namedWordDate = normalized.match(new RegExp(`\\b((?:(?:${numberWordPattern()})\\s*)+)\\s+(?:de\\s+)?(${monthNames})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`));
  if (namedWordDate) {
    const [todayYear] = today.split("-").map(Number);
    const day = parseNumberWords(namedWordDate[1]);
    const resolved = day === null ? null : validDateKey(Number(namedWordDate[3] ?? todayYear), MONTHS[namedWordDate[2]], day);
    if (resolved) return { date: resolved, explicit: true };
  }

  const relativeDays = normalized.match(/\b(?:daqui\s+a|em)\s+(\d{1,3})\s+dias?\b/);
  if (relativeDays) return { date: addDays(today, Number(relativeDays[1])), explicit: true };

  const relativeWeeks = normalized.match(/\b(?:daqui\s+a|em)\s+(\d{1,2})\s+semanas?\b/);
  if (relativeWeeks) return { date: addDays(today, Number(relativeWeeks[1]) * 7), explicit: true };

  const numberWords = numberWordPattern();
  const relativeWords = normalized.match(new RegExp(`\\b(?:daqui\\s+a|em)\\s+((?:(?:${numberWords})\\s*)+)\\s+dias?\\b`));
  if (relativeWords) {
    const amount = parseNumberWords(relativeWords[1]);
    if (amount !== null) return { date: addDays(today, amount), explicit: true };
  }

  const tokens = words(message);
  const hasTomorrow = tokens.some((token) => resembles(token, "amanha") || resembles(token, "tomorrow") || resembles(token, "manana"));
  const hasAfter = tokens.some((token) => resembles(token, "depois"));
  if (hasTomorrow) return { date: addDays(today, hasAfter ? 2 : 1), explicit: true };
  if (tokens.some((token) => resembles(token, "hoje") || token === "hj" || resembles(token, "today") || resembles(token, "hoy"))) return { date: today, explicit: true };
  if (tokens.some((token) => resembles(token, "ontem") || resembles(token, "yesterday") || resembles(token, "ayer"))) return { date: addDays(today, -1), explicit: true };

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
  const normalized = normalizeText(message);
  if (/\b(brl|reais|real|conto|contos|pila|pilas)\b|r\$/i.test(normalized) || hasApproximateWord(normalized, ["reais", "real", "contos", "pilas"])) return "BRL";
  if (/\b(aud|dolar australiano|dolares australianos|australian dollar|australian dollars)\b|a\$/i.test(normalized) || hasApproximateWord(normalized, ["australiano", "australianos"])) return "AUD";
  if (/\b(usd|dolar americano|dolares americanos|us dollar|us dollars|bucks?)\b|us\$/i.test(normalized) || hasApproximateWord(normalized, ["americano", "americanos", "bucks"])) return "USD";
  return currencies[0] ?? "BRL";
}

function numericAmount(raw: string) {
  const compact = raw.replace(/\s/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    return Number(compact.replace(thousands, "").replace(decimal, "."));
  }
  if (lastComma >= 0) return Number(compact.replace(/\./g, "").replace(",", "."));
  if (lastDot >= 0) {
    const trailingDigits = compact.length - lastDot - 1;
    return Number(trailingDigits === 3 ? compact.replace(/\./g, "") : compact);
  }
  return Number(compact);
}

function parseAmountCents(message: string) {
  const normalized = normalizeText(message);
  const numericPattern = /(?:r\$|a\$|us\$|brl|aud|usd|\$)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;
  for (const match of normalized.matchAll(numericPattern)) {
    const raw = match[1];
    const index = (match.index ?? 0) + match[0].lastIndexOf(raw);
    const before = normalized.slice(Math.max(0, index - 10), index);
    const after = normalized.slice(index + raw.length, index + raw.length + 2);
    if (/(?:dia\s*|[\/:\-]\s*)$/.test(before) || /^[\/:h]/.test(after)) continue;
    const amount = numericAmount(raw);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 100);
  }

  const currencyWords = "reais?|contos?|pilas?|dolares?(?: australianos?| americanos?)?|aud|usd|brl";
  const cents = normalized.match(new RegExp(`((?:(?:${numberWordPattern()})\\s*)+)\\s+(?:${currencyWords})(?:\\s+e\\s+((?:(?:${numberWordPattern()})\\s*)+)\\s+centavos?)?\\b`));
  if (cents) {
    const whole = parseNumberWords(cents[1]);
    const fraction = cents[2] ? parseNumberWords(cents[2]) : 0;
    if (whole !== null && fraction !== null) return whole * 100 + fraction;
  }

  const intentIndex = words(normalized).findIndex((token) => [...EXPENSE_WORDS, ...INCOME_WORDS].some((expected) => resembles(token, expected)));
  if (intentIndex >= 0) {
    const following = words(normalized).slice(intentIndex + 1, intentIndex + 8).join(" ").split(/\b(?:no|na|em|com|para)\b/)[0]
      .split(" ").filter((token) => !["real", "reais", "conto", "contos", "pila", "pilas", "dolar", "dolares", "aud", "usd", "brl"].some((currency) => resembles(token, currency))).join(" ");
    const amount = parseNumberWords(following);
    if (amount !== null && amount > 0) return amount * 100;
  }
  return null;
}

function titleFromContent(content: string) {
  const cleaned = content.trim().replace(/[.!?]+$/, "");
  return cleaned.length <= 60 ? cleaned : `${cleaned.slice(0, 57).trim()}…`;
}

function parseTransaction(request: QuickCaptureRequest): AssistantResult | null {
  const normalized = normalizeText(request.message);
  const expense = hasApproximateWord(normalized, EXPENSE_WORDS);
  const income = hasApproximateWord(normalized, INCOME_WORDS);
  if (!expense && !income) return null;
  const amountCents = parseAmountCents(request.message);
  if (!amountCents) return clarification("Qual é o valor da movimentação?");
  const currency = resolveCurrency(request.message, request.currencies);
  const account = request.accounts.find((item) => item.currency === currency) ?? null;
  const category = income ? "Renda" : CATEGORY_MATCHERS.find(([pattern]) => pattern.test(normalized))?.[1] ?? "Outros";
  const type = income ? "income" : "expense";
  const description = category === "Comida" && /mercado|supermercado|hortifruti/i.test(normalized) ? "Compras de mercado" : category;
  return assistantResultSchema.parse({
    action: { kind: "transaction", type, description, amountCents, currency, category, date: resolveDate(request.message, request.today), notes: "", accountId: account?.id ?? null },
    confirmation: `${type === "expense" ? "Saída" : "Entrada"} preparada em ${currency}.`,
    provider: "local",
    model: "regras da demonstração",
  });
}

function parseNote(request: QuickCaptureRequest): AssistantResult | null {
  if (!hasApproximateWord(request.message, NOTE_INTENT_WORDS)) return null;
  const explicitNote = request.message.match(/(?:criar|crie|adicione|adicionar|inclua|incluir|fazer|faça|registrar|registre|salvar|salve|guardar|guarde|create|add|write|save|crear|agrega|escribe)?\s*(?:uma|a|una)?\s*(?:nota|note|anotação|anotacao|ideia|idea|pensamento|thought)\s*(?:sobre|about|de|que)?\s*[:\-]?\s*(.+)/i);
  const directCommand = request.message.match(/(?:anote|anota|anotar|escreva|escrever|registre|registrar|salve|salvar|guarde|guardar|write|save|remember|escribe|guarda)\s*(?:isso|isto|aí|ai|this|esto)?\s*(?:que|de|that)?\s*[:\-]?\s*(.+)/i);
  const match = explicitNote ?? directCommand;
  if (!match) return null;
  const content = match[1].trim().replace(/\s+#\S+/g, "");
  if (!content) return clarification("O que você quer registrar na nota?");
  const normalized = normalizeText(request.message);
  const important = /\b(importante|destaque|destacada|prioridade|prioritario|essencial|favorita|favorito|urgente)\b/.test(normalized);
  const pinned = /\b(fixar|fixe|fixada|fixado|pin|pinar|topo|dashboard|painel|visao geral)\b/.test(normalized);
  const tags = [...request.message.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((item) => item[1].toLowerCase()).slice(0, 10);
  return assistantResultSchema.parse({
    action: { kind: "note", title: titleFromContent(content), content, tags, isPinned: pinned, isImportant: important },
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

function parseSpokenClock(value: string, period?: string) {
  const normalized = normalizeText(value);
  const minute = /\b(?:e\s+)?meia\b/.test(normalized) ? 30 : /\b(?:e\s+)?(?:um\s+quarto|quinze)\b/.test(normalized) ? 15 : 0;
  const hourPhrase = normalized.replace(/\b(?:e\s+)?(?:meia|um\s+quarto|quinze)\b/g, "").trim();
  const hour = parseNumberWords(hourPhrase);
  return hour === null ? null : parseClock(String(hour), String(minute), period);
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

  const spokenPattern = `${numberWordPattern()}|meia|quarto`;
  const spoken = normalized.match(new RegExp(`\\b(?:as|a|pelas?|pras?|para as|por volta das?)\\s+((?:(?:${spokenPattern})\\s*)+?)(?:\\s+da\\s+(manha|tarde|noite))?(?=\\s*(?:$|por|durante|no|na|em|de))`));
  if (spoken) {
    const clock = parseSpokenClock(spoken[1], spoken[2]);
    if (clock) return clock;
  }

  const introduced = normalized.match(/\b(?:as|a|pelas?|pras?|para as|por volta das?)\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas?)?\b/);
  if (introduced) return parseClock(introduced[1], introduced[2]);

  const direct = normalized.match(/\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))\b/);
  if (direct) return parseClock(direct[1], direct[2] ?? direct[3]);

  const writtenHour = normalized.match(/\b(\d{1,2})\s*horas?\b/);
  if (writtenHour) return parseClock(writtenHour[1]);
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
  const monthNames = Object.keys(MONTHS).sort((left, right) => right.length - left.length).join("|");
  const spokenPattern = `${numberWordPattern()}|meia|quarto`;
  let cleaned = message
    .replace(/(?:^|\s)(?:hoje|hj|today|hoy|amanh[aã]+|tomorrow|mañana|manana|ontem|yesterday|ayer|depois\s+de\s+amanh[aã]+)(?=\s|$)/gi, " ")
    .replace(/(?:^|\s)(?:pr[oó]xim[ao]\s+|prox\s+)?(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?(?=\s|$)/gi, " ")
    .replace(/\b(?:dia\s+)?\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,4})?\b/g, " ")
    .replace(new RegExp(`\\b(?:dia\\s+)?\\d{1,2}(?:º|o)?\\s+(?:de\\s+)?(?:${monthNames})(?:\\s+(?:de\\s+)?\\d{4})?\\b`, "gi"), " ")
    .replace(new RegExp(`\\b(?:(?:${spokenPattern})\\s*)+\\s+(?:de\\s+)?(?:${monthNames})(?:\\s+(?:de\\s+)?\\d{4})?\\b`, "gi"), " ")
    .replace(/\bdia\s+\d{1,2}\b/gi, " ")
    .replace(/\b(?:daqui\s+a|em)\s+(?:\d+|[a-zà-ú\s]+)\s+(?:dias?|semanas?)\b/gi, " ")
    .replace(/\b(?:das?|de)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?\s*(?:às|as|a|até|ate|-)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?\b/gi, " ")
    .replace(/(?:^|\s)(?:às|as|a|pelas?|pras?|para as|por volta das?)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:h|horas?)?(?:\s+da\s+(?:manhã|manha|tarde|noite))?(?=\s|$)/gi, " ")
    .replace(new RegExp(`(?:^|\\s)(?:às|as|a|pelas?|pras?|para as|por volta das?)\\s+(?:(?:${spokenPattern})\\s*)+(?:\\s+da\\s+(?:manhã|manha|tarde|noite))?(?=\\s|$)`, "gi"), " ")
    .replace(/\b\d{1,2}(?:h\d{0,2}|:\d{2})\b/gi, " ")
    .replace(/\b(?:ao\s+)?(?:meio[- ]?dia|meia[- ]?noite)\b/gi, " ")
    .replace(/\b(?:por|durante)\s+(?:\d+|[a-zà-ú\s]+)\s*(?:h|horas?|minutos?|min)\b/gi, " ")
    .replace(/\b(?:o\s+)?dia\s+(?:inteiro|todo)|\bsem\s+hor[aá]rio\b/gi, " ");

  cleaned = cleaned.split(/\s+/).filter((part) => {
    const token = normalizeText(part).replace(/[^a-z]/g, "");
    return !token || ![...EVENT_COMMAND_WORDS, ...EVENT_METADATA_WORDS].some((word) => resembles(token, word));
  }).join(" ");

  cleaned = cleaned
    .replace(/^\s*(?:me\s+)?(?:lembra|lembre|lembrar|lembrete|recorda|recorde)(?:\s+(?:de|da|do))?\s+/i, "")
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
  if (minutes) return Number(minutes[1]);
  const spoken = normalized.match(new RegExp(`\\b(?:por|durante)\\s+((?:(?:${numberWordPattern()})\\s*)+)\\s*(horas?|minutos?|min)\\b`));
  if (spoken) {
    const amount = parseNumberWords(spoken[1]);
    if (amount !== null) return spoken[2].startsWith("h") ? amount * 60 : amount;
  }
  return 60;
}

function parseEvent(request: QuickCaptureRequest): AssistantResult | null {
  const date = resolveDateDetails(request.message, request.today);
  const time = parseTime(request.message);
  const hasIntent = hasApproximateWord(request.message, EVENT_INTENT_WORDS);
  if (!hasIntent && !(date.explicit && time)) return null;
  const normalized = normalizeText(request.message);
  const vagueDate = /\b(proxima semana|semana que vem|fim de semana|final de semana|proximo mes|mes que vem)\b/.test(normalized);
  if (vagueDate && !date.explicit) return clarification("Em qual dia devo criar o compromisso?");
  const allDay = /\b(dia inteiro|o dia todo|dia todo|sem horario|all day|todo el dia)\b/i.test(normalized);
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
  return parseTransaction(input) ?? parseNote(input) ?? parseEvent(input) ?? clarification("Posso registrar gastos e receitas, guardar notas ou criar compromissos. Inclua o valor ou horário quando necessário.");
}
