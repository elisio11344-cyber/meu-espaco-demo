import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTimeSchema = z.string().datetime({ offset: true });

export const assistantActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("transaction"),
    type: z.enum(["expense", "income"]),
    description: z.string().trim().min(1).max(120),
    amountCents: z.number().int().positive().max(9_000_000_000_000),
    currency: z.string().trim().regex(/^[A-Z]{3}$/),
    category: z.string().trim().min(1).max(50),
    date: dateSchema,
    notes: z.string().trim().max(500).default(""),
    accountId: z.string().trim().nullable().default(null),
  }),
  z.object({
    kind: z.literal("note"),
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(10_000),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
    isPinned: z.boolean().default(false),
    isImportant: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("event"),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1_000).default(""),
    startAt: dateTimeSchema,
    endAt: dateTimeSchema,
    allDay: z.boolean().default(false),
    tag: z.string().trim().min(1).max(40).default("Pessoal"),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffd600"),
  }).refine((event) => new Date(event.endAt) >= new Date(event.startAt), { message: "O término deve ser posterior ao início." }),
  z.object({
    kind: z.literal("clarification"),
    question: z.string().trim().min(1).max(240),
  }),
]);

export const assistantResultSchema = z.object({
  action: assistantActionSchema,
  confirmation: z.string().trim().min(1).max(240),
  provider: z.enum(["gemini", "local"]),
  model: z.string().trim().min(1).max(80),
});

export const quickCaptureRequestSchema = z.object({
  message: z.string().trim().min(2).max(500),
  timezone: z.string().trim().min(1).max(80),
  today: dateSchema,
  currencies: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(20),
  accounts: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })).max(100),
});

export type AssistantAction = z.infer<typeof assistantActionSchema>;
export type AssistantResult = z.infer<typeof assistantResultSchema>;
export type QuickCaptureRequest = z.infer<typeof quickCaptureRequestSchema>;
