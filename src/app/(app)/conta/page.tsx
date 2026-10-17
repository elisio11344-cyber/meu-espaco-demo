import { AccountView } from "@/components/conta/account-view";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const authEnabled = isSupabaseConfigured();
  if (!authEnabled) return <AccountView email="" displayName="Meu espaço" timezone="Australia/Sydney" authEnabled={false} />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("display_name, timezone").eq("user_id", user.id).maybeSingle() : { data: null };

  return <AccountView
    email={user?.email ?? ""}
    displayName={profile?.display_name || user?.user_metadata.display_name || "Meu espaço"}
    timezone={profile?.timezone || user?.user_metadata.timezone || "Australia/Sydney"}
    authEnabled
  />;
}
