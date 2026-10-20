"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { interpretQuickCapture } from "@/lib/assistant/client";
import type { AssistantAction } from "@/lib/assistant/schema";
import { createId, defaultCurrencies, formatMoney, useLocalCollection, type CalendarEvent, type FinancialAccount, type Note, type Transaction, type UserCurrency } from "@/lib/local-data";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  provider?: string;
  undo?: () => void;
};

const examples = [
  "Gastei R$ 200 no mercado hoje",
  "Criar nota: ideias para o próximo projeto",
  "Agendar treino amanhã às 18h",
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function QuickCapture() {
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: "Escreva como você falaria. Eu organizo a informação no lugar certo." },
  ]);
  const [accounts] = useLocalCollection<FinancialAccount>("foco-financial-accounts", []);
  const [currencyConfigs] = useLocalCollection<UserCurrency>("foco-currencies", defaultCurrencies);
  const [, setTransactions] = useLocalCollection<Transaction>("foco-transactions", []);
  const [, setNotes] = useLocalCollection<Note>("foco-notes", []);
  const [, setEvents] = useLocalCollection<CalendarEvent>("foco-calendar-events", []);
  const inputRef = useRef<HTMLInputElement>(null);
  const currencies = useMemo(() => currencyConfigs.map((item) => item.code), [currencyConfigs]);

  function applyAction(action: AssistantAction): { text: string; undo?: () => void } {
    if (action.kind === "clarification") return { text: action.question };

    if (action.kind === "transaction") {
      const account = accounts.find((item) => item.id === action.accountId && item.currency === action.currency)
        ?? accounts.find((item) => item.currency === action.currency && item.active);
      if (!account) return { text: `Antes, cadastre uma conta em ${action.currency} na página Finanças para eu saber onde lançar o valor.` };
      const id = createId("tx");
      const item: Transaction = { id, description: action.description, amountCents: action.amountCents, type: action.type, category: action.category, date: action.date, notes: action.notes, currency: action.currency, accountId: account.id };
      setTransactions((current) => [item, ...current]);
      return {
        text: `${action.type === "expense" ? "Saída" : "Entrada"} de ${formatMoney(action.amountCents, action.currency)} registrada em ${account.name}, na categoria ${action.category}.`,
        undo: () => setTransactions((current) => current.filter((entry) => entry.id !== id)),
      };
    }

    if (action.kind === "note") {
      const id = createId("note");
      const item: Note = { id, title: action.title, content: action.content, tags: action.tags, links: [], updatedAt: localDateKey(new Date()), isPinned: action.isPinned, isImportant: action.isImportant };
      setNotes((current) => [item, ...current.map((note) => action.isPinned ? { ...note, isPinned: false } : note)]);
      return {
        text: `Nota “${action.title}” criada${action.isPinned ? " e fixada na visão geral" : ""}.`,
        undo: () => setNotes((current) => current.filter((entry) => entry.id !== id)),
      };
    }

    const id = createId("event");
    const item: CalendarEvent = { id, title: action.title, description: action.description, startAt: action.startAt, endAt: action.endAt, allDay: action.allDay, tag: action.tag, color: action.color, completed: false };
    setEvents((current) => [item, ...current]);
    const date = new Date(action.startAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: action.allDay ? undefined : "short" });
    return {
      text: `Compromisso “${action.title}” adicionado para ${date}.`,
      undo: () => setEvents((current) => current.filter((entry) => entry.id !== id)),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = message.trim();
    if (command.length < 2 || pending) return;
    setMessage("");
    setPending(true);
    setChat((current) => [...current, { id: createId("chat-user"), role: "user", text: command }]);
    try {
      const result = await interpretQuickCapture({
        message: command,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        today: localDateKey(new Date()),
        currencies,
        accounts: accounts.filter((account) => account.active).map(({ id, name, currency }) => ({ id, name, currency })),
      });
      const applied = applyAction(result.action);
      setChat((current) => [...current, { id: createId("chat-assistant"), role: "assistant", text: applied.text, provider: result.provider === "gemini" ? "Gemini" : "Demonstração", undo: applied.undo }]);
    } catch (error) {
      setChat((current) => [...current, { id: createId("chat-error"), role: "assistant", text: error instanceof Error ? error.message : "Não foi possível processar o comando." }]);
    } finally {
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function undo(messageId: string, action: () => void) {
    action();
    setChat((current) => current.map((item) => item.id === messageId ? { ...item, text: "Registro desfeito.", undo: undefined } : item));
  }

  return <section className="quick-capture mt-6 overflow-hidden rounded-3xl border border-black/10 bg-[#0c0c0c] text-white shadow-[0_22px_70px_rgba(0,0,0,.12)]">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffd600] text-xl text-black shadow-[0_0_0_6px_rgba(255,214,0,.08)]" aria-hidden="true">✦</span>
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd600]">Captura inteligente</span><span className="mt-1 block text-lg font-black sm:text-xl">Conte o que aconteceu. Eu organizo.</span></span>
      <span className={`text-xl text-white/35 transition ${open ? "rotate-45" : ""}`} aria-hidden="true">+</span>
    </button>

    {open && <div className="border-t border-white/10 px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {chat.slice(-6).map((item) => <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${item.role === "user" ? "rounded-br-md bg-[#ffd600] font-semibold text-black" : "rounded-bl-md border border-white/10 bg-white/[0.07] text-white/75"}`}>
            <p>{item.text}</p>
            {(item.provider || item.undo) && <div className="mt-2 flex items-center gap-3 border-t border-current/10 pt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-65">{item.provider && <span>{item.provider}</span>}{item.undo && <button type="button" onClick={() => undo(item.id, item.undo!)} className="text-[#ffd600] hover:underline">Desfazer</button>}</div>}
          </div>
        </div>)}
        {pending && <div className="flex justify-start"><div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-4" aria-label="Interpretando comando"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600]"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600] [animation-delay:120ms]"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600] [animation-delay:240ms]"/></div></div>}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2 rounded-2xl border border-white/15 bg-white/[0.06] p-2 focus-within:border-[#ffd600]/70 focus-within:ring-2 focus-within:ring-[#ffd600]/15">
        <label htmlFor="quick-capture-command" className="sr-only">Digite o que deseja adicionar</label>
        <input ref={inputRef} id="quick-capture-command" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="Ex.: gastei R$ 200 no mercado hoje" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button type="submit" disabled={pending || message.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffd600] font-black text-black disabled:cursor-not-allowed disabled:opacity-35" aria-label="Enviar comando">↑</button>
      </form>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Exemplos de comandos">
        {examples.map((example) => <button key={example} type="button" onClick={() => { setMessage(example); inputRef.current?.focus(); }} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/45 transition hover:border-[#ffd600]/50 hover:text-white">{example}</button>)}
      </div>
      {accounts.length === 0 && <p className="mt-3 text-[11px] text-white/35">Para registrar valores, primeiro <Link href="/financas" className="font-bold text-[#ffd600] underline underline-offset-2">cadastre uma conta financeira</Link>.</p>}
    </div>}
  </section>;
}
