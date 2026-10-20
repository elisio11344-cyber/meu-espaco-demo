import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { z } from "npm:zod@4.1.12";

const requestSchema = z.object({
  message: z.string().trim().min(2).max(500),
  timezone: z.string().trim().min(1).max(80),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currencies: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(20),
  accounts: z.array(z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(100), currency: z.string().regex(/^[A-Z]{3}$/) })).max(100),
});

const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("transaction"), type: z.enum(["expense", "income"]), description: z.string().trim().min(1).max(120), amountCents: z.number().int().positive(), currency: z.string().regex(/^[A-Z]{3}$/), category: z.string().trim().min(1).max(50), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().trim().max(500).default(""), accountId: z.string().trim().nullable().default(null) }),
  z.object({ kind: z.literal("note"), title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(10_000), tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]), isPinned: z.boolean().default(false), isImportant: z.boolean().default(false) }),
  z.object({ kind: z.literal("event"), title: z.string().trim().min(1).max(120), description: z.string().trim().max(1_000).default(""), startAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }), allDay: z.boolean().default(false), tag: z.string().trim().min(1).max(40).default("Pessoal"), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffd600") }),
  z.object({ kind: z.literal("clarification"), question: z.string().trim().min(1).max(240) }),
]);

const geminiResponseSchema = z.object({
  confirmation: z.string().trim().min(1).max(240),
  action: actionSchema,
});

const jsonSchema = {
  type: "OBJECT",
  properties: {
    confirmation: { type: "STRING", description: "Short confirmation or clarification in Brazilian Portuguese." },
    action: {
      type: "OBJECT",
      properties: {
        kind: { type: "STRING", enum: ["transaction", "note", "event", "clarification"] },
        type: { type: "STRING", enum: ["expense", "income"] },
        description: { type: "STRING" },
        amountCents: { type: "INTEGER" },
        currency: { type: "STRING" },
        category: { type: "STRING" },
        date: { type: "STRING" },
        notes: { type: "STRING" },
        accountId: { type: "STRING", nullable: true },
        title: { type: "STRING" },
        content: { type: "STRING" },
        tags: { type: "ARRAY", items: { type: "STRING" } },
        isPinned: { type: "BOOLEAN" },
        isImportant: { type: "BOOLEAN" },
        startAt: { type: "STRING" },
        endAt: { type: "STRING" },
        allDay: { type: "BOOLEAN" },
        tag: { type: "STRING" },
        color: { type: "STRING" },
        question: { type: "STRING" },
      },
      required: ["kind"],
    },
  },
  required: ["confirmation", "action"],
};

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000,http://127.0.0.1:3000,https://elisio11344-cyber.github.io")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" } });
}

function getPublishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
  return keys.default;
}

function systemPrompt(context: z.infer<typeof requestSchema>) {
  return `You convert a single user message into exactly one productivity action. Return JSON only and follow the response schema.

Rules:
- The user writes primarily in Brazilian Portuguese, but may write in English or Spanish.
- Today is ${context.today} in timezone ${context.timezone}. Resolve hoje/today/hoy, ontem/yesterday/ayer and amanhã/tomorrow/mañana from this date.
- Money is always an integer number of cents. 200 reais means amountCents 20000.
- Supported currencies: ${context.currencies.join(", ")}.
- "real", "reais" and R$ mean BRL; "dólar australiano" means AUD; "dólar americano" means USD.
- Available accounts: ${JSON.stringify(context.accounts)}.
- For a transaction, choose an accountId only from the available accounts with the same currency. Use null when none exists.
- Common financial categories in Portuguese: Comida, Jogos, Aluguel, Saúde, Contas, Transporte, Lazer, Educação, Renda, Outros.
- Dates for transactions use YYYY-MM-DD. Event datetimes must be ISO 8601 with the user's timezone offset.
- If an event has no time, a transaction has no amount, or the intent is ambiguous, return kind clarification with one short question.
- Never invent an amount, date, title, account or private detail.
- A note may be pinned when the user asks to fix it on the dashboard, and important when the user says it is important or highlighted.
- Keep confirmations short, clear and in Brazilian Portuguese.`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json(request, { error: "authentication_required" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !publishableKey) return json(request, { error: "supabase_not_configured" }, 500);

  const supabase = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return json(request, { error: "authentication_required" }, 401);

  const parsedRequest = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedRequest.success) return json(request, { error: "invalid_request", details: parsedRequest.error.flatten() }, 400);

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase.from("assistant_requests").select("id", { count: "exact", head: true }).gte("created_at", oneMinuteAgo);
  if ((count ?? 0) >= 20) return json(request, { error: "rate_limit_exceeded" }, 429);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json(request, { error: "gemini_not_configured" }, 503);
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(parsedRequest.data) }] },
        contents: [{ role: "user", parts: [{ text: parsedRequest.data.message }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: jsonSchema },
      }),
    });
    if (!geminiResponse.ok) throw new Error(`gemini_${geminiResponse.status}`);
    const payload = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const result = geminiResponseSchema.parse(JSON.parse(text));
    await supabase.from("assistant_requests").insert({ user_id: user.id, provider: "gemini", model, action_type: result.action.kind, input_characters: parsedRequest.data.message.length, status: "completed" });
    return json(request, { ...result, provider: "gemini", model });
  } catch (error) {
    await supabase.from("assistant_requests").insert({ user_id: user.id, provider: "gemini", model, action_type: "error", input_characters: parsedRequest.data.message.length, status: "failed" });
    console.error("quick_capture_failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "interpretation_failed" }, 502);
  }
});
