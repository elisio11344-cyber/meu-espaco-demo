"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth/errors";
import { emailChangeSchema, passwordChangeSchema, profileSchema, type AccountState } from "./schema";

const connectionError = "Não foi possível conectar. Tente novamente em instantes.";

export async function updateProfile(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) return { error: "Sua sessão expirou. Entre novamente." };

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
    }, { onConflict: "user_id" });
    if (error) return { error: "Não foi possível salvar os dados da conta." };

    await supabase.auth.updateUser({ data: {
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
    } });
  } catch {
    return { error: connectionError };
  }

  revalidatePath("/", "layout");
  return { success: "Dados da conta atualizados." };
}

export async function updateEmail(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = emailChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sua sessão expirou. Entre novamente." };
    if (user.email?.toLowerCase() === parsed.data.email) return { error: "Este já é o e-mail atual da conta." };

    const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
    if (error) return { error: authErrorMessage(error.code) };
  } catch {
    return { error: connectionError };
  }

  return { success: "Solicitação enviada. Confirme a alteração pelos e-mails recebidos." };
}

export async function updatePassword(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user?.email || userError) return { error: "Sua sessão expirou. Entre novamente." };

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (passwordError) return { error: "A senha atual está incorreta." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) return { error: authErrorMessage(error.code) };
  } catch {
    return { error: connectionError };
  }

  return { success: "Senha alterada com sucesso." };
}
