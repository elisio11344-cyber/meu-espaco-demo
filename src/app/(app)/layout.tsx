import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logout } from "@/lib/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authEnabled = isSupabaseConfigured();
  let userEmail: string | undefined;
  let userName: string | undefined;
  let userId: string | undefined;
  if (authEnabled) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email;
    userId = data.user?.id;
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", data.user.id).maybeSingle();
      userName = profile?.display_name || data.user.user_metadata.display_name;
    }
  }
  return <AppShell authEnabled={authEnabled} userEmail={userEmail} userName={userName} userId={userId} logoutAction={logout}>{children}</AppShell>;
}
