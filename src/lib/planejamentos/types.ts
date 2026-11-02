export type PlanningFrequency = "daily" | "weekly" | "monthly";
export type PlanningStatus = "active" | "completed" | "archived";
export type PlanningKind = "financial" | "quantity" | "hours" | "sessions";
export type DistributionMode = "uniform" | "custom" | "sources" | "mixed";

export type Planning = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: PlanningKind;
  unit: string;
  currency?: string;
  targetAmount: number;
  initialAmount: number;
  startDate: string;
  endDate: string;
  frequency: PlanningFrequency;
  registrationGranularity: "daily" | "period";
  distributionMode: DistributionMode;
  priority: "low" | "medium" | "high";
  color: string;
  icon: string;
  status: PlanningStatus;
  goalId?: string;
  accountId?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanningSource = {
  id: string;
  planningId: string;
  name: string;
  type: "gross_income" | "net_income" | "reserved" | "expense_reduction" | "manual";
  color: string;
  icon: string;
  defaultAmount: number;
  suggestedFrequency: PlanningFrequency;
  active: boolean;
  order: number;
  notes: string;
};

export type PlanningPeriod = {
  id: string;
  planningId: string;
  index: number;
  startDate: string;
  endDate: string;
  label: string;
  plannedBySource: Record<string, number>;
  unavailable: boolean;
  notes: string;
  version: number;
};

export type PlanningEntry = {
  id: string;
  planningId: string;
  periodId: string;
  sourceId: string;
  amount: number;
  occurredOn: string;
  notes: string;
  transactionId?: string;
  originalCurrency?: string;
  exchangeRate?: number;
  exchangeRateDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanningRevision = {
  id: string;
  planningId: string;
  createdAt: string;
  reason: string;
  effectiveFrom: string;
  previousPeriods: PlanningPeriod[];
};

export type PlanningScenario = {
  name: "conservative" | "expected" | "optimistic";
  factor: number;
  projectedAmount: number;
  projectedCompletionDate: string | null;
  methodology: "plan" | "observed";
};
