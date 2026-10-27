"use client";

import { interpretLocally } from "./local-parser";
import { assistantResultSchema, quickCaptureRequestSchema, type AssistantResult, type QuickCaptureRequest } from "./schema";

export async function interpretQuickCapture(input: QuickCaptureRequest): Promise<AssistantResult> {
  const request = quickCaptureRequestSchema.parse(input);
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === "true") return interpretLocally(request);

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("quick-capture", { body: request });
  if (error) {
    const fallback = usefulLocalFallback(request);
    if (fallback) return fallback;
    throw new Error(await readableFunctionError(error));
  }
  const result = assistantResultSchema.safeParse(data);
  if (result.success) return result.data;
  const fallback = usefulLocalFallback(request);
  if (fallback) return fallback;
  throw new Error("A resposta inteligente veio incompleta. Reformule o comando e tente novamente.");
}

function usefulLocalFallback(request: QuickCaptureRequest) {
  const fallback = interpretLocally(request);
  if (fallback.action.kind !== "clarification" || !fallback.action.question.startsWith("Posso registrar")) return fallback;
  return null;
}

async function readableFunctionError(error: unknown) {
  if (typeof error === "object" && error && "context" in error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      const payload = await context.json().catch(() => null) as { error?: string } | null;
      if (payload?.error === "gemini_not_configured") return "A integração com o Gemini ainda precisa da chave no Supabase.";
      if (payload?.error === "authentication_required") return "Sua sessão expirou. Entre novamente para usar a captura inteligente.";
      if (payload?.error === "rate_limit_exceeded") return "Você enviou muitos comandos. Aguarde um minuto e tente novamente.";
    }
  }
  return "Não foi possível interpretar o comando agora. Tente novamente em instantes.";
}
