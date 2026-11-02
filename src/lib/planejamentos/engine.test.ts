import { describe, expect, it } from "vitest";
import { actualForPeriod, applyUniformDistribution, calculatePlanningSummary, generatePlanningPeriods, replanFuturePeriods } from "./engine";
import type { Planning, PlanningEntry, PlanningSource } from "./types";

const planning: Planning = {
  id: "plan-1", name: "Reserva", description: "", category: "Finanças", kind: "financial", unit: "centavos", currency: "AUD",
  targetAmount: 500_000, initialAmount: 50_000, startDate: "2026-11-04", endDate: "2026-12-15", frequency: "weekly",
  registrationGranularity: "daily", distributionMode: "uniform", priority: "high", color: "#ffd600", icon: "◎", status: "active",
  favorite: true, createdAt: "2026-11-02T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z",
};

const sources: PlanningSource[] = [
  { id: "work", planningId: planning.id, name: "Trabalho", type: "reserved", color: "#ffd600", icon: "W", defaultAmount: 300, suggestedFrequency: "weekly", active: true, order: 0, notes: "" },
  { id: "uber", planningId: planning.id, name: "Uber", type: "reserved", color: "#2ec4b6", icon: "U", defaultAmount: 200, suggestedFrequency: "weekly", active: true, order: 1, notes: "" },
];

describe("motor de planejamentos", () => {
  it("gera semanas reais e preserva períodos parciais", () => {
    const periods = generatePlanningPeriods(planning.id, planning.startDate, planning.endDate, "weekly");
    expect(periods[0]).toMatchObject({ startDate: "2026-11-04", endDate: "2026-11-08" });
    expect(periods.at(-1)).toMatchObject({ startDate: "2026-12-14", endDate: "2026-12-15" });
  });

  it("gera períodos diários e mensais a partir do calendário", () => {
    expect(generatePlanningPeriods("daily", "2026-02-27", "2026-03-02", "daily")).toHaveLength(4);
    const monthly = generatePlanningPeriods("monthly", "2026-01-20", "2026-03-05", "monthly");
    expect(monthly.map((period) => [period.startDate, period.endDate])).toEqual([
      ["2026-01-20", "2026-01-31"], ["2026-02-01", "2026-02-28"], ["2026-03-01", "2026-03-05"],
    ]);
  });

  it("distribui centavos sem perder precisão", () => {
    const periods = generatePlanningPeriods(planning.id, "2026-11-01", "2026-11-03", "daily");
    const distributed = applyUniformDistribution(periods, sources, 100);
    expect(distributed.reduce((sum, period) => sum + Object.values(period.plannedBySource).reduce((subtotal, value) => subtotal + value, 0), 0)).toBe(100);
  });

  it("agrega múltiplas realizações sem sobrescrever histórico", () => {
    const entries: PlanningEntry[] = [
      { id: "1", planningId: planning.id, periodId: "p1", sourceId: "uber", amount: 6_000, occurredOn: "2026-11-03", notes: "", createdAt: "", updatedAt: "" },
      { id: "2", planningId: planning.id, periodId: "p1", sourceId: "uber", amount: 8_000, occurredOn: "2026-11-05", notes: "", createdAt: "", updatedAt: "" },
    ];
    expect(actualForPeriod("p1", entries, "uber")).toBe(14_000);
  });

  it("calcula planejado, realizado, diferença e média restante", () => {
    const periods = applyUniformDistribution(generatePlanningPeriods(planning.id, planning.startDate, planning.endDate, planning.frequency), sources, 450_000);
    const entries: PlanningEntry[] = [{ id: "1", planningId: planning.id, periodId: periods[0].id, sourceId: "work", amount: 60_000, occurredOn: "2026-11-07", notes: "", createdAt: "", updatedAt: "" }];
    const summary = calculatePlanningSummary(planning, periods, entries, "2026-11-09");
    expect(summary.actualProgress).toBe(110_000);
    expect(summary.remaining).toBe(390_000);
    expect(summary.difference).toBeLessThan(0);
    expect(summary.requiredAverage).toBeGreaterThan(0);
  });

  it("replaneja somente o futuro", () => {
    const periods = applyUniformDistribution(generatePlanningPeriods(planning.id, planning.startDate, planning.endDate, planning.frequency), sources, 450_000);
    const historicalPlan = periods[0].plannedBySource;
    const updated = replanFuturePeriods(planning, periods, [], periods[1].startDate, sources);
    expect(updated[0].plannedBySource).toEqual(historicalPlan);
    expect(updated[0].version).toBe(1);
    expect(updated[1].version).toBe(2);
  });
});
