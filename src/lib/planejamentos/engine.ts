import type { Planning, PlanningEntry, PlanningPeriod, PlanningScenario, PlanningSource } from "./types";

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addCalendarDays(value: string, amount: number) {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function endOfMonth(value: string) {
  const date = dateFromKey(value);
  return dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

function nextMonth(value: string) {
  const date = dateFromKey(value);
  return dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)));
}

function endOfWeek(value: string) {
  const date = dateFromKey(value);
  const daysUntilSunday = (7 - date.getUTCDay()) % 7;
  return addCalendarDays(value, daysUntilSunday);
}

function minDate(left: string, right: string) {
  return left <= right ? left : right;
}

function formatPeriodLabel(startDate: string, endDate: string, index: number, frequency: Planning["frequency"]) {
  if (frequency === "daily") return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }).format(dateFromKey(startDate));
  if (frequency === "monthly") return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(dateFromKey(startDate));
  const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
  return `Semana ${index + 1} · ${formatter.format(dateFromKey(startDate))}–${formatter.format(dateFromKey(endDate))}`;
}

export function generatePlanningPeriods(planningId: string, startDate: string, endDate: string, frequency: Planning["frequency"]): PlanningPeriod[] {
  if (endDate < startDate) return [];
  const periods: PlanningPeriod[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const index = periods.length;
    const naturalEnd = frequency === "daily" ? cursor : frequency === "weekly" ? endOfWeek(cursor) : endOfMonth(cursor);
    const periodEnd = minDate(naturalEnd, endDate);
    periods.push({
      id: `${planningId}-period-${index + 1}`,
      planningId,
      index,
      startDate: cursor,
      endDate: periodEnd,
      label: formatPeriodLabel(cursor, periodEnd, index, frequency),
      plannedBySource: {},
      unavailable: false,
      notes: "",
      version: 1,
    });
    cursor = frequency === "monthly" ? nextMonth(cursor) : addCalendarDays(periodEnd, 1);
  }
  return periods;
}

export function distributeInteger(total: number, slots: number) {
  if (slots <= 0) return [];
  const base = Math.floor(total / slots);
  const remainder = total - base * slots;
  return Array.from({ length: slots }, (_, index) => base + (index < remainder ? 1 : 0));
}

function distributeAcrossSources(amount: number, sources: PlanningSource[]) {
  const active = sources.filter((source) => source.active).sort((left, right) => left.order - right.order);
  if (active.length === 0) return {};
  const configuredTotal = active.reduce((sum, source) => sum + Math.max(0, source.defaultAmount), 0);
  if (configuredTotal === 0) {
    const amounts = distributeInteger(amount, active.length);
    return Object.fromEntries(active.map((source, index) => [source.id, amounts[index]]));
  }
  let allocated = 0;
  return Object.fromEntries(active.map((source, index) => {
    const value = index === active.length - 1 ? amount - allocated : Math.floor(amount * source.defaultAmount / configuredTotal);
    allocated += value;
    return [source.id, value];
  }));
}

export function applyUniformDistribution(periods: PlanningPeriod[], sources: PlanningSource[], total: number) {
  const eligible = periods.filter((period) => !period.unavailable);
  const values = distributeInteger(Math.max(0, total), eligible.length);
  let valueIndex = 0;
  return periods.map((period) => period.unavailable ? { ...period, plannedBySource: {} } : {
    ...period,
    plannedBySource: distributeAcrossSources(values[valueIndex++], sources),
  });
}

export function plannedForPeriod(period: PlanningPeriod) {
  return Object.values(period.plannedBySource).reduce((sum, amount) => sum + amount, 0);
}

export function actualForPeriod(periodId: string, entries: PlanningEntry[], sourceId?: string) {
  return entries.filter((entry) => entry.periodId === periodId && (!sourceId || entry.sourceId === sourceId)).reduce((sum, entry) => sum + entry.amount, 0);
}

export function getCurrentPeriod(periods: PlanningPeriod[], today: string) {
  return periods.find((period) => period.startDate <= today && period.endDate >= today)
    ?? periods.find((period) => period.startDate > today)
    ?? periods.at(-1)
    ?? null;
}

