"use client";

import { useEffect, useState } from "react";
import { Modal, PageHeader } from "@/components/app/ui";
import { useAppPreferences } from "@/lib/app-preferences";

export function DemoAccountView() {
  const { userKey } = useAppPreferences();
  const [storageBytes, setStorageBytes] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    const prefix = `foco:${userKey}:`;
    setStorageBytes(Object.keys(window.localStorage).filter((key) => key.startsWith(prefix)).reduce((total, key) => total + key.length + (window.localStorage.getItem(key)?.length ?? 0), 0) * 2);
  }, [userKey]);

  function exportData() {
    const prefix = `foco:${userKey}:`;
    const data = Object.fromEntries(Object.keys(window.localStorage).filter((key) => key.startsWith(prefix)).map((key) => [key, window.localStorage.getItem(key)]));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `foco-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearData() {
    const prefix = `foco:${userKey}:`;
    Object.keys(window.localStorage).filter((key) => key.startsWith(prefix) && !key.endsWith(":theme") && !key.endsWith(":language")).forEach((key) => window.localStorage.removeItem(key));
    setClearOpen(false);
    window.location.assign("../dashboard/");
  }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Demonstração pública" title="Minha conta" description="Gerencie preferências e os dados locais desta demonstração." action={<span className="rounded-full border border-[#ffd600]/35 bg-[#ffd600]/10 px-4 py-2 text-xs font-black text-[#ffd600]">● Modo local</span>} />
    <div className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="foco-panel p-6"><div className="flex items-center gap-4 border-b border-[var(--border)] pb-6"><span className="grid h-20 w-20 place-items-center rounded-full bg-[#ffd600] text-3xl font-black text-black">V</span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd600]">Perfil local</p><h2 className="mt-1 text-2xl font-black">Visitante</h2><p className="mt-1 text-sm text-[var(--muted)]">Seus dados ficam apenas neste navegador.</p></div></div><div className="mt-6 space-y-1"><Preference label="Idioma" value="Português (BR)"/><Preference label="Tema" value="Use o controle do menu"/><Preference label="Fuso horário" value={Intl.DateTimeFormat().resolvedOptions().timeZone}/><Preference label="Formato de data" value={new Date().toLocaleDateString("pt-BR")}/><Preference label="Formato de número" value="1.000,00"/></div></section>
      <div className="space-y-6"><section className="foco-panel p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd600]">Armazenamento local</p><p className="mt-4 text-4xl font-black">{storageBytes < 1024 ? `${storageBytes} B` : `${(storageBytes / 1024).toFixed(1)} KB`}</p><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Estimativa dos registros do FOCO salvos neste navegador.</p><div className="mt-6 grid gap-2"><button type="button" onClick={exportData} className="rounded-xl bg-[#ffd600] px-5 py-3 text-sm font-black text-black">↓ Exportar dados</button><button type="button" onClick={() => setClearOpen(true)} className="rounded-xl border border-red-500/25 px-5 py-3 text-sm font-bold text-red-400">Limpar todos os dados</button></div></section><section className="foco-panel p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd600]">Sobre o FOCO</p><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span className="text-[var(--muted)]">Versão</span><strong>2.0 demo</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Tecnologia</span><strong>Next.js</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Sincronização</span><strong>Local</strong></p></div></section></div>
    </div>
    <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Limpar todos os dados?" description="Os registros locais serão removidos deste navegador. Esta ação não pode ser desfeita."><div className="flex justify-end gap-3"><button type="button" onClick={() => setClearOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button type="button" onClick={clearData} className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white">Sim, limpar dados</button></div></Modal>
  </div>;
}

function Preference({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-4 transition hover:bg-white/[0.03]"><span className="font-bold">{label}</span><span className="text-right text-sm text-[var(--muted)]">{value}</span></div>;
}
