import { describe, expect, it } from "vitest";
import { seedGoals } from "@/lib/local-data";
import { getDashboardGoals } from "./goals";

describe("metas importantes no dashboard", () => {
  it("seleciona todas as metas marcadas como importantes", () => {
    const goals = seedGoals.map((goal, index) => ({ ...goal, isImportant: index !== 1 }));
    expect(getDashboardGoals(goals).map((goal) => goal.id)).toEqual(["goal-reserve", "goal-books"]);
  });

  it("mantém uma meta de fallback quando nenhuma está marcada", () => {
    const goals = seedGoals.map((goal) => ({ ...goal, isImportant: false }));
    expect(getDashboardGoals(goals)).toEqual([goals[0]]);
  });
});
