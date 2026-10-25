"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { daysFrom, eventsForDate, localDateKey, monthGrid, periodLabel, shiftPeriod, startOfWeek, type CalendarView } from "@/lib/agenda/calendar";
import { createId, useLocalCollection, type CalendarEvent } from "@/lib/local-data";

const views: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Dia" }, { value: "week", label: "Semana" }, { value: "month", label: "Mês" }, { value: "year", label: "Ano" },
];
const tagColors: Record<string, string> = { Planejamento: "#ffd600", Trabalho: "#7b61ff", Saúde: "#2ec4b6", Finanças: "#ff9f1c", Estudo: "#4d96ff", Pessoal: "#ff6b6b" };

export function AgendaView() {
  const [events, setEvents] = useLocalCollection<CalendarEvent>("foco-calendar-events", []);
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tagFilter, setTagFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const filteredEvents = useMemo(() => events.filter((event) => (tagFilter === "Todas" || event.tag === tagFilter) && `${event.title} ${event.description} ${event.tag}`.toLowerCase().includes(search.toLowerCase())), [events, search, tagFilter]);
  const tags = Array.from(new Set(events.map((event) => event.tag))).sort();

  function openEvent(event?: CalendarEvent, dateKey?: string) {
    setEditing(event ?? (dateKey ? { id: "", title: "", description: "", startAt: `${dateKey}T09:00:00`, endAt: `${dateKey}T10:00:00`, allDay: false, tag: "Pessoal", color: tagColors.Pessoal, completed: false } : null));
    setOpen(true);
  }

  function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date"));
    const allDay = data.get("allDay") === "on";
    const startTime = allDay ? "00:00" : String(data.get("startTime"));
    const endTime = allDay ? "23:59" : String(data.get("endTime"));
    const tag = String(data.get("tag"));
    const item: CalendarEvent = {
      id: editing?.id || createId("event"), title: String(data.get("title")), description: String(data.get("description")),
      startAt: new Date(`${date}T${startTime}:00`).toISOString(), endAt: new Date(`${date}T${endTime}:00`).toISOString(),
      allDay, tag, color: String(data.get("color")) || tagColors[tag] || "#ffd600", completed: editing?.completed ?? false,
    };
    setEvents((current) => editing?.id ? current.map((entry) => entry.id === editing.id ? item : entry) : [item, ...current]);
    setOpen(false);
  }

  function chooseDate(date: Date, nextView: CalendarView = "day") { setCurrentDate(date); setView(nextView); }
  const selectedKey = localDateKey(currentDate);

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Tempo e compromissos" title="Agenda" description="Organize suas obrigações por etiquetas e veja o calendário por dia, semana, mês ou ano." action={<button type="button" onClick={() => openEvent(undefined, selectedKey)} className={primaryButtonClass}>+ Novo compromisso</button>} />

    <div className="foco-panel mt-6 p-3"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => setCurrentDate(shiftPeriod(currentDate, view, -1))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] font-black" aria-label="Período anterior">←</button><button type="button" onClick={() => setCurrentDate(new Date())} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold">Hoje</button><button type="button" onClick={() => setCurrentDate(shiftPeriod(currentDate, view, 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] font-black" aria-label="Próximo período">→</button><h2 className="ml-2 text-lg font-black capitalize sm:text-xl">{periodLabel(currentDate, view)}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} sm:w-52`} type="search" placeholder="Buscar compromissos..."/><select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className={fieldClass}><option>Todas</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}</select><div className="flex rounded-xl bg-[var(--surface-soft)] p-1">{views.map((item) => <button key={item.value} type="button" onClick={() => setView(item.value)} aria-pressed={view === item.value} className={`rounded-lg px-4 py-2 text-xs font-black ${view === item.value ? "bg-[#ffd600] text-black" : "text-[var(--muted)]"}`}>{item.label}</button>)}</div></div></div></div>

    <section className="mt-5">
      {view === "day" && <DayView date={currentDate} events={filteredEvents} onEdit={openEvent} />}
      {view === "week" && <WeekView date={currentDate} events={filteredEvents} onEdit={openEvent} onChoose={chooseDate} />}
      {view === "month" && <div className="grid gap-5 xl:grid-cols-[1fr_290px]"><MonthView date={currentDate} events={filteredEvents} onEdit={openEvent} onChoose={(day) => setCurrentDate(day)} /><DaySidebar date={currentDate} events={filteredEvents} onEdit={openEvent} onCreate={() => openEvent(undefined, selectedKey)} /></div>}
      {view === "year" && <YearView date={currentDate} events={filteredEvents} onChoose={chooseDate} />}
    </section>

    <Modal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Editar compromisso" : "Novo compromisso"} description="Horários são exibidos no seu fuso e armazenados em UTC."><EventForm event={editing} onSubmit={saveEvent} onCancel={() => setOpen(false)} onDelete={editing?.id ? () => { setEvents((items) => items.filter((item) => item.id !== editing.id)); setOpen(false); } : undefined} /></Modal>
  </div>;
}

function EventForm({ event, onSubmit, onCancel, onDelete }: { event: CalendarEvent | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; onDelete?: () => void }) {
  const start = event ? new Date(event.startAt) : new Date();
  const end = event ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const timeValue = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Título"><input className={fieldClass} name="title" required defaultValue={event?.title} placeholder="Ex.: Consulta, reunião, treino..." /></Field></div><Field label="Data"><input className={fieldClass} type="date" name="date" required defaultValue={localDateKey(start)} /></Field><Field label="Etiqueta"><input className={fieldClass} name="tag" required list="agenda-tags" defaultValue={event?.tag ?? "Pessoal"} /><datalist id="agenda-tags">{Object.keys(tagColors).map((tag) => <option key={tag}>{tag}</option>)}</datalist></Field><Field label="Início"><input className={fieldClass} type="time" name="startTime" required defaultValue={timeValue(start)} /></Field><Field label="Fim"><input className={fieldClass} type="time" name="endTime" required defaultValue={timeValue(end)} /></Field><Field label="Cor da etiqueta"><input className={`${fieldClass} h-12 p-2`} type="color" name="color" defaultValue={event?.color ?? "#ffd600"} /></Field><label className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold"><input type="checkbox" name="allDay" defaultChecked={event?.allDay} className="h-5 w-5 accent-black" />Dia inteiro</label><div className="sm:col-span-2"><Field label="Descrição"><textarea className={`${fieldClass} min-h-24 resize-y`} name="description" defaultValue={event?.description} placeholder="Detalhes, endereço ou preparação necessária..." /></Field></div><div className="flex items-center justify-between border-t border-black/10 pt-5 sm:col-span-2">{onDelete ? <button type="button" onClick={onDelete} className="text-sm font-bold text-red-700">Excluir</button> : <span/>}<div className="flex gap-3"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar</button></div></div></form>;
}

function EventCard({ event, compact = false, onEdit }: { event: CalendarEvent; compact?: boolean; onEdit: (event: CalendarEvent) => void }) {
  const time = event.allDay ? "Dia inteiro" : new Date(event.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return <button type="button" onClick={() => onEdit(event)} className={`w-full rounded-xl border border-black/10 bg-white text-left transition hover:-translate-y-0.5 ${compact ? "p-2" : "p-4"}`} style={{ borderLeftWidth: 6, borderLeftColor: event.color }}><p className={`${compact ? "text-[10px]" : "text-xs"} font-black uppercase tracking-wider text-black/35`}>{time} · {event.tag}</p><p className={`${compact ? "mt-1 truncate text-xs" : "mt-2 text-base"} font-black`}>{event.title}</p>{!compact && event.description && <p className="mt-2 text-sm text-black/45">{event.description}</p>}</button>;
}

function DayView({ date, events, onEdit }: { date: Date; events: CalendarEvent[]; onEdit: (event: CalendarEvent) => void }) {
  const items = eventsForDate(events, localDateKey(date));
  return <div className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[0.16em] text-black/35">Obrigações do dia</p><div className="mt-5 space-y-3">{items.map((event) => <EventCard key={event.id} event={event} onEdit={onEdit} />)}{items.length === 0 && <EmptyState />}</div></div>;
}

function WeekView({ date, events, onEdit, onChoose }: { date: Date; events: CalendarEvent[]; onEdit: (event: CalendarEvent) => void; onChoose: (date: Date) => void }) {
  const days = daysFrom(startOfWeek(date), 7);
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">{days.map((day) => { const items = eventsForDate(events, localDateKey(day)); const today = localDateKey(day) === localDateKey(new Date()); return <article key={localDateKey(day)} className={`min-h-48 rounded-2xl border p-3 ${today ? "border-[#ffd600] bg-[#fffbea]" : "border-black/10 bg-white"}`}><button type="button" onClick={() => onChoose(day)} className="mb-3 w-full text-left"><p className="text-[10px] font-black uppercase text-black/35">{day.toLocaleDateString("pt-BR", { weekday: "short" })}</p><p className="mt-1 text-2xl font-black">{day.getDate()}</p></button><div className="space-y-2">{items.map((event) => <EventCard key={event.id} event={event} compact onEdit={onEdit} />)}</div></article>; })}</div>;
}

function MonthView({ date, events, onEdit, onChoose }: { date: Date; events: CalendarEvent[]; onEdit: (event: CalendarEvent) => void; onChoose: (date: Date) => void }) {
  const days = monthGrid(date);
  return <div className="overflow-hidden rounded-3xl border border-black/10 bg-white"><div className="grid grid-cols-7 border-b border-black/10 bg-black text-white">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <div key={day} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const items = eventsForDate(events, localDateKey(day)); const outside = day.getMonth() !== date.getMonth(); const today = localDateKey(day) === localDateKey(new Date()); return <article key={localDateKey(day)} className={`min-h-24 border-b border-r border-black/[0.07] p-1.5 sm:min-h-32 sm:p-2 ${outside ? "bg-black/[0.025] text-black/25" : "bg-white"}`}><button type="button" onClick={() => onChoose(day)} className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${today ? "bg-[#ffd600] text-black" : ""}`}>{day.getDate()}</button><div className="mt-1 space-y-1">{items.slice(0, 3).map((event) => <button type="button" onClick={() => onEdit(event)} key={event.id} className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] font-bold sm:text-[10px]" style={{ backgroundColor: `${event.color}33`, borderLeft: `3px solid ${event.color}` }}>{event.title}</button>)}{items.length > 3 && <button type="button" onClick={() => onChoose(day)} className="text-[9px] font-black text-black/35">+{items.length - 3} mais</button>}</div></article>; })}</div></div>;
}

function YearView({ date, events, onChoose }: { date: Date; events: CalendarEvent[]; onChoose: (date: Date, view?: CalendarView) => void }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 12 }, (_, month) => { const monthDate = new Date(date.getFullYear(), month, 1, 12); const days = monthGrid(monthDate); return <article key={month} className="rounded-2xl border border-black/10 bg-white p-4"><button type="button" onClick={() => onChoose(monthDate, "month")} className="text-base font-black capitalize">{monthDate.toLocaleDateString("pt-BR", { month: "long" })}</button><div className="mt-3 grid grid-cols-7 gap-1">{["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => <span key={`${label}-${index}`} className="text-center text-[8px] font-black text-black/30">{label}</span>)}{days.map((day) => { const count = eventsForDate(events, localDateKey(day)).length; const outside = day.getMonth() !== month; return <button type="button" key={localDateKey(day)} onClick={() => onChoose(day)} className={`relative grid aspect-square place-items-center rounded-md text-[9px] font-bold ${outside ? "text-black/15" : "hover:bg-[#fff5b3]"}`}>{day.getDate()}{count > 0 && !outside && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#ffd600]" />}</button>; })}</div></article>; })}</div>;
}

function EmptyState() { return <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center"><p className="text-3xl">✓</p><p className="mt-2 text-sm font-bold">Nenhuma obrigação neste dia.</p><p className="mt-1 text-xs text-black/40">Use este espaço para descansar ou adiantar uma prioridade.</p></div>; }

function DaySidebar({ date, events, onEdit, onCreate }: { date: Date; events: CalendarEvent[]; onEdit: (event: CalendarEvent) => void; onCreate: () => void }) {
  const items = eventsForDate(events, localDateKey(date));
  const monthItems = events.filter((event) => { const eventDate = new Date(event.startAt); return eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear(); });
  return <aside className="space-y-4"><div className="foco-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Compromissos do dia</p><h3 className="mt-1 text-lg font-black capitalize">{date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3></div><button type="button" onClick={onCreate} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffd600] font-black text-black" aria-label="Novo compromisso neste dia">+</button></div><div className="mt-4 space-y-2">{items.map((event) => <EventCard key={event.id} event={event} compact onEdit={onEdit} />)}{items.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted)]">Nenhum compromisso neste dia.</p>}</div></div><div className="foco-panel p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Resumo do mês</p><p className="mt-3 text-3xl font-black">{monthItems.length}</p><p className="text-xs text-[var(--muted)]">compromissos registrados</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#ffd600]" style={{ width: `${monthItems.length ? Math.round(monthItems.filter((event) => event.completed).length / monthItems.length * 100) : 0}%` }} /></div></div></aside>;
}
