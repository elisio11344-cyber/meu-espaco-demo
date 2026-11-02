"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Field, Modal, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { formatPlanningAmount } from "@/components/planejamentos/planning-view";
import { createId, useLocalCollection } from "@/lib/local-data";
import { actualForPeriod, calculatePlanningSummary, getCurrentPeriod, plannedForPeriod } from "@/lib/planejamentos/engine";
import { planningEntrySchema } from "@/lib/planejamentos/schema";
import type { Planning, PlanningEntry, PlanningPeriod, PlanningSource } from "@/lib/planejamentos/types";

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function PlanningWidget() {
  const [plannings] = useLocalCollection<Planning>("foco-plannings", []);
  const [sources] = useLocalCollection<PlanningSource>("foco-planning-sources", []);
  const [periods] = useLocalCollection<PlanningPeriod>("foco-planning-periods", []);
  const [entries, setEntries] = useLocalCollection<PlanningEntry>("foco-planning-entries", []);
  const active = useMemo(() => plannings.filter((item) => item.status === "active"), [plannings]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [entrySource, setEntrySource] = useState<string | null>(null);
  const today = todayKey();
  const selected = active.find((item) => item.id === selectedId)
    ?? active.find((item) => item.favorite)
    ?? active[0];
  const planningPeriods = useMemo(() => periods.filter((item) => item.planningId === selected?.id), [periods, selected?.id]);
  const planningEntries = useMemo(() => entries.filter((item) => item.planningId === selected?.id), [entries, selected?.id]);
  const planningSources = useMemo(() => sources.filter((item) => item.planningId === selected?.id && item.active), [sources, selected?.id]);
  const currentIndex = Math.max(0, planningPeriods.findIndex((item) => item.id === getCurrentPeriod(planningPeriods, today)?.id));
  const periodIndex = Math.min(planningPeriods.length - 1, Math.max(0, currentIndex + periodOffset));
  const period = planningPeriods[periodIndex] ?? null;
  const summary = selected ? calculatePlanningSummary(selected, planningPeriods, planningEntries, today) : null;

  function changePlanning(id: string) {
    setSelectedId(id);
    setPeriodOffset(0);
    setExpanded(false);
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !period || !entrySource) return;
    const form = new FormData(event.currentTarget);
    const parsed = planningEntrySchema.safeParse({
      amount: parseAmount(form.get("amount")),
      occurredOn: String(form.get("date")),
      notes: String(form.get("notes") ?? ""),
    });
    if (!parsed.success) return;
    const now = new Date().toISOString();
    setEntries((items) => [...items, {
      id: createId("planning-entry"), planningId: selected.id, periodId: period.id,
      sourceId: entrySource, ...parsed.data, createdAt: now, updatedAt: now,
    }]);
    setEntrySource(null);
  }

  if (!selected || !summary) {
    return <section className="foco-panel mt-6 overflow-hidden p-6 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#ffd600]">Planejamento</p><h2 className="mt-2 text-2xl font-black">Transforme objetivos em um caminho</h2><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Defina períodos, fontes e valores planejados. Depois registre o realizado sem perder o histórico.</p></div><Link href="/planejamentos" className={primaryButtonClass}>Criar planejamento</Link></div></section>;
  }

  const periodPlanned = period ? plannedForPeriod(period) : 0;
  const periodActual = period ? actualForPeriod(period.id, planningEntries) : 0;
  const periodPercent = periodPlanned > 0 ? Math.min(100, Math.round(periodActual / periodPlanned * 100)) : 0;

  return <section className="mt-6 overflow-hidden rounded-3xl border border-[#ffd600]/20 bg-[#090a0b] text-white shadow-[0_22px_70px_rgba(0,0,0,.25)]">
    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-start"><div><div className="flex flex-wrap items-center gap-3"><p className="text-xs font-black uppercase tracking-[.18em] text-[#ffd600]">Planejamento em foco</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${summary.status === "behind" || summary.status === "late" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>{summary.status === "behind" ? "Abaixo do plano" : summary.status === "late" ? "Prazo encerrado" : summary.status === "completed" ? "Concluído" : "Dentro do plano"}</span></div><h2 className="mt-2 text-2xl font-black sm:text-3xl">{selected.name}</h2><p className="mt-2 text-sm text-white/45">{selected.description || "Acompanhe o planejado e registre o resultado de cada período."}</p></div><select aria-label="Planejamento exibido" value={selected.id} onChange={(event) => changePlanning(event.target.value)} className="rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm font-bold text-white outline-none">{active.map((item) => <option key={item.id} value={item.id} className="bg-black">{item.name}</option>)}</select></div>
    <div className="grid border-y border-white/10 sm:grid-cols-3"><div className="p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Progresso total</p><p className="mt-2 text-2xl font-black">{formatPlanningAmount(summary.actualProgress, selected)}</p><p className="mt-1 text-xs text-white/35">de {formatPlanningAmount(selected.targetAmount, selected)}</p></div><div className="border-white/10 p-5 sm:border-l sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Restante</p><p className="mt-2 text-2xl font-black">{formatPlanningAmount(summary.remaining, selected)}</p><p className="mt-1 text-xs text-white/35">{summary.daysRemaining} dias disponíveis</p></div><div className="border-white/10 p-5 sm:border-l sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Média necessária</p><p className="mt-2 text-2xl font-black">{formatPlanningAmount(summary.requiredAverage, selected)}</p><p className="mt-1 text-xs text-white/35">por período restante</p></div></div>
    <div className="p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Período selecionado</p><h3 className="mt-1 text-lg font-black">{period?.label ?? "Sem período"}</h3></div><div className="flex gap-2"><button type="button" disabled={periodIndex <= 0} onClick={() => setPeriodOffset((value) => value - 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 disabled:opacity-25" aria-label="Período anterior">←</button><button type="button" disabled={periodIndex >= planningPeriods.length - 1} onClick={() => setPeriodOffset((value) => value + 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 disabled:opacity-25" aria-label="Próximo período">→</button><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="rounded-xl border border-white/10 px-4 text-xs font-black">{expanded ? "Recolher" : "Ver fontes"}</button></div></div>
      <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-2xl font-black">{formatPlanningAmount(periodActual, selected)} <span className="text-sm text-white/35">/ {formatPlanningAmount(periodPlanned, selected)}</span></p></div><strong className="text-[#ffd600]">{periodPercent}%</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffd600] transition-[width]" style={{ width: `${periodPercent}%` }} /></div>
      {expanded && period && <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">{planningSources.map((source) => {
        const actual = actualForPeriod(period.id, planningEntries, source.id);
        const planned = period.plannedBySource[source.id] ?? 0;
        const sourceEntries = planningEntries.filter((item) => item.periodId === period.id && item.sourceId === source.id);
        const sourceOpen = expandedSource === source.id;
        return <article key={source.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"><div className="flex items-center gap-3 p-4"><button type="button" onClick={() => setExpandedSource(sourceOpen ? null : source.id)} aria-expanded={sourceOpen} className="grid h-10 w-10 place-items-center rounded-xl text-black" style={{ backgroundColor: source.color }}>{source.icon}</button><button type="button" onClick={() => setExpandedSource(sourceOpen ? null : source.id)} aria-expanded={sourceOpen} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-black">{source.name}</p><p className="mt-1 text-xs text-white/35">{formatPlanningAmount(actual, selected)} / {formatPlanningAmount(planned, selected)}</p></button><span aria-hidden="true" className="text-white/35">{sourceOpen ? "⌃" : "⌄"}</span><button type="button" onClick={() => setEntrySource(source.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffd600] font-black text-black" aria-label={`Registrar resultado em ${source.name}`}>+</button></div>{sourceOpen && <div className="space-y-2 border-t border-white/10 p-4">{sourceEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 text-xs"><span className="text-white/45">{new Date(`${entry.occurredOn}T12:00:00`).toLocaleDateString("pt-BR")} · {entry.notes || "Registro manual"}</span><strong>{formatPlanningAmount(entry.amount, selected)}</strong></div>)}{sourceEntries.length === 0 && <p className="text-xs text-white/35">Nenhum resultado registrado nesta fonte.</p>}</div>}</article>;
      })}</div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link href="/planejamentos" className="text-sm font-black text-[#ffd600]">Abrir planejamento completo →</Link>{period && planningSources.length > 0 && <button type="button" onClick={() => setEntrySource(planningSources[0].id)} className="rounded-xl bg-[#ffd600] px-4 py-2.5 text-xs font-black text-black">+ Registrar resultado</button>}</div>
    </div>
    <Modal open={Boolean(entrySource)} onClose={() => setEntrySource(null)} title="Registrar resultado" description="O valor entra no histórico deste planejamento."><form onSubmit={saveEntry} className="grid gap-4"><Field label="Valor ou quantidade"><input name="amount" className={fieldClass} required inputMode="decimal" /></Field><Field label="Data"><input name="date" className={fieldClass} required type="date" defaultValue={today} /></Field><Field label="Observação"><textarea name="notes" className={fieldClass} rows={2} /></Field><button className={primaryButtonClass}>Salvar resultado</button></form></Modal>
  </section>;
}