export function calculatePlanningSummary(planning: Planning, periods: PlanningPeriod[], entries: PlanningEntry[], today: string) {
  const plannedTotal = periods.reduce((sum, period) => sum + plannedForPeriod(period), 0);
  const actualContributions = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const actualProgress = planning.initialAmount + actualContributions;
  const plannedToDate = planning.initialAmount + periods.filter((period) => period.startDate <= today).reduce((sum, period) => sum + plannedForPeriod(period), 0);
  const remaining = Math.max(0, planning.targetAmount - actualProgress);
  const remainingPeriods = periods.filter((period) => period.endDate >= today && !period.unavailable);
  const requiredAverage = remainingPeriods.length > 0 ? Math.ceil(remaining / remainingPeriods.length) : remaining;
  const progressPercent = planning.targetAmount > 0 ? Math.min(100, Math.round(actualProgress / planning.targetAmount * 100)) : 0;
  const expectedPercent = planning.targetAmount > 0 ? Math.min(100, Math.round(plannedToDate / planning.targetAmount * 100)) : 0;
  const difference = actualProgress - plannedToDate;
  const daysRemaining = Math.max(0, Math.ceil((dateFromKey(planning.endDate).getTime() - dateFromKey(today).getTime()) / 86_400_000));
  const status = actualProgress >= planning.targetAmount ? "completed" : today > planning.endDate ? "late" : difference < 0 ? "behind" : "on_track";
  return { plannedTotal, actualContributions, actualProgress, plannedToDate, remaining, remainingPeriods: remainingPeriods.length, requiredAverage, progressPercent, expectedPercent, difference, daysRemaining, status };
}

export function buildScenarios(planning: Planning, periods: PlanningPeriod[], entries: PlanningEntry[], today: string): PlanningScenario[] {
  const summary = calculatePlanningSummary(planning, periods, entries, today);
  const completedPeriods = periods.filter((period) => period.endDate < today);
  const observedAverage = completedPeriods.length > 0
    ? completedPeriods.reduce((sum, period) => sum + actualForPeriod(period.id, entries), 0) / completedPeriods.length
    : 0;
  const futurePlan = periods.filter((period) => period.endDate >= today).reduce((sum, period) => sum + plannedForPeriod(period), 0);
  const methodology = completedPeriods.length >= 2 && observedAverage > 0 ? "observed" as const : "plan" as const;
  const baseFuture = methodology === "observed" ? observedAverage * summary.remainingPeriods : futurePlan;
  return ([
    { name: "conservative", factor: 0.8 },
    { name: "expected", factor: 1 },
    { name: "optimistic", factor: 1.15 },
  ] as const).map(({ name, factor }) => ({
    name,
    factor,
    projectedAmount: Math.round(summary.actualProgress + baseFuture * factor),
    projectedCompletionDate: summary.actualProgress + baseFuture * factor >= planning.targetAmount ? planning.endDate : null,
    methodology,
  }));
}

export function cumulativeSeries(planning: Planning, periods: PlanningPeriod[], entries: PlanningEntry[]) {
  let planned = planning.initialAmount;
  let actual = planning.initialAmount;
  return periods.map((period) => {
    planned += plannedForPeriod(period);
    actual += actualForPeriod(period.id, entries);
    return { label: period.label, planned, actual };
  });
}

export function replanFuturePeriods(planning: Planning, periods: PlanningPeriod[], entries: PlanningEntry[], effectiveFrom: string, sources: PlanningSource[]) {
  const locked = periods.filter((period) => period.endDate < effectiveFrom);
  const future = periods.filter((period) => period.endDate >= effectiveFrom);
  const realized = entries.reduce((sum, entry) => sum + entry.amount, planning.initialAmount);
  const remaining = Math.max(0, planning.targetAmount - realized);
  const updated = applyUniformDistribution(future, sources, remaining).map((period) => ({ ...period, version: period.version + 1 }));
  return [...locked, ...updated].sort((left, right) => left.index - right.index);
}
