import type { Goal } from "@/lib/local-data";

export function getDashboardGoals(goals: Goal[]) {
  const importantGoals = goals.filter((goal) => goal.isImportant);
  return importantGoals.length > 0 ? importantGoals : goals.slice(0, 1);
}
