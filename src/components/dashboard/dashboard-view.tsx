"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgendaFloating } from "@/components/agenda/agenda-floating";
import { QuickCapture } from "@/components/dashboard/quick-capture";
import { BrainGraph } from "@/components/notas/brain-graph";
import { convertNetWorth, type CurrencyBalances, type ExchangeRates } from "@/lib/financas/exchange";
import { calculateAccumulatedTotal } from "@/lib/financas/summary";
import { getDashboardGoals } from "@/lib/metas/goals";
import { getPinnedNote } from "@/lib/notas/notes";
import { useGamification } from "@/lib/gamification";
import { formatMoney, defaultCurrencies, useLocalCollection, type Currency, type FinancialAccount, type Goal, type Habit, type Note, type Transaction, type UserCurrency } from "@/lib/local-data";
import { useAppPreferences } from "@/lib/app-preferences";

const bars = [0, 0, 0, 0, 0, 0, 0];

type ExchangeResponse = { date: string; rates: ExchangeRates; source: string };
type FrankfurterRate = { date: string; quote: string; rate: number };

async function loadExchangeRates(currencyQuery: string): Promise<ExchangeResponse> {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES !== "true") {
    const response = await fetch(`/api/exchange-rates?currencies=${encodeURIComponent(currencyQuery)}`);
    if (!response.ok) throw new Error("exchange_unavailable");
    return response.json() as Promise<ExchangeResponse>;
  }

  const currencies = currencyQuery.split(",").filter(Boolean);
  const quotes = currencies.filter((currency) => currency !== "EUR");
  const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=EUR&quotes=${encodeURIComponent(quotes.join(","))}`);
  if (!response.ok) throw new Error("exchange_unavailable");
  const data = await response.json() as FrankfurterRate[];
  const rates = Object.fromEntries(data.map((item) => [item.quote.toUpperCase(), item.rate])) as ExchangeRates;
  rates.EUR = 1;
  if (!currencies.every((currency) => Number.isFinite(rates[currency]) && rates[currency] > 0)) throw new Error("invalid_exchange_rates");
  return { date: data[0]?.date ?? new Date().toISOString().slice(0, 10), rates, source: "Frankfurter" };
}

export function DashboardView() {
  const { userKey } = useAppPreferences();
  const [habits, setHabits] = useLocalCollection<Habit>("foco-habits", []);
  const [notes] = useLocalCollection<Note>("foco-notes", []);
  const [goals] = useLocalCollection<Goal>("foco-goals", []);
  const [transactions] = useLocalCollection<Transaction>("foco-transactions", []);
  const [accounts] = useLocalCollection<FinancialAccount>("foco-financial-accounts", []);
  const [currencyConfigs] = useLocalCollection<UserCurrency>("foco-currencies", defaultCurrencies);
  const currencies = useMemo(() => currencyConfigs.map((item) => item.code), [currencyConfigs]);
  const currencyQuery = currencies.join(",");
  const [netWorthCurrency, setNetWorthCurrency] = useState<Currency>("AUD");
  const [exchange, setExchange] = useState<ExchangeResponse | null>(null);
  const [exchangeError, setExchangeError] = useState(false);
  const { balance: pointsBalance, awardPoints } = useGamification();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isCompleted = (habit: Habit) => habit.completedDates?.includes(today) ?? habit.completed;
  const completed = habits.filter(isCompleted).length;
  const progress = habits.length ? Math.round(completed / habits.length * 100) : 0;
  const date = useMemo(() => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()), []);
  const normalizedTransactions = useMemo(() => transactions.map((item) => ({ ...item, currency: item.currency ?? "BRL", accountId: item.accountId ?? "account-br" })), [transactions]);
  const balances = useMemo(() => Object.fromEntries(currencies.map((currency) => [currency, calculateAccumulatedTotal(accounts, normalizedTransactions, currency)])) as CurrencyBalances, [accounts, currencies, normalizedTransactions]);
  const consolidatedNetWorth = exchange ? convertNetWorth(balances, netWorthCurrency, exchange.rates) : null;
  const featuredGoals = getDashboardGoals(goals);
  const pinnedNote = getPinnedNote(notes);

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(`foco:${userKey}:net-worth-currency`) as Currency | null;
    if (savedCurrency && currencies.includes(savedCurrency)) setNetWorthCurrency(savedCurrency);
    else if (currencies.length > 0) setNetWorthCurrency(currencies[0]);
    if (!currencyQuery) return;
    loadExchangeRates(currencyQuery)
      .then((data) => setExchange(data))
      .catch(() => setExchangeError(true));
  }, [currencies, currencyQuery, userKey]);

  function selectNetWorthCurrency(currency: Currency) {
    setNetWorthCurrency(currency);
    window.localStorage.setItem(`foco:${userKey}:net-worth-currency`, currency);
  }

  function toggleHabit(id: string) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const done = isCompleted(habit);
    setHabits((current) => current.map((item) => item.id === id ? { ...item, completed: !done, completedDates: done ? (item.completedDates ?? []).filter((date) => date !== today) : Array.from(new Set([...(item.completedDates ?? []), today])) } : item));
    if (!done) awardPoints(habit.pointsReward ?? 10, "habit_completion", `${habit.id}:${today}`, `Hábito concluído: ${habit.name}`);
  }

  return <div className="mx-auto max-w-[1440px]">
    <header className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">{date}</p><h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Olá, vamos focar?</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-black/55 sm:text-base">Aqui está o que importa hoje. Um passo de cada vez.</p></div>
      <Link href="/habitos" className="inline-flex w-fit items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black/80">+ Novo hábito</Link>
    </header>

    <PriorityGoals goals={goals} featuredGoals={featuredGoals} />

    <QuickCapture />

    <section aria-label="Resumo do dia" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Hábitos concluídos" value={`${completed}/${habits.length}`} note={`${progress}% da meta diária`} accent />
      <Metric label="Sequência atual" value={`${Math.max(0, ...habits.map((habit) => habit.streak))} dias`} note="Maior sequência ativa" />
      <Metric label="Metas em andamento" value={String(goals.length)} note="Acompanhe seus objetivos" />
      <Metric label="Carteira de pontos" value={`${pointsBalance} pts`} note="Use em recompensas" />
    </section>

    <section className="mt-4 overflow-hidden rounded-3xl bg-black text-white">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">Patrimônio total convertido</p><p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{consolidatedNetWorth === null ? "—" : formatMoney(consolidatedNetWorth, netWorthCurrency)}</p><p className="mt-3 text-xs text-white/45">{exchange ? `Saldos de AUD, BRL e USD convertidos pela cotação de ${new Date(`${exchange.date}T12:00:00`).toLocaleDateString("pt-BR")}.` : exchangeError ? "Cotação indisponível. Seus saldos individuais continuam disponíveis abaixo." : "Atualizando a cotação mais recente…"}</p></div>
        <div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Exibir patrimônio em</p><div className="flex rounded-xl bg-white/10 p-1">{currencies.map((currency) => <button key={currency} type="button" onClick={() => selectNetWorthCurrency(currency)} aria-pressed={netWorthCurrency === currency} className={`rounded-lg px-4 py-2 text-xs font-black transition ${netWorthCurrency === currency ? "bg-[#ffd600] text-black" : "text-white/55 hover:text-white"}`}>{currency}</button>)}</div></div>
      </div>
      <div className="grid border-t border-white/10 sm:grid-cols-3">{currencies.map((currency) => <Link href="/financas" key={currency} className="flex items-center justify-between border-white/10 px-5 py-4 transition hover:bg-white/5 sm:border-r sm:last:border-r-0"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">Saldo em {currency}</p><p className="mt-1 text-lg font-black">{formatMoney(balances[currency], currency)}</p></div><span className="text-white/20">→</span></Link>)}</div>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between border-b border-black/10 p-5 sm:p-6"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">Rotina de hoje</p><h2 className="mt-1 text-xl font-black">Seus hábitos</h2></div><div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffd600] text-sm font-black">{progress}%</div></div>
        <div className="divide-y divide-black/[0.07]">{habits.slice(0, 5).map((habit) => { const done = isCompleted(habit); return <button key={habit.id} type="button" onClick={() => toggleHabit(habit.id)} aria-pressed={done} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#fffbea] sm:px-6"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${done ? "border-[#ffd600] bg-[#ffd600]" : "border-black/20 group-hover:border-black"}`}>{done && <span aria-hidden="true" className="text-sm font-black">✓</span>}</span><span className="min-w-0 flex-1"><span className={`block text-sm font-bold ${done ? "text-black/35 line-through" : "text-black"}`}>{habit.name}</span><span className="mt-0.5 block text-xs text-black/40">{habit.target} {habit.unit} · {habit.frequency}</span></span><span aria-hidden="true" className="text-black/20">→</span></button>; })}</div>
        <div className="bg-[#faf9f4] px-5 py-4 sm:px-6"><Link href="/habitos" className="text-sm font-bold underline decoration-[#ffd600] decoration-4 underline-offset-4">Gerenciar hábitos</Link></div>
      </section>

      <section className="page-grid rounded-3xl bg-[#ffd600] p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">Ritmo semanal</p><h2 className="mt-1 text-xl font-black">Consistência</h2></div><span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">Esta semana</span></div><div className="mt-10 flex h-44 items-end justify-between gap-2" aria-label="Gráfico de consistência semanal">{bars.map((height, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="relative flex-1"><div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-black" style={{ height: `${height}%` }} /></div><span className="text-center text-[10px] font-black">{["S", "T", "Q", "Q", "S", "S", "D"][index]}</span></div>)}</div><p className="mt-6 border-t border-black/15 pt-4 text-sm font-semibold"><span className="text-2xl font-black">+14%</span><br/><span className="text-black/55">mais consistente que na semana passada</span></p></section>
    </div>

    <div className="mt-6">
      {pinnedNote && <section className="rounded-3xl border border-black/10 bg-[#ffd600] p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">{pinnedNote.isPinned ? "● Nota fixada" : "Nota recente"}</p><h2 className="mt-3 text-xl font-black leading-tight">{pinnedNote.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-black/60">{pinnedNote.content}</p><Link href="/notas" className="mt-8 inline-block text-sm font-black underline decoration-black decoration-2 underline-offset-4">Abrir notas</Link></section>}
    </div>

    <section className="mt-6 rounded-3xl bg-black p-5 text-white sm:p-7"><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">Brain</p><h2 className="mt-1 text-2xl font-black">Suas ideias interligadas</h2><p className="mt-2 text-sm text-white/45">Explore as relações entre notas, assuntos e projetos.</p></div><Link href="/notas#brain" className="text-sm font-bold text-[#ffd600]">Abrir Brain completo →</Link></div><BrainGraph notes={notes} compact /></section>
    <AgendaFloating />
  </div>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article className={`rounded-2xl border border-black/10 p-5 ${accent ? "bg-[#ffd600]" : "bg-white"}`}><p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">{label}</p><p className="mt-3 text-3xl font-black tracking-tight">{value}</p><p className="mt-2 text-xs font-medium text-black/45">{note}</p></article>; }

function PriorityGoals({ goals, featuredGoals }: { goals: Goal[]; featuredGoals: Goal[] }) {
  if (featuredGoals.length === 0) return null;
  return <section className="mt-6 overflow-hidden rounded-3xl bg-black text-white"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">★ Prioridades</p><h2 className="mt-1 text-xl font-black">{goals.some((goal) => goal.isImportant) ? "Metas importantes" : "Meta em destaque"}</h2></div><Link href="/metas" className="text-xs font-bold text-[#ffd600]">Gerenciar →</Link></div><div className="grid sm:grid-cols-2 xl:grid-cols-3">{featuredGoals.map((goal) => { const progress = Math.min(100, Math.round(goal.current / goal.target * 100)); return <article key={goal.id} className="border-white/10 p-5 sm:border-r sm:p-6 sm:last:border-r-0"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-white/40">{goal.category}</p><h3 className="mt-1 text-xl font-black">{goal.title}</h3></div><span className="text-xl text-[#ffd600]">★</span></div><div className="mt-5 flex items-end justify-between gap-4"><p className="text-xl font-black">{goal.current.toLocaleString("pt-BR")} <span className="text-xs font-medium text-white/35">/ {goal.target.toLocaleString("pt-BR")}</span></p><p className="text-xs font-black text-[#ffd600]">{progress}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffd600]" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-[11px] text-white/45"><span>Faltam {Math.max(0, goal.target - goal.current).toLocaleString("pt-BR")}</span><span>{new Date(`${goal.deadline}T12:00:00`).toLocaleDateString("pt-BR")}</span></div></article>; })}</div></section>;
}
