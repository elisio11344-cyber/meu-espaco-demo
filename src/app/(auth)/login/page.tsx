import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Entrar" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <><p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">Acesso privado</p><h1 className="mt-2 text-3xl font-black">Bem-vindo de volta</h1><p className="mb-8 mt-2 text-sm text-black/50">Entre para acessar seu espaço pessoal.</p>{erro === "confirmacao" && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">O link de confirmação é inválido ou expirou. Tente entrar se você já confirmou seu e-mail.</p>}<AuthForm mode="login" /></>;
}
