"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { createId, defaultCurrencies, useLocalCollection, type FinancialAccount, type Goal, type UserCurrency } from "@/lib/local-data";
import { actualForPeriod, applyUniformDistribution, buildScenarios, calculatePlanningSummary, cumulativeSeries, generatePlanningPeriods, getCurrentPeriod, plannedForPeriod, replanFuturePeriods } from "@/lib/planejamentos/engine";
import { planningDraftSchema, planningEntrySchema } from "@/lib/planejamentos/schema";
import type { Planning, PlanningEntry, PlanningFrequency, PlanningPeriod, PlanningRevision, PlanningSource } from "@/lib/planejamentos/types";

const sourceColors = ["#ffd600", "#2ec4b6", "#7b61ff", "#ff9f1c", "#4d96ff", "#ef476f"];

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function futureKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function formatPlanningAmount(amount: number, planning: Pick<Planning, "kind" | "currency" | "unit">) {
  if (planning.kind === "financial") {
    try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: planning.currency ?? "BRL" }).format(amount / 100); }
    catch { return `${planning.currency ?? ""} ${(amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }
  }
  return `${(amount / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${planning.unit}`;
}

function statusLabel(status: ReturnType<typeof calculatePlanningSummary>["status"]) {
  return status === "completed" ? "Concluído" : status === "late" ? "Prazo encerrado" : status === "behind" ? "Abaixo do planejado" : "Dentro do planejado";
}

function statusClass(status: ReturnType<typeof calculatePlanningSummary>["status"]) {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-500";
  if (status === "behind" || status === "late") return "bg-red-500/15 text-red-400";
  return "bg-[#ffd600]/15 text-[#ffd600]";
}

export function PlanningView() {
  const [plannings, setPlannings] = useLocalCollection<Planning>("foco-plannings", []);
  const [sources, setSources] = useLocalCollection<PlanningSource>("foco-planning-sources", []);
  const [periods, setPeriods] = useLocalCollection<PlanningPeriod>("foco-planning-periods", []);
  const [entries, setEntries] = useLocalCollection<PlanningEntry>("foco-planning-entries", []);
  const [revisions, setRevisions] = useLocalCollection<PlanningRevision>("foco-planning-revisions", []);
  const [goals, setGoals] = useLocalCollection<Goal>("foco-goals", []);
  const [accounts] = useLocalCollection<FinancialAccount>("foco-financial-accounts", []);
  const [currencies] = useLocalCollection<UserCurrency>("foco-currencies", defaultCurrencies);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [search, setSearch] = useState("");

  const today = todayKey();
  const visible = plannings.filter((planning) => planning.status === status && `${planning.name} ${planning.category}`.toLowerCase().includes(search.toLowerCase()));
  const activeSummaries = plannings.filter((planning) => planning.status === "active").map((planning) => calculatePlanningSummary(planning, periods.filter((period) => period.planningId === planning.id), entries.filter((entry) => entry.planningId === planning.id), today));
  const selected = plannings.find((planning) => planning.id === selectedId) ?? null;

  function createPlanning(payload: { planning: Planning; sources: PlanningSource[]; periods: PlanningPeriod[]; createGoal: boolean }) {
    setPlannings((items) => [payload.planning, ...items]);
    setSources((items) => [...items, ...payload.sources]);
    setPeriods((items) => [...items, ...payload.periods]);
    if (payload.createGoal && !payload.planning.goalId) {
      const goalId = createId("goal");
      setGoals((items) => [{ id: goalId, title: payload.planning.name, category: payload.planning.category, target: payload.planning.targetAmount / 100, current: payload.planning.initialAmount / 100, deadline: payload.planning.endDate, status: "in_progress", pointsReward: 100, isImportant: payload.planning.priority === "high" }, ...items]);
      setPlannings((items) => items.map((item) => item.id === payload.planning.id ? { ...item, goalId } : item));
    }
    setSelectedId(payload.planning.id);
    setWizardOpen(false);
  }

  return <div>
    <PageHeader eyebrow="Execução e projeções" title="Planejamentos" description="Construa o caminho período a período, registre o que aconteceu e ajuste o futuro sem apagar o passado." action={<button type="button" onClick={() => setWizardOpen(true)} className={primaryButtonClass}>+ Criar planejamento</button>} />

    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo dos planejamentos">
      <PlanningStat label="Ativos" value={String(activeSummaries.length)} icon="◎" accent />
      <PlanningStat label="Dentro do prazo" value={String(activeSummaries.filter((item) => item.status === "on_track" || item.status === "completed").length)} icon="↗" />
      <PlanningStat label="Abaixo do plano" value={String(activeSummaries.filter((item) => item.status === "behind").length)} icon="↘" />
      <PlanningStat label="Prazo encerrado" value={String(activeSummaries.filter((item) => item.status === "late").length)} icon="!" />
      <PlanningStat label="Próximos do prazo" value={String(activeSummaries.filter((item) => item.daysRemaining <= 7 && item.status !== "completed").length)} icon="◷" />
    </section>

    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">{(["active", "completed", "archived"] as const).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black ${status === item ? "bg-[#ffd600] text-black" : "border border-[var(--border)] text-[var(--muted)]"}`}>{item === "active" ? "Ativos" : item === "completed" ? "Concluídos" : "Arquivados"}</button>)}</div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar planejamentos..." className={`${fieldClass} lg:max-w-sm`} />
    </div>

    {visible.length > 0 ? <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{visible.map((planning) => {
      const planningPeriods = periods.filter((period) => period.planningId === planning.id);
      const planningEntries = entries.filter((entry) => entry.planningId === planning.id);
      const summary = calculatePlanningSummary(planning, planningPeriods, planningEntries, today);
      const current = getCurrentPeriod(planningPeriods, today);
      return <button key={planning.id} type="button" onClick={() => setSelectedId(planning.id)} className="foco-panel group p-6 text-left hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,.25)]">
        <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl text-xl font-black text-black" style={{ backgroundColor: planning.color }}>{planning.icon}</span><span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusClass(summary.status)}`}>{statusLabel(summary.status)}</span></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[var(--muted)]">{planning.category} · {planning.frequency === "daily" ? "Diário" : planning.frequency === "weekly" ? "Semanal" : "Mensal"}</p>
        <h2 className="mt-2 text-2xl font-black">{planning.name}</h2>
        <p className="mt-4 text-lg font-black">{formatPlanningAmount(summary.actualProgress, planning)} <span className="text-sm text-[var(--muted)]">/ {formatPlanningAmount(planning.targetAmount, planning)}</span></p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[#ffd600]" style={{ width: `${summary.progressPercent}%` }} /></div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div><p className="text-[var(--muted)]">Esperado hoje</p><p className="mt-1 font-black">{summary.expectedPercent}%</p></div><div><p className="text-[var(--muted)]">Período atual</p><p className="mt-1 truncate font-black">{current?.label ?? "Encerrado"}</p></div></div>
      </button>;
    })}</section> : <section className="foco-panel mt-5 p-10 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd600] text-2xl font-black text-black">＋</span><h2 className="mt-5 text-xl font-black">Nenhum planejamento neste estado</h2><p className="mt-2 text-sm text-[var(--muted)]">Crie seu primeiro caminho mensurável e acompanhe a execução real.</p><button type="button" onClick={() => setWizardOpen(true)} className={`${primaryButtonClass} mt-5`}>Criar planejamento</button></section>}

    {selected && <PlanningDetailPortal planning={selected} periods={periods.filter((period) => period.planningId === selected.id)} sources={sources.filter((source) => source.planningId === selected.id)} entries={entries.filter((entry) => entry.planningId === selected.id)} revisions={revisions.filter((revision) => revision.planningId === selected.id)} onClose={() => setSelectedId(null)} onPlanningChange={(next) => setPlannings((items) => items.map((item) => item.id === next.id ? next : item))} onPeriodsChange={(next) => setPeriods((items) => [...items.filter((period) => period.planningId !== selected.id), ...next])} onEntriesChange={(next) => setEntries((items) => [...items.filter((entry) => entry.planningId !== selected.id), ...next])} onRevision={(revision) => setRevisions((items) => [revision, ...items])} />}

    <PlanningWizard key={wizardOpen ? "wizard-open" : "wizard-closed"} open={wizardOpen} onClose={() => setWizardOpen(false)} onCreate={createPlanning} goals={goals} accounts={accounts.filter((account) => account.active)} currencies={currencies} />
  </div>;
}

