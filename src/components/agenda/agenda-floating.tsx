"use client";

import Link from "next/link";
import { useState } from "react";
import { eventsForDate, localDateKey } from "@/lib/agenda/calendar";
import { useLocalCollection, type CalendarEvent } from "@/lib/local-data";

export function AgendaFloating() {
  const [events] = useLocalCollection<CalendarEvent>("foco-calendar-events", []);
  const [open, setOpen] = useState(false);
  const today = eventsForDate(events, localDateKey(new Date()));

  return <aside className="group fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7" aria-label="Agenda de hoje">
    <div className={`absolute bottom-16 right-0 w-[min(22rem,calc(100vw-2.5rem))] origin-bottom-right rounded-3xl border border-white/10 bg-black p-4 text-white shadow-2xl transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Hoje</p><h2 className="mt-1 text-lg font-black">Suas obrigações</h2></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{today.length}</span></div>
      <div className="mt-4 space-y-2">{today.slice(0, 4).map((event) => <div key={event.id} className="rounded-xl bg-white/[0.07] p-3" style={{ borderLeft: `4px solid ${event.color}` }}><p className="text-[10px] font-bold uppercase text-white/35">{event.allDay ? "Dia inteiro" : new Date(event.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {event.tag}</p><p className="mt-1 text-sm font-black">{event.title}</p></div>)}{today.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-white/40">Nenhuma obrigação para hoje.</p>}</div>
      <Link href="/agenda" className="mt-4 flex items-center justify-between rounded-xl bg-[#ffd600] px-4 py-3 text-sm font-black text-black">Abrir agenda completa <span>→</span></Link>
    </div>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd600] text-black shadow-[0_12px_35px_rgba(0,0,0,.3)] transition hover:-translate-y-1" aria-label="Mostrar agenda de hoje">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/></svg>
      {today.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#f6f4ed] bg-black px-1 text-[10px] font-black text-white">{today.length}</span>}
    </button>
  </aside>;
}
