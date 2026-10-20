"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppPreferencesProvider } from "@/lib/app-preferences";
import { useI18n, type Language } from "@/lib/i18n";
import { FirstVisitGuide, type GuideContent } from "./first-visit-guide";

type IconName = "dashboard" | "calendar" | "habits" | "notes" | "goals" | "finance" | "rewards" | "account";

const navigation: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Visão geral", icon: "dashboard" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/habitos", label: "Hábitos", icon: "habits" },
  { href: "/notas", label: "Notas", icon: "notes" },
  { href: "/metas", label: "Metas", icon: "goals" },
  { href: "/financas", label: "Finanças", icon: "finance" },
  { href: "/recompensas", label: "Recompensas", icon: "rewards" },
  { href: "/conta", label: "Minha conta", icon: "account" },
];

const guides: Record<string, GuideContent> = {
  "/dashboard": {
    title: "Sua visão geral",
    description: "Conheça os atalhos e controles do painel principal.",
    steps: [
      { button: "Captura inteligente", title: "Adicione falando ou escrevendo", description: "Abra o botão flutuante e descreva uma despesa, nota ou compromisso. Você pode digitar ou tocar no microfone." },
      { button: "+ Novo hábito", title: "Crie uma rotina", description: "Abre a página de Hábitos para você cadastrar a primeira atividade recorrente." },
      { button: "AUD · BRL · USD", title: "Escolha como ver o patrimônio", description: "Troca a moeda usada para exibir o valor total convertido das suas contas." },
      { button: "Cartões de hábitos", title: "Conclua sem sair do painel", description: "Toque no círculo de um hábito para marcar a atividade de hoje como concluída." },
      { button: "Agenda flutuante", title: "Veja as obrigações de hoje", description: "O botão amarelo no canto abre uma prévia dos compromissos do dia." },
    ],
  },
  "/agenda": {
    title: "Organize seu tempo",
    description: "Veja o que cada controle do calendário faz.",
    steps: [
      { button: "+ Novo compromisso", title: "Adicione um evento", description: "Abre o formulário com data, horário, etiqueta, cor e descrição." },
      { button: "← Hoje →", title: "Navegue pelo calendário", description: "Avance ou volte um período; Hoje retorna imediatamente para a data atual." },
      { button: "Dia · Semana · Mês · Ano", title: "Mude a visualização", description: "Escolha o nível de detalhe mais adequado para planejar seu tempo." },
      { button: "Todas", title: "Filtre por etiqueta", description: "Mostra somente os compromissos da categoria selecionada." },
    ],
  },
  "/habitos": {
    title: "Construa constância",
    description: "Use estes controles para criar e acompanhar sua rotina.",
    steps: [
      { button: "+ Novo hábito", title: "Cadastre um hábito", description: "Defina frequência, meta, unidade, categoria e pontos por conclusão." },
      { button: "○ Concluir", title: "Registre o dia", description: "O círculo ao lado do hábito marca ou desmarca a conclusão de hoje." },
      { button: "Editar", title: "Atualize a rotina", description: "Altere qualquer informação do hábito ou exclua o item." },
      { button: "? Tutorial", title: "Reabra esta explicação", description: "O botão no menu lateral mostra este carrossel novamente." },
    ],
  },
  "/notas": {
    title: "Monte seu segundo cérebro",
    description: "Conheça os controles para registrar e conectar ideias.",
    steps: [
      { button: "+ Nova nota", title: "Registre uma ideia", description: "Crie uma nota com conteúdo, etiquetas e conexões com outras notas." },
      { button: "Todas as notas · Brain", title: "Alterne a visualização", description: "Veja os cartões de texto ou o mapa visual das conexões." },
      { button: "Buscar notas", title: "Encontre rapidamente", description: "Pesquisa pelo título, conteúdo e etiquetas das suas notas." },
      { button: "Fixar · ★ Importante", title: "Dê destaque", description: "Fixar leva a nota ao dashboard; Importante muda seu visual e cria uma estrela no Brain." },
      { button: "Editar", title: "Atualize ou conecte", description: "Altere o texto, as etiquetas e os vínculos sem recriar a nota." },
    ],
  },
  "/metas": {
    title: "Transforme planos em progresso",
    description: "Use os controles para priorizar e concluir objetivos.",
    steps: [
      { button: "+ Nova meta", title: "Defina um objetivo", description: "Cadastre prazo, valor-alvo, progresso atual e pontos de recompensa." },
      { button: "★ Meta importante", title: "Leve a prioridade ao topo", description: "Destaca a meta nesta página e também na visão geral." },
      { button: "+ 5% de progresso", title: "Registre pequenos avanços", description: "Aumenta rapidamente o progresso da meta em cinco por cento." },
      { button: "Concluir meta", title: "Finalize e receba pontos", description: "Marca a meta como concluída e credita a recompensa na carteira." },
      { button: "Editar", title: "Ajuste qualquer detalhe", description: "Permite alterar ou excluir a meta existente." },
    ],
  },
  "/financas": {
    title: "Organize suas finanças",
    description: "Conheça cada ação disponível no controle financeiro.",
    steps: [
      { button: "Gerenciar moedas", title: "Escolha suas moedas", description: "Adicione uma moeda pelo código ISO ou exclua uma moeda sem dados vinculados." },
      { button: "+ Conta bancária", title: "Cadastre uma conta", description: "Informe banco, moeda e saldo inicial para começar o controle." },
      { button: "+ Movimentação", title: "Registre entradas e despesas", description: "Adiciona um lançamento na moeda e na conta selecionadas." },
      { button: "AUD · BRL · USD", title: "Alterne entre moedas", description: "Cada botão mostra somente as contas e movimentações daquela moeda." },
      { button: "Editar", title: "Corrija lançamentos e contas", description: "Abra um item existente para alterar seus dados, excluir ou arquivar." },
    ],
  },
  "/recompensas": {
    title: "Use seus pontos",
    description: "Veja como criar e resgatar recompensas pessoais.",
    steps: [
      { button: "+ Nova recompensa", title: "Monte sua loja", description: "Defina algo motivador e escolha o custo em pontos." },
      { button: "Comprar", title: "Resgate uma recompensa", description: "Debita o custo da carteira e registra a compra no histórico." },
      { button: "Editar", title: "Atualize a recompensa", description: "Altere título, descrição ou custo; também permite excluir o item." },
      { button: "Histórico de pontos", title: "Acompanhe o saldo", description: "Mostra pontos recebidos por hábitos e metas e valores gastos em resgates." },
    ],
  },
  "/conta": {
    title: "Cuide da sua conta",
    description: "Conheça os controles de perfil, acesso e aparência.",
    steps: [
      { button: "Salvar perfil", title: "Atualize seus dados", description: "Salva o nome exibido e o fuso horário usado no aplicativo." },
      { button: "Solicitar alteração", title: "Troque o e-mail", description: "Envia o processo de confirmação para o novo endereço." },
      { button: "Alterar senha", title: "Proteja seu acesso", description: "Confirma a senha atual antes de definir uma nova." },
      { button: "◐ Escuro · ☀ Claro", title: "Mude o tema", description: "Alterna a aparência e guarda a preferência somente para esta conta." },
      { button: "Sair da conta", title: "Encerre a sessão", description: "Remove a sessão atual e volta para a tela de login." },
    ],
  },
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h.01M7 18h2M12 18h2"/></>,
    habits: <><path d="M8 12.5l2.6 2.6L16.5 9"/><path d="M12 3a9 9 0 1 0 9 9"/><path d="M16 3h5v5"/></>,
    notes: <><path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M8 11h8M8 15h8"/></>,
    goals: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    finance: <><path d="M4 7h16v12H4zM4 10h16"/><path d="M8 15h3"/></>,
    rewards: <><path d="M4 10h16v11H4zM12 10v11M3 6h18v4H3z"/><path d="M12 6c-2-4-7-3-5 0h5Zm0 0c2-4 7-3 5 0h-5Z"/></>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AppShell({ children, authEnabled = false, userEmail, userName, userId, logoutAction }: { children: React.ReactNode; authEnabled?: boolean; userEmail?: string; userName?: string; userId?: string; logoutAction?: () => Promise<unknown> }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [guideSignal, setGuideSignal] = useState(0);
  const userKey = userId || "local";
  const guide = guides[pathname];

  useEffect(() => {
    const saved = window.localStorage.getItem(`foco:${userKey}:theme`);
    const nextDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }, [userKey]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(`foco:${userKey}:theme`, next ? "dark" : "light");
  }

  return <AppPreferencesProvider userKey={userKey}><div className="app-frame min-h-dvh bg-[var(--background)] text-[var(--foreground)] md:flex">
    <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#ffd600] focus:px-4 focus:py-2 focus:font-semibold">Pular para o conteúdo</a>
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/10 bg-[#0c0c0c] px-5 text-white md:hidden">
      <Brand />
      <div className="flex items-center gap-2"><button type="button" onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-full border border-white/20" aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}>{dark ? "☀" : "◐"}</button><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" className="grid h-10 w-10 place-items-center rounded-full border border-white/20" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>
        <span className="text-xl leading-none">{menuOpen ? "×" : "≡"}</span>
      </button></div>
    </header>
    {menuOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/55 md:hidden" />}
    <aside id="mobile-navigation" className={`command-rail fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-72 flex-col overflow-y-auto bg-[#0c0c0c] p-5 text-white transition-transform duration-300 md:sticky md:top-0 md:h-dvh md:w-64 md:translate-x-0 md:p-6 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="hidden md:block"><Brand /></div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:mt-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffd600]">Hoje</p>
        <p className="mt-1 text-sm font-medium">Organize. Faça. Evolua.</p>
      </div>
      <nav aria-label="Menu principal" className="mt-6 space-y-1">
        {navigation.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#ffd600] text-black" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
            <Icon name={icon} />
            <span>{label}</span>
            {active && <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-black" />}
          </Link>;
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-5">
        <LanguageSwitcher />
        <div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={toggleTheme} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/10">{dark ? "☀ Claro" : "◐ Escuro"}</button>{guide && <button type="button" onClick={() => setGuideSignal((value) => value + 1)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/10">? Tutorial</button>}</div>
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ffd600] text-sm font-black text-black">{getInitials(userName)}</div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{userName || "Meu espaço"}</p><p className="truncate text-xs text-white/40">{authEnabled ? userEmail ?? "Conta conectada" : "Modo local"}</p></div>
        </div>
        {authEnabled && logoutAction ? <button type="button" onClick={() => void logoutAction()} className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-left text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white">Sair da conta</button> : <p className="mt-3 px-2 text-[11px] leading-relaxed text-white/30">Demonstração local. Os dados ficam somente neste navegador.</p>}
      </div>
    </aside>
    <main id="content" className="app-content min-w-0 flex-1 px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-14">{children}</main>
    {guide && <FirstVisitGuide storageKey={`foco:${userKey}:tutorial:${pathname}`} content={guide} reopenSignal={guideSignal} />}
  </div></AppPreferencesProvider>;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const options: Array<{ code: Language; label: string }> = [{ code: "pt", label: "PT" }, { code: "en", label: "EN" }, { code: "es", label: "ES" }];
  return <div className="language-switcher mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Idioma da interface">
    {options.map((option) => <button key={option.code} type="button" onClick={() => setLanguage(option.code)} aria-pressed={language === option.code} className={`rounded-lg px-2 py-2 text-[10px] font-black tracking-[0.16em] transition ${language === option.code ? "bg-[#ffd600] text-black shadow-[0_4px_18px_rgba(255,214,0,.2)]" : "text-white/40 hover:bg-white/10 hover:text-white"}`}>{option.label}</button>)}
  </div>;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "EU";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function Brand() {
  return <Link href="/dashboard" className="brand-lockup flex items-center gap-3" aria-label="Foco — início">
    <span className="brand-mark grid h-9 w-9 place-items-center rounded-[10px] bg-[#ffd600] font-black text-black">F</span>
    <span><span className="block text-sm font-black uppercase tracking-[0.16em]">Foco</span><span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">Meu espaço</span></span>
  </Link>;
}
