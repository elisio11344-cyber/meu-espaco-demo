"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, type AuthState } from "./schema";
import { authErrorMessage } from "./errors";

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: authErrorMessage(error.code) };
  } catch { return { error: "Não foi possível conectar. Tente novamente em instantes." }; }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
export async function register(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password });
    if (error) return { error: authErrorMessage(error.code) };
    hasSession = Boolean(data.session);
  } catch { return { error: "Não foi possível conectar. Tente novamente em instantes." }; }
  if (hasSession) { revalidatePath("/", "layout"); redirect("/dashboard"); }
  return { success: "Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Verifique sua caixa de entrada antes de entrar." };
}
export async function logout(): Promise<AuthState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Não foi possível sair. Tente novamente." };
  } catch { return { error: "Não foi possível conectar para sair. Tente novamente." }; }
  revalidatePath("/", "layout");
  redirect("/login");
}
