"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  "Me lembra da consulta amanhã às 9h",
  "Agendar reunião sexta das 14h às 15h",
];

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [review, setReview] = useState<{ action: AssistantAction; provider: string; summary: string } | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: "Escreva como você falaria. Eu organizo a informação no lugar certo." },
  ]);
  const [accounts] = useLocalCollection<FinancialAccount>("foco-financial-accounts", []);
  const [currencyConfigs] = useLocalCollection<UserCurrency>("foco-currencies", defaultCurrencies);
  const [, setTransactions] = useLocalCollection<Transaction>("foco-transactions", []);
  const [, setNotes] = useLocalCollection<Note>("foco-notes", []);
  const [, setEvents] = useLocalCollection<CalendarEvent>("foco-calendar-events", []);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const spokenCommandRef = useRef("");
  const currencies = useMemo(() => currencyConfigs.map((item) => item.code), [currencyConfigs]);

  useEffect(() => {
    setMounted(true);
    return () => recognitionRef.current?.abort();
  }, []);

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

  function summarizeAction(action: AssistantAction) {
    if (action.kind === "transaction") return `${action.type === "expense" ? "Saída" : "Entrada"} · ${formatMoney(action.amountCents, action.currency)} · ${action.category} · ${new Date(`${action.date}T12:00:00`).toLocaleDateString("pt-BR")}`;
    if (action.kind === "note") return `Nota · ${action.title}${action.isPinned ? " · fixada" : ""}${action.isImportant ? " · importante" : ""}`;
    if (action.kind === "event") {
      const start = new Date(action.startAt);
      if (action.allDay) return `Agenda · ${action.title} · ${start.toLocaleDateString("pt-BR")} · dia inteiro`;
      const end = new Date(action.endAt);
      return `Agenda · ${action.title} · ${start.toLocaleDateString("pt-BR")} · ${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return action.question;
  }

  function confirmReview() {
    if (!review) return;
    const applied = applyAction(review.action);
    setChat((current) => [...current, { id: createId("chat-assistant"), role: "assistant", text: applied.text, provider: review.provider, undo: applied.undo }]);
    setReview(null);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function runCommand(rawCommand: string) {
    const command = rawCommand.trim();
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
      const provider = result.provider === "gemini" ? "Gemini" : "Demonstração";
      const action = result.action;
      if (action.kind === "clarification") {
        setChat((current) => [...current, { id: createId("chat-assistant"), role: "assistant", text: action.question, provider }]);
      } else {
        setReview({ action, provider, summary: summarizeAction(action) });
      }
    } catch (error) {
      setChat((current) => [...current, { id: createId("chat-error"), role: "assistant", text: error instanceof Error ? error.message : "Não foi possível processar o comando." }]);
    } finally {
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCommand(message);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("O reconhecimento de voz não está disponível neste navegador. Digite o comando normalmente.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    spokenCommandRef.current = "";
    setVoiceError("");
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      spokenCommandRef.current = transcript;
      setMessage(transcript);
    };
    recognition.onerror = (event) => {
      const errorMessage = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Permita o uso do microfone para enviar comandos por voz."
        : event.error === "no-speech"
          ? "Não consegui ouvir. Toque no microfone e tente novamente."
          : "Não foi possível reconhecer sua voz agora.";
      setVoiceError(errorMessage);
      spokenCommandRef.current = "";
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const spokenCommand = spokenCommandRef.current.trim();
      spokenCommandRef.current = "";
      if (spokenCommand.length >= 2) void runCommand(spokenCommand);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function undo(messageId: string, action: () => void) {
    action();
    setChat((current) => current.map((item) => item.id === messageId ? { ...item, text: "Registro desfeito.", undo: undefined } : item));
  }

  if (!mounted) return null;

  return createPortal(<aside className="quick-capture group fixed bottom-5 right-24 z-[60] sm:bottom-7 sm:right-28" aria-label="Captura inteligente">
    <div className={`fixed bottom-24 right-5 w-[min(25rem,calc(100vw-2.5rem))] origin-bottom-right overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c] text-white shadow-[0_24px_80px_rgba(0,0,0,.34)] transition duration-200 sm:bottom-24 sm:right-7 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffd600] text-black" aria-hidden="true">✦</span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd600]">Captura inteligente</p><h2 className="mt-0.5 truncate text-base font-black">Conte. Eu organizo.</h2></div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-xl text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="Fechar captura inteligente">×</button>
      </div>

      <div className="px-4 pb-4 pt-3">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {chat.slice(-6).map((item) => <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${item.role === "user" ? "rounded-br-md bg-[#ffd600] font-semibold text-black" : "rounded-bl-md border border-white/10 bg-white/[0.07] text-white/75"}`}>
            <p>{item.text}</p>
            {(item.provider || item.undo) && <div className="mt-2 flex items-center gap-3 border-t border-current/10 pt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-65">{item.provider && <span>{item.provider}</span>}{item.undo && <button type="button" onClick={() => undo(item.id, item.undo!)} className="text-[#ffd600] hover:underline">Desfazer</button>}</div>}
          </div>
        </div>)}
        {pending && <div className="flex justify-start"><div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-4" aria-label="Interpretando comando"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600]"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600] [animation-delay:120ms]"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd600] [animation-delay:240ms]"/></div></div>}
      </div>

      {review && <div className="mt-4 rounded-2xl border border-[#ffd600]/35 bg-[#ffd600]/10 p-4" role="region" aria-label="Revisar registro"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Revisar antes de salvar</p><p className="mt-2 text-sm font-bold leading-relaxed text-white">{review.summary}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setReview(null)} className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/65">Cancelar</button><button type="button" onClick={confirmReview} className="flex-1 rounded-xl bg-[#ffd600] px-3 py-2 text-xs font-black text-black">Confirmar</button></div></div>}

      <form onSubmit={submit} className={`mt-4 flex gap-2 rounded-2xl border bg-white/[0.06] p-2 transition focus-within:ring-2 ${listening ? "border-[#ffd600] ring-2 ring-[#ffd600]/20" : "border-white/15 focus-within:border-[#ffd600]/70 focus-within:ring-[#ffd600]/15"}`}>
        <label htmlFor="quick-capture-command" className="sr-only">Digite o que deseja adicionar</label>
        <input ref={inputRef} id="quick-capture-command" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder={listening ? "Estou ouvindo…" : "Ex.: gastei R$ 200 no mercado hoje"} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button type="button" onClick={toggleVoice} disabled={pending} aria-pressed={listening} className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl transition disabled:opacity-35 ${listening ? "bg-red-500 text-white" : "bg-white/10 text-white/65 hover:bg-white/15 hover:text-white"}`} aria-label={listening ? "Parar gravação e enviar" : "Enviar comando por voz"} title={listening ? "Parar e enviar" : "Falar comando"}>
          {listening && <span className="absolute inset-0 animate-ping rounded-xl bg-red-500/35" />}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>
        </button>
        <button type="submit" disabled={pending || review !== null || message.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffd600] font-black text-black disabled:cursor-not-allowed disabled:opacity-35" aria-label="Enviar comando">↑</button>
      </form>

      {listening && <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#ffd600]"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500"/>Ouvindo… fale o comando. Toque novamente para enviar.</p>}
      {voiceError && <p className="mt-2 text-[11px] font-semibold text-red-300" role="alert">{voiceError}</p>}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Exemplos de comandos">
        {examples.map((example) => <button key={example} type="button" onClick={() => { setMessage(example); inputRef.current?.focus(); }} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/45 transition hover:border-[#ffd600]/50 hover:text-white">{example}</button>)}
      </div>
      {accounts.length === 0 && <p className="mt-3 text-[11px] text-white/35">Para registrar valores, primeiro <Link href="/financas" className="font-bold text-[#ffd600] underline underline-offset-2">cadastre uma conta financeira</Link>.</p>}
      </div>
    </div>

    <span className="pointer-events-none absolute bottom-1/2 right-16 hidden translate-y-1/2 whitespace-nowrap rounded-lg bg-black px-3 py-2 text-[11px] font-black text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">Captura inteligente</span>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd600] text-black shadow-[0_12px_35px_rgba(0,0,0,.3)] transition hover:-translate-y-1" aria-label="Abrir captura inteligente">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="m9 8 .6 1.4L11 10l-1.4.6L9 12l-.6-1.4L7 10l1.4-.6L9 8ZM15 11l.5 1.1 1.1.5-1.1.5L15 14l-.5-.9-1.1-.5 1.1-.5L15 11Z"/></svg>
      {pending && <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border-2 border-[#f6f4ed] bg-black" />}
    </button>
  </aside>, document.body);
}
