"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppPreferences } from "./app-preferences";

export type Habit = {
  id: string;
  name: string;
  frequency: "Diário" | "Dias úteis" | "Semanal";
  target: number;
  unit: string;
  category: string;
  completed: boolean;
  streak: number;
  pointsReward: number;
  completedDates: string[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  links: string[];
  updatedAt: string;
  isPinned: boolean;
  isImportant: boolean;
};

export type Goal = {
  id: string;
  title: string;
  category: string;
  target: number;
  current: number;
  deadline: string;
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  pointsReward: number;
  isImportant: boolean;
  completedAt?: string;
};

export type Currency = string;

export type UserCurrency = {
  code: Currency;
  name: string;
  countryCode: string;
};

export type BankInstitution = {
  id: string;
  name: string;
  countryCode: string;
  currency: Currency;
};

export type FinancialAccount = {
  id: string;
  name: string;
  institutionId: string;
  currency: Currency;
  initialBalanceCents: number;
  active: boolean;
};

export type Transaction = {
  id: string;
  description: string;
  amountCents: number;
  type: "expense" | "income";
  category: string;
  date: string;
  notes: string;
  currency: Currency;
  accountId: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  tag: string;
  color: string;
  completed: boolean;
};

export const seedHabits: Habit[] = [
  { id: "habit-water", name: "Beber 2L de água", frequency: "Diário", target: 2, unit: "litros", category: "Saúde", completed: true, streak: 12, pointsReward: 10, completedDates: ["2026-10-11"] },
  { id: "habit-training", name: "Treino de força", frequency: "Dias úteis", target: 45, unit: "minutos", category: "Treino", completed: false, streak: 4, pointsReward: 15, completedDates: [] },
  { id: "habit-reading", name: "Ler 20 páginas", frequency: "Diário", target: 20, unit: "páginas", category: "Estudo", completed: false, streak: 7, pointsReward: 10, completedDates: [] },
  { id: "habit-planning", name: "Planejar amanhã", frequency: "Diário", target: 5, unit: "minutos", category: "Organização", completed: true, streak: 18, pointsReward: 5, completedDates: ["2026-10-11"] },
];

export const seedNotes: Note[] = [
  { id: "note-morning", title: "Rotina matinal", content: "Começar sem olhar o celular, beber água e preparar o treino na noite anterior.", tags: ["rotina", "energia"], links: ["note-focus", "note-training"], updatedAt: "2026-10-11", isPinned: true, isImportant: false },
  { id: "note-focus", title: "Trabalho profundo", content: "Blocos de 50 minutos com notificações desligadas e uma intenção clara.", tags: ["foco", "trabalho"], links: ["note-morning", "note-books"], updatedAt: "2026-10-10", isPinned: false, isImportant: true },
  { id: "note-training", title: "Plano de treino", content: "Alternar força e mobilidade. Registrar carga e percepção de esforço.", tags: ["saúde", "treino"], links: ["note-morning", "note-food"], updatedAt: "2026-10-09", isPinned: false, isImportant: false },
  { id: "note-books", title: "Livros para ler", content: "Uma lista curta e intencional sobre comportamento, finanças e criatividade.", tags: ["leitura", "estudo"], links: ["note-focus"], updatedAt: "2026-10-08", isPinned: false, isImportant: false },
  { id: "note-food", title: "Planejamento alimentar", content: "Montar cardápio simples e lista de compras antes da semana começar.", tags: ["saúde", "finanças"], links: ["note-training", "note-budget"], updatedAt: "2026-10-07", isPinned: false, isImportant: false },
  { id: "note-budget", title: "Orçamento mensal", content: "Separar custos fixos, objetivos e uma margem para lazer.", tags: ["finanças", "planejamento"], links: ["note-food"], updatedAt: "2026-10-06", isPinned: false, isImportant: false },
];

export const seedGoals: Goal[] = [
  { id: "goal-reserve", title: "Reserva de emergência", category: "Finanças", target: 10000, current: 6400, deadline: "2026-12-31", status: "in_progress", pointsReward: 200, isImportant: true },
  { id: "goal-run", title: "Correr 10 km", category: "Saúde", target: 10, current: 6.5, deadline: "2027-02-28", status: "in_progress", pointsReward: 150, isImportant: false },
  { id: "goal-books", title: "Ler 24 livros", category: "Estudo", target: 24, current: 17, deadline: "2026-12-31", status: "in_progress", pointsReward: 120, isImportant: false },
];

export const seedInstitutions: BankInstitution[] = [
  { id: "bank-au", name: "Commonwealth Bank", countryCode: "AU", currency: "AUD" },
  { id: "bank-br", name: "Nubank", countryCode: "BR", currency: "BRL" },
  { id: "bank-us", name: "Wise US", countryCode: "US", currency: "USD" },
];

export const defaultCurrencies: UserCurrency[] = [
  { code: "AUD", name: "Dólar australiano", countryCode: "AU" },
  { code: "BRL", name: "Real brasileiro", countryCode: "BR" },
  { code: "USD", name: "Dólar americano", countryCode: "US" },
];

export const seedAccounts: FinancialAccount[] = [
  { id: "account-au", name: "Conta Austrália", institutionId: "bank-au", currency: "AUD", initialBalanceCents: 425000, active: true },
  { id: "account-br", name: "Conta Brasil", institutionId: "bank-br", currency: "BRL", initialBalanceCents: 350000, active: true },
  { id: "account-us", name: "Conta internacional", institutionId: "bank-us", currency: "USD", initialBalanceCents: 112000, active: true },
];

export const seedTransactions: Transaction[] = [
  { id: "tx-1", description: "Aluguel", amountCents: 180000, type: "expense", category: "Aluguel", date: "2026-10-05", notes: "Moradia", currency: "BRL", accountId: "account-br" },
  { id: "tx-2", description: "Supermercado", amountCents: 38740, type: "expense", category: "Comida", date: "2026-10-08", notes: "Compras da semana", currency: "BRL", accountId: "account-br" },
  { id: "tx-3", description: "Salário", amountCents: 520000, type: "income", category: "Renda", date: "2026-10-01", notes: "", currency: "BRL", accountId: "account-br" },
  { id: "tx-4", description: "Game novo", amountCents: 12990, type: "expense", category: "Jogos", date: "2026-10-09", notes: "Promoção", currency: "BRL", accountId: "account-br" },
  { id: "tx-5", description: "Academia", amountCents: 4990, type: "expense", category: "Saúde", date: "2026-10-03", notes: "Mensalidade", currency: "AUD", accountId: "account-au" },
  { id: "tx-6", description: "Internet", amountCents: 7990, type: "expense", category: "Contas", date: "2026-10-02", notes: "", currency: "AUD", accountId: "account-au" },
  { id: "tx-7", description: "Freelance", amountCents: 85000, type: "income", category: "Renda", date: "2026-10-06", notes: "Projeto internacional", currency: "USD", accountId: "account-us" },
];

export const seedCalendarEvents: CalendarEvent[] = [
  { id: "event-planning", title: "Planejar a semana", description: "Revisar metas e escolher as três prioridades.", startAt: "2026-10-10T21:00:00Z", endAt: "2026-10-10T21:45:00Z", allDay: false, tag: "Planejamento", color: "#ffd600", completed: false },
  { id: "event-training", title: "Treino de força", description: "Treino A: pernas e mobilidade.", startAt: "2026-10-11T07:00:00Z", endAt: "2026-10-11T08:00:00Z", allDay: false, tag: "Saúde", color: "#2ec4b6", completed: false },
  { id: "event-project", title: "Entrega do projeto", description: "Enviar a versão final para revisão.", startAt: "2026-10-13T13:00:00Z", endAt: "2026-10-13T14:00:00Z", allDay: false, tag: "Trabalho", color: "#7b61ff", completed: false },
  { id: "event-bills", title: "Pagar contas", description: "Aluguel, internet e energia.", startAt: "2026-10-15T00:00:00Z", endAt: "2026-10-15T23:59:00Z", allDay: true, tag: "Finanças", color: "#ff9f1c", completed: false },
  { id: "event-reading", title: "Clube do livro", description: "Debate dos capítulos finais.", startAt: "2026-11-04T19:00:00Z", endAt: "2026-11-04T20:30:00Z", allDay: false, tag: "Estudo", color: "#4d96ff", completed: false },
];

export function useLocalCollection<T>(key: string, seed: T[]) {
  const { userKey } = useAppPreferences();
  const initialSeed = useRef(seed);
  const [items, setItems] = useState<T[]>(initialSeed.current);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `foco:${userKey}:${key}`;

  useEffect(() => {
    try {
      let saved = window.localStorage.getItem(storageKey);
      const legacyOwnerKey = "foco:legacy-storage-owner";
      const legacyOwner = window.localStorage.getItem(legacyOwnerKey);
      if (!saved && (!legacyOwner || legacyOwner === userKey)) {
        const legacy = window.localStorage.getItem(key);
        if (legacy) {
          saved = legacy;
          window.localStorage.setItem(storageKey, legacy);
        }
        if (!legacyOwner) window.localStorage.setItem(legacyOwnerKey, userKey);
      }
      if (saved) setItems(JSON.parse(saved) as T[]);
      else setItems(initialSeed.current);
    } catch { setItems(initialSeed.current); }
    setLoaded(true);
  }, [key, storageKey, userKey]);

  useEffect(() => {
    if (!loaded) return;
    const serialized = JSON.stringify(items);
    if (window.localStorage.getItem(storageKey) === serialized) return;
    window.localStorage.setItem(storageKey, serialized);
    window.dispatchEvent(new CustomEvent("foco:data-changed", { detail: { storageKey, serialized } }));
  }, [items, loaded, storageKey]);

  useEffect(() => {
    function syncCollection(event: Event) {
      const detail = (event as CustomEvent<{ storageKey?: string; serialized?: string }>).detail;
      if (detail?.storageKey !== storageKey || !detail.serialized) return;
      const serialized = detail.serialized;
      setItems((current) => JSON.stringify(current) === serialized ? current : JSON.parse(serialized) as T[]);
    }
    function syncBrowserTabs(event: StorageEvent) {
      const serialized = event.newValue;
      if (event.key !== storageKey || !serialized) return;
      setItems((current) => JSON.stringify(current) === serialized ? current : JSON.parse(serialized) as T[]);
    }
    window.addEventListener("foco:data-changed", syncCollection);
    window.addEventListener("storage", syncBrowserTabs);
    return () => {
      window.removeEventListener("foco:data-changed", syncCollection);
      window.removeEventListener("storage", syncBrowserTabs);
    };
  }, [storageKey]);

  const updateItems = useCallback((next: T[] | ((current: T[]) => T[])) => setItems(next), []);
  return [items, updateItems, loaded] as const;
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatMoney(cents: number, currency: Currency = "BRL") {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100); }
  catch { return `${currency} ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}

export function parseMoney(value: string) {
  const compact = value.replace(/\s/g, "").replace(/^R\$/, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");
  let normalized = compact;
  if (hasComma) normalized = compact.replace(/\./g, "").replace(",", ".");
  else if (hasDot && !/^\d+\.\d{1,2}$/.test(compact)) normalized = compact.replace(/\./g, "");
  return Math.round(Number(normalized) * 100);
}
