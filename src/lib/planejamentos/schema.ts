import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planningDraftSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().min(1).max(50),
  kind: z.enum(["financial", "quantity", "hours", "sessions"]),
  unit: z.string().trim().min(1).max(30),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  targetAmount: z.number().int().positive("O objetivo deve ser maior que zero."),
  initialAmount: z.number().int().min(0),
  startDate: dateSchema,
  endDate: dateSchema,
  frequency: z.enum(["daily", "weekly", "monthly"]),
  priority: z.enum(["low", "medium", "high"]),
  goalId: z.string().optional(),
  accountId: z.string().optional(),
}).refine((value) => value.endDate >= value.startDate, { message: "A data final deve ser posterior ao início.", path: ["endDate"] })
  .refine((value) => value.kind !== "financial" || Boolean(value.currency), { message: "Escolha a moeda do planejamento.", path: ["currency"] });

export const planningEntrySchema = z.object({
  amount: z.number().int().positive("Informe um valor maior que zero."),
  occurredOn: dateSchema,
  notes: z.string().trim().max(300).default(""),
});

export type PlanningDraft = z.infer<typeof planningDraftSchema>;