function PlanningStat({ label, value, icon, accent = false }: { label: string; value: string; icon: string; accent?: boolean }) {
  return <article className={`foco-stat p-5 ${accent ? "foco-stat-accent" : ""}`}><span className={`foco-icon ${accent ? "border-black/10 bg-black/10 text-black" : ""}`}>{icon}</span><p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-black/40">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}

type SourceDraft = Pick<PlanningSource, "id" | "name" | "type" | "color" | "defaultAmount" | "active" | "order">;

function PlanningWizard({ open, onClose, onCreate, goals, accounts, currencies }: { open: boolean; onClose: () => void; onCreate: (payload: { planning: Planning; sources: PlanningSource[]; periods: PlanningPeriod[]; createGoal: boolean }) => void; goals: Goal[]; accounts: FinancialAccount[]; currencies: UserCurrency[] }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ name: "", description: "", category: "Finanças", kind: "financial" as Planning["kind"], unit: "valor", currency: "AUD", target: "5000", initial: "0", startDate: todayKey(), endDate: futureKey(42), frequency: "weekly" as PlanningFrequency, priority: "medium" as Planning["priority"], goalId: "", accountId: "", createGoal: false, distributionMode: "mixed" as Planning["distributionMode"] });
  const [sourceDrafts, setSourceDrafts] = useState<SourceDraft[]>([{ id: createId("source"), name: "Fonte principal", type: "reserved", color: sourceColors[0], defaultAmount: 0, active: true, order: 0 }]);
  const [periodDrafts, setPeriodDrafts] = useState<PlanningPeriod[]>([]);
  const [planningId] = useState(() => createId("planning"));

  function goNext() {
    setError("");
    if (step === 1 && (!draft.name.trim() || Number(draft.target.replace(",", ".")) <= 0)) { setError("Informe o nome e um objetivo maior que zero."); return; }
    if (step === 2 && draft.endDate < draft.startDate) { setError("A data final deve ser posterior à data inicial."); return; }
    if (step === 3 && sourceDrafts.every((source) => !source.active)) { setError("Mantenha pelo menos uma fonte ativa."); return; }
    if (step === 3) {
      const fullSources = toPlanningSources(sourceDrafts, planningId, draft.frequency);
      const generated = generatePlanningPeriods(planningId, draft.startDate, draft.endDate, draft.frequency);
      setPeriodDrafts(applyUniformDistribution(generated, fullSources, Math.max(0, parseAmount(draft.target) - parseAmount(draft.initial))));
    }
    setStep((value) => Math.min(5, value + 1));
  }

  function confirm() {
    const now = new Date().toISOString();
    const parsed = planningDraftSchema.safeParse({ name: draft.name, description: draft.description, category: draft.category, kind: draft.kind, unit: draft.kind === "financial" ? "centavos" : draft.unit, currency: draft.kind === "financial" ? draft.currency : undefined, targetAmount: parseAmount(draft.target), initialAmount: parseAmount(draft.initial), startDate: draft.startDate, endDate: draft.endDate, frequency: draft.frequency, priority: draft.priority, goalId: draft.goalId || undefined, accountId: draft.accountId || undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revise os dados informados."); return; }
    const planning: Planning = { id: planningId, ...parsed.data, registrationGranularity: "daily", distributionMode: draft.distributionMode, color: "#ffd600", icon: "◎", status: "active", favorite: false, createdAt: now, updatedAt: now };
    onCreate({ planning, sources: toPlanningSources(sourceDrafts, planningId, draft.frequency), periods: periodDrafts, createGoal: draft.createGoal });
    setStep(1);
  }

  const plannedTotal = periodDrafts.reduce((sum, period) => sum + plannedForPeriod(period), 0);
  const targetRemaining = Math.max(0, parseAmount(draft.target) - parseAmount(draft.initial));

  return <Modal open={open} onClose={onClose} title="Criar planejamento" description={`Etapa ${step} de 5 · ${["Objetivo", "Frequência", "Fontes", "Projeção", "Revisão"][step - 1]}`}>
    <div className="mb-6 grid grid-cols-5 gap-2" aria-label={`Etapa ${step} de 5`}>{[1, 2, 3, 4, 5].map((item) => <span key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[#ffd600]" : "bg-[var(--border)]"}`} />)}</div>
    {step === 1 && <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome do planejamento"><input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Reserva de emergência" /></Field></div><div className="sm:col-span-2"><Field label="Descrição" hint="Opcional"><textarea className={fieldClass} rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field></div><Field label="Categoria"><select className={fieldClass} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Finanças</option><option>Estudo</option><option>Saúde</option><option>Carreira</option><option>Pessoal</option></select></Field><Field label="Tipo"><select className={fieldClass} value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Planning["kind"] })}><option value="financial">Financeiro</option><option value="hours">Horas</option><option value="sessions">Sessões</option><option value="quantity">Quantidade</option></select></Field>{draft.kind === "financial" ? <Field label="Moeda"><select className={fieldClass} value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })}>{currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></Field> : <Field label="Unidade"><input className={fieldClass} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="horas, páginas..." /></Field>}<Field label="Objetivo final"><input className={fieldClass} inputMode="decimal" value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} /></Field><Field label="Progresso inicial"><input className={fieldClass} inputMode="decimal" value={draft.initial} onChange={(event) => setDraft({ ...draft, initial: event.target.value })} /></Field><Field label="Prioridade"><select className={fieldClass} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Planning["priority"] })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></Field><Field label="Vincular a uma meta"><select className={fieldClass} value={draft.goalId} onChange={(event) => setDraft({ ...draft, goalId: event.target.value, createGoal: false })}><option value="">Sem vínculo</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></Field>{draft.kind === "financial" && <div className="sm:col-span-2"><Field label="Conta de destino" hint="Opcional; registrar resultados não cria transações bancárias."><select className={fieldClass} value={draft.accountId} onChange={(event) => setDraft({ ...draft, accountId: event.target.value })}><option value="">Nenhuma conta</option>{accounts.filter((account) => account.currency === draft.currency).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></Field></div>}{!draft.goalId && <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 sm:col-span-2"><input type="checkbox" checked={draft.createGoal} onChange={(event) => setDraft({ ...draft, createGoal: event.target.checked })} className="h-5 w-5 accent-[#ffd600]"/><span className="text-sm font-bold">Criar também uma meta vinculada, sem duplicar uma meta existente</span></label>}</div>}
    {step === 2 && <div className="space-y-5"><div className="grid grid-cols-3 gap-3">{(["daily", "weekly", "monthly"] as const).map((frequency) => <button key={frequency} type="button" onClick={() => setDraft({ ...draft, frequency })} className={`rounded-2xl border p-4 text-sm font-black ${draft.frequency === frequency ? "border-[#ffd600] bg-[#ffd600] text-black" : "border-[var(--border)]"}`}>{frequency === "daily" ? "Diário" : frequency === "weekly" ? "Semanal" : "Mensal"}</button>)}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Data inicial"><input className={fieldClass} type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field><Field label="Data final"><input className={fieldClass} type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></Field></div><p className="rounded-2xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">O FOCO usa períodos reais. Semanas e meses incompletos serão mantidos como períodos parciais.</p></div>}
    {step === 3 && <div className="space-y-4">{sourceDrafts.map((source, index) => <div key={source.id} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-[1fr_160px_auto]"><input aria-label={`Nome da fonte ${index + 1}`} className={fieldClass} value={source.name} onChange={(event) => setSourceDrafts((items) => items.map((item) => item.id === source.id ? { ...item, name: event.target.value } : item))} /><input aria-label={`Valor esperado da fonte ${source.name}`} className={fieldClass} inputMode="decimal" placeholder="Valor padrão" value={source.defaultAmount ? source.defaultAmount / 100 : ""} onChange={(event) => setSourceDrafts((items) => items.map((item) => item.id === source.id ? { ...item, defaultAmount: Math.round(Number(event.target.value.replace(",", ".")) * 100) || 0 } : item))} /><button type="button" onClick={() => setSourceDrafts((items) => items.filter((item) => item.id !== source.id))} className="rounded-xl px-3 text-sm font-bold text-red-500">Excluir</button></div>)}<button type="button" onClick={() => setSourceDrafts((items) => [...items, { id: createId("source"), name: `Fonte ${items.length + 1}`, type: "reserved", color: sourceColors[items.length % sourceColors.length], defaultAmount: 0, active: true, order: items.length }])} className="w-full rounded-2xl border border-dashed border-[#ffd600]/50 p-4 text-sm font-black text-[#ffd600]">+ Adicionar fonte</button><p className="text-xs text-[var(--muted)]">Receitas não são consideradas economia automaticamente. Estas fontes representam contribuições elegíveis ao objetivo.</p></div>}
    {step === 4 && <div><div className="mb-4 grid grid-cols-2 gap-3">{(["uniform", "mixed"] as const).map((mode) => <button key={mode} type="button" onClick={() => setDraft({ ...draft, distributionMode: mode })} className={`rounded-xl border p-3 text-xs font-black ${draft.distributionMode === mode ? "border-[#ffd600] bg-[#ffd600] text-black" : "border-[var(--border)]"}`}>{mode === "uniform" ? "Distribuição uniforme" : "Distribuição mista e editável"}</button>)}</div><div className="max-h-[45dvh] space-y-3 overflow-y-auto pr-1">{periodDrafts.map((period) => <div key={period.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{period.label}</p><p className="text-xs text-[var(--muted)]">{period.startDate} → {period.endDate}</p></div><input aria-label={`Total planejado em ${period.label}`} className="w-32 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-right text-sm font-black" value={(plannedForPeriod(period) / 100).toFixed(2)} onChange={(event) => { const total = Math.max(0, Math.round(Number(event.target.value.replace(",", ".")) * 100) || 0); const activeSources = sourceDrafts.filter((source) => source.active); const values = activeSources.length ? activeSources.map((_, sourceIndex) => sourceIndex === 0 ? total : 0) : []; setPeriodDrafts((items) => items.map((item) => item.id === period.id ? { ...item, plannedBySource: Object.fromEntries(activeSources.map((source, sourceIndex) => [source.id, values[sourceIndex]])) } : item)); }} /></div></div>)}</div></div>}
    {step === 5 && <div className="space-y-4"><ReviewRow label="Objetivo" value={`${draft.name} · ${draft.target} ${draft.kind === "financial" ? draft.currency : draft.unit}`} /><ReviewRow label="Prazo" value={`${draft.startDate} → ${draft.endDate}`} /><ReviewRow label="Frequência" value={draft.frequency === "daily" ? "Diária" : draft.frequency === "weekly" ? "Semanal" : "Mensal"} /><ReviewRow label="Fontes" value={sourceDrafts.map((source) => source.name).join(", ")} /><ReviewRow label="Total planejado" value={(plannedTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /><ReviewRow label="Diferença para o objetivo" value={((plannedTotal - targetRemaining) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} />{plannedTotal < targetRemaining && <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">O plano está abaixo do objetivo em {((targetRemaining - plannedTotal) / 100).toLocaleString("pt-BR")}. Você pode manter assim ou voltar para ajustar.</p>}</div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
    <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-5"><button type="button" onClick={step === 1 ? onClose : () => setStep((value) => value - 1)} className="rounded-xl px-4 py-3 text-sm font-bold">{step === 1 ? "Cancelar" : "Anterior"}</button><button type="button" onClick={step === 5 ? confirm : goNext} className={primaryButtonClass}>{step === 5 ? "Confirmar planejamento" : "Próximo"}</button></div>
  </Modal>;
}

function toPlanningSources(drafts: SourceDraft[], planningId: string, frequency: PlanningFrequency): PlanningSource[] {
  return drafts.map((source, index) => ({ ...source, planningId, icon: source.name.charAt(0).toUpperCase(), suggestedFrequency: frequency, order: index, notes: "" }));
}

function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 text-sm"><span className="text-[var(--muted)]">{label}</span><strong className="text-right">{value}</strong></div>; }

function PlanningDetailPortal(props: Parameters<typeof PlanningDetail>[0]) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  if (!mounted) return null;
  return createPortal(<PlanningDetail {...props} />, document.body);
}

function PlanningDetail({ planning, periods, sources, entries, revisions, onClose, onPlanningChange, onPeriodsChange, onEntriesChange, onRevision }: { planning: Planning; periods: PlanningPeriod[]; sources: PlanningSource[]; entries: PlanningEntry[]; revisions: PlanningRevision[]; onClose: () => void; onPlanningChange: (planning: Planning) => void; onPeriodsChange: (periods: PlanningPeriod[]) => void; onEntriesChange: (entries: PlanningEntry[]) => void; onRevision: (revision: PlanningRevision) => void }) {
  const today = todayKey();
  const current = getCurrentPeriod(periods, today);
  const [periodIndex, setPeriodIndex] = useState(Math.max(0, periods.findIndex((period) => period.id === current?.id)));
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [entrySource, setEntrySource] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const period = periods[periodIndex] ?? null;
  const summary = calculatePlanningSummary(planning, periods, entries, today);
  const scenarios = buildScenarios(planning, periods, entries, today);
  const series = cumulativeSeries(planning, periods, entries);

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!period || !entrySource) return;
    const form = new FormData(event.currentTarget);
    const parsed = planningEntrySchema.safeParse({ amount: parseAmount(form.get("amount")), occurredOn: String(form.get("date")), notes: String(form.get("notes") ?? "") });
    if (!parsed.success) return;
    const now = new Date().toISOString();
    if (editingEntry) {
      onEntriesChange(entries.map((entry) => entry.id === editingEntry.id ? { ...entry, ...parsed.data, sourceId: entrySource, updatedAt: now } : entry));
    } else {
      onEntriesChange([...entries, { id: createId("planning-entry"), planningId: planning.id, periodId: period.id, sourceId: entrySource, ...parsed.data, createdAt: now, updatedAt: now }]);
    }
    setEntrySource(null);
    setEditingEntry(null);
  }

  function replan() {
    if (!period) return;
    onRevision({ id: createId("revision"), planningId: planning.id, createdAt: new Date().toISOString(), reason: "Redistribuição da diferença pelos períodos restantes", effectiveFrom: period.startDate, previousPeriods: periods.filter((item) => item.endDate >= period.startDate) });
    onPeriodsChange(replanFuturePeriods(planning, periods, entries, period.startDate, sources));
  }

  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--background)]" role="dialog" aria-modal="true" aria-label={`Detalhes de ${planning.name}`}>
    <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 px-5 py-3 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-black">← Planejamentos</button><div className="flex gap-2"><button type="button" onClick={() => onPlanningChange({ ...planning, favorite: !planning.favorite, updatedAt: new Date().toISOString() })} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-black">{planning.favorite ? "★ Fixado" : "☆ Fixar"}</button><button type="button" onClick={() => onPlanningChange({ ...planning, status: "archived", updatedAt: new Date().toISOString() })} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-black">Arquivar</button></div></div></div>
    <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8 lg:px-12">
      <header className="editorial-header mt-5"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ffd600]">{planning.category} · painel de execução</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">{planning.name}</h1><p className="mt-3 max-w-2xl text-white/60">{planning.description || "Acompanhe o plano, os registros reais e a projeção de conclusão."}</p><div className="mt-6 flex flex-wrap gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(summary.status)}`}>{statusLabel(summary.status)}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{summary.daysRemaining} dias restantes</span></div></header>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PlanningStat label="Progresso real" value={`${summary.progressPercent}%`} icon="↗" accent /><PlanningStat label="Realizado" value={formatPlanningAmount(summary.actualProgress, planning)} icon="●" /><PlanningStat label="Restante" value={formatPlanningAmount(summary.remaining, planning)} icon="◷" /><PlanningStat label="Média necessária" value={formatPlanningAmount(summary.requiredAverage, planning)} icon="÷" /></section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]"><section className="foco-panel p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#ffd600]">Editor por período</p><h2 className="mt-1 text-2xl font-black">{period?.label ?? "Sem períodos"}</h2></div><div className="flex gap-2"><button type="button" disabled={periodIndex === 0} onClick={() => setPeriodIndex((value) => value - 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] disabled:opacity-30">←</button><button type="button" disabled={periodIndex >= periods.length - 1} onClick={() => setPeriodIndex((value) => value + 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] disabled:opacity-30">→</button></div></div>{period && <div className="mt-5 space-y-3">{sources.filter((source) => source.active).map((source) => { const planned = period.plannedBySource[source.id] ?? 0; const actual = actualForPeriod(period.id, entries, source.id); const sourceEntries = entries.filter((entry) => entry.periodId === period.id && entry.sourceId === source.id); const expanded = expandedSource === source.id; return <article key={source.id} className="overflow-hidden rounded-2xl border border-[var(--border)]"><div className="flex items-center gap-3 p-4"><button type="button" onClick={() => setExpandedSource(expanded ? null : source.id)} aria-expanded={expanded} className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black text-black" style={{ backgroundColor: source.color }}>{source.icon}</button><button type="button" onClick={() => setExpandedSource(expanded ? null : source.id)} className="min-w-0 flex-1 text-left"><p className="font-black">{source.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatPlanningAmount(actual, planning)} / {formatPlanningAmount(planned, planning)}</p></button><input aria-label={`Planejado para ${source.name}`} className="hidden w-28 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-2 text-right text-xs font-bold sm:block" value={(planned / 100).toFixed(2)} onChange={(event) => { const amount = Math.max(0, Math.round(Number(event.target.value.replace(",", ".")) * 100) || 0); onPeriodsChange(periods.map((item) => item.id === period.id ? { ...item, plannedBySource: { ...item.plannedBySource, [source.id]: amount } } : item)); }} /><button type="button" onClick={() => setEntrySource(source.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffd600] font-black text-black" aria-label={`Adicionar resultado em ${source.name}`}>+</button></div><div className="h-1 bg-[var(--surface-soft)]"><div className="h-full" style={{ width: `${planned > 0 ? Math.min(100, actual / planned * 100) : 0}%`, backgroundColor: source.color }} /></div>{expanded && <div className="border-t border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="space-y-2">{sourceEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] p-3 text-sm"><div><p className="font-bold">{new Date(`${entry.occurredOn}T12:00:00`).toLocaleDateString("pt-BR")}</p><p className="text-xs text-[var(--muted)]">{entry.notes || "Registro manual"}</p></div><div className="flex items-center gap-2"><strong>{formatPlanningAmount(entry.amount, planning)}</strong><button type="button" onClick={() => { setEditingEntry(entry); setEntrySource(entry.sourceId); }} className="text-xs font-bold text-[#ffd600]">Editar</button><button type="button" onClick={() => onEntriesChange(entries.filter((item) => item.id !== entry.id))} className="text-red-500" aria-label="Excluir registro">×</button></div></div>)}{sourceEntries.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhum resultado registrado nesta fonte.</p>}</div></div>}</article>; })}<div className="flex flex-col gap-3 rounded-2xl bg-[#ffd600] p-4 text-black sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider">Total do período</p><p className="mt-1 text-xl font-black">{formatPlanningAmount(actualForPeriod(period.id, entries), planning)} / {formatPlanningAmount(plannedForPeriod(period), planning)}</p></div><button type="button" onClick={replan} className="rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white">Distribuir diferença no futuro</button></div></div>}</section>

        <aside className="space-y-5"><section className="foco-panel p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#ffd600]">Cenários</p><div className="mt-4 space-y-3">{scenarios.map((scenario) => <div key={scenario.name} className="rounded-xl bg-[var(--surface-soft)] p-3"><div className="flex justify-between gap-3 text-sm"><span className="font-bold">{scenario.name === "conservative" ? "Conservador" : scenario.name === "expected" ? "Esperado" : "Otimista"}</span><strong>{formatPlanningAmount(scenario.projectedAmount, planning)}</strong></div><p className="mt-1 text-[10px] text-[var(--muted)]">Base: {scenario.methodology === "observed" ? "desempenho observado" : "contribuições planejadas"}</p></div>)}</div></section><section className="foco-panel p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#ffd600]">Revisões</p><p className="mt-3 text-3xl font-black">{revisions.length}</p><p className="mt-1 text-xs text-[var(--muted)]">versões prospectivas preservadas</p></section></aside>
      </div>

      <section className="foco-panel mt-5 p-5 sm:p-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#ffd600]">Histórico e projeção</p><h2 className="mt-1 text-2xl font-black">Planejado versus realizado</h2></div><PlanningChart series={series} target={planning.targetAmount} planning={planning} /></section>
    </div>
    <Modal open={Boolean(entrySource)} onClose={() => { setEntrySource(null); setEditingEntry(null); }} title={editingEntry ? "Editar resultado" : "Registrar resultado"} description="O registro atualiza o planejamento, sem criar uma movimentação financeira."><form key={editingEntry?.id ?? entrySource ?? "entry"} onSubmit={saveEntry} className="grid gap-4"><Field label="Valor ou quantidade"><input name="amount" className={fieldClass} required inputMode="decimal" defaultValue={editingEntry ? editingEntry.amount / 100 : undefined} /></Field><Field label="Data"><input name="date" className={fieldClass} required type="date" defaultValue={editingEntry?.occurredOn ?? today} /></Field><Field label="Observação"><textarea name="notes" className={fieldClass} rows={2} defaultValue={editingEntry?.notes} /></Field><button className={primaryButtonClass}>Salvar resultado</button></form></Modal>
  </div>;
}

function PlanningChart({ series, target, planning }: { series: ReturnType<typeof cumulativeSeries>; target: number; planning: Planning }) {
  const gradientId = useId().replaceAll(":", "");
  if (series.length === 0) return <p className="mt-6 text-sm text-[var(--muted)]">Sem períodos para exibir.</p>;
  const width = 1200;
  const height = 360;
  const plot = { left: 88, right: 32, top: 28, bottom: 58 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const max = Math.max(target, ...series.flatMap((item) => [item.planned, item.actual]), 1);
  const point = (item: (typeof series)[number], index: number, key: "planned" | "actual") => ({
    x: plot.left + (series.length === 1 ? plotWidth / 2 : index / (series.length - 1) * plotWidth),
    y: plot.top + plotHeight - item[key] / max * plotHeight,
  });
  const points = (key: "planned" | "actual") => series.map((item, index) => { const value = point(item, index, key); return `${value.x},${value.y}`; }).join(" ");
  const actualArea = `${plot.left},${plot.top + plotHeight} ${points("actual")} ${plot.left + plotWidth},${plot.top + plotHeight}`;
  const last = series.at(-1)!;
  const lastActual = point(last, series.length - 1, "actual");
  const visibleLabelIndexes = new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]);
  const ticks = [0, .25, .5, .75, 1];

  return <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 sm:p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-4 text-xs font-bold"><span className="flex items-center gap-2"><i className="h-0.5 w-7 bg-[#2ec4b6]" />Realizado</span><span className="flex items-center gap-2"><i className="h-0.5 w-7 border-t-2 border-dashed border-[#ffd600]" />Planejado</span><span className="flex items-center gap-2"><i className="h-0.5 w-7 bg-white/35" />Objetivo</span></div><div className="rounded-xl bg-[#2ec4b6]/10 px-3 py-2 text-right"><p className="text-[9px] font-black uppercase tracking-wider text-[#2ec4b6]">Último realizado</p><p className="mt-0.5 text-sm font-black">{formatPlanningAmount(last.actual, planning)}</p></div></div>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[700px]" role="img" aria-label={`Evolução acumulada: ${formatPlanningAmount(last.actual, planning)} realizado de ${formatPlanningAmount(target, planning)}`}><defs><linearGradient id={`${gradientId}-actual`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2ec4b6" stopOpacity=".28"/><stop offset="1" stopColor="#2ec4b6" stopOpacity="0"/></linearGradient><filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {ticks.map((tick) => { const y = plot.top + plotHeight - tick * plotHeight; return <g key={tick}><line x1={plot.left} x2={plot.left + plotWidth} y1={y} y2={y} stroke="currentColor" opacity={tick === 0 ? .16 : .08}/><text x={plot.left - 14} y={y + 4} textAnchor="end" fill="currentColor" opacity=".42" fontSize="11">{formatCompact(max * tick, planning)}</text></g>; })}
      <line x1={plot.left} x2={plot.left + plotWidth} y1={plot.top + plotHeight - target / max * plotHeight} y2={plot.top + plotHeight - target / max * plotHeight} stroke="currentColor" opacity=".32" strokeWidth="2"/>
      <polygon points={actualArea} fill={`url(#${gradientId}-actual)`}/>
      <polyline points={points("planned")} fill="none" stroke="#ffd600" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={points("actual")} fill="none" stroke="#2ec4b6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${gradientId}-glow)`}/>
      {series.map((item, index) => { const actual = point(item, index, "actual"); return <g key={`${item.label}-${index}`}><circle cx={actual.x} cy={actual.y} r="6" fill="#090a0b" stroke="#2ec4b6" strokeWidth="3"/><title>{`${item.label}: ${formatPlanningAmount(item.actual, planning)} realizado; ${formatPlanningAmount(item.planned, planning)} planejado`}</title>{visibleLabelIndexes.has(index) && <text x={actual.x} y={height - 18} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"} fill="currentColor" opacity=".52" fontSize="11">{shortenLabel(item.label)}</text>}</g>; })}
      <g transform={`translate(${Math.min(lastActual.x - 66, width - 160)} ${Math.max(8, lastActual.y - 48)})`}><rect width="132" height="34" rx="10" fill="#2ec4b6"/><text x="66" y="22" textAnchor="middle" fill="#07100e" fontSize="12" fontWeight="800">{formatCompact(last.actual, planning)}</text></g>
    </svg></div>
  </div>;
}

function formatCompact(amount: number, planning: Planning) {
  const value = amount / 100;
  const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  return planning.kind === "financial" ? `${planning.currency ?? ""} ${compact}` : `${compact} ${planning.unit}`;
}

function shortenLabel(label: string) {
  return label.length > 22 ? `${label.slice(0, 20)}…` : label;
}
