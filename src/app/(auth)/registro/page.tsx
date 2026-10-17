import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Criar conta" };
export default function RegisterPage() { return <><p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">Sua conta</p><h1 className="mt-2 text-3xl font-black">Crie seu espaço</h1><p className="mb-8 mt-2 text-sm text-black/50">Comece com seu e-mail e uma senha segura.</p><AuthForm mode="register" /></>; }
