import { LanguageSwitcher } from "@/components/app/app-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="page-grid auth-stage relative flex min-h-dvh items-center justify-center bg-[#0c0c0c] p-5"><div className="absolute right-4 top-4 w-36"><LanguageSwitcher /></div><div className="w-full max-w-md"><div className="mb-8 flex items-center justify-center gap-3 text-white"><span className="brand-mark grid h-11 w-11 place-items-center rounded-xl bg-[#ffd600] text-lg font-black text-black">F</span><span><span className="block text-sm font-black uppercase tracking-[0.18em]">Foco</span><span className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Meu espaço</span></span></div><section className="auth-card rounded-3xl border border-white/10 bg-[#f6f4ed] p-6 shadow-2xl sm:p-9">{children}</section><p className="mt-6 text-center text-xs text-white/35">Um espaço privado para organizar sua vida.</p></div></main>;
}
