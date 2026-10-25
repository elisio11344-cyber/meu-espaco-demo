"use client";

import { useActionState, useEffect, useState } from "react";
import { logout } from "@/lib/auth/actions";
import { updateEmail, updatePassword, updateProfile } from "@/lib/conta/actions";
import type { AccountState } from "@/lib/conta/schema";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { useAppPreferences } from "@/lib/app-preferences";

const timezones = [
  { value: "Australia/Sydney", label: "Sydney, Austrália" },
  { value: "America/Sao_Paulo", label: "Brasília, Brasil" },
  { value: "America/New_York", label: "Nova York, Estados Unidos" },
  { value: "America/Los_Angeles", label: "Los Angeles, Estados Unidos" },
  { value: "Europe/London", label: "Londres, Reino Unido" },
  { value: "UTC", label: "UTC" },
];

export function AccountView({ email, displayName, timezone, authEnabled }: { email: string; displayName: string; timezone: string; authEnabled: boolean }) {
  const { userKey } = useAppPreferences();
  const [profileState, profileAction, profilePending] = useActionState<AccountState, FormData>(updateProfile, {});
  const [emailState, emailAction, emailPending] = useActionState<AccountState, FormData>(updateEmail, {});
  const [passwordState, passwordAction, passwordPending] = useActionState<AccountState, FormData>(updatePassword, {});
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

  function clearLocalData() {
    const prefix = `foco:${userKey}:`;
    Object.keys(window.localStorage).filter((key) => key.startsWith(prefix) && !key.endsWith(":theme") && !key.endsWith(":language")).forEach((key) => window.localStorage.removeItem(key));
    setClearOpen(false);
    window.location.assign("/dashboard");
  }

  return <div className="mx-auto max-w-[1120px]">
    <PageHeader eyebrow="Preferências e segurança" title="Minha conta" description="Atualize seus dados pessoais, acesso e preferências do aplicativo." action={<span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${authEnabled ? "bg-emerald-100 text-emerald-800" : "bg-black/5 text-black/45"}`}>{authEnabled ? "● Conta conectada" : "Modo de demonstração"}</span>} />

    {!authEnabled && <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Conecte o Supabase para salvar alterações e gerenciar o acesso desta conta.</div>}

    <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] sm:p-7">
        <SectionHeading eyebrow="Perfil" title="Dados pessoais" description="Essas informações personalizam seu espaço e a exibição de datas." />
        <form action={profileAction} className="mt-6 space-y-5">
          <Field label="Nome"><input name="displayName" defaultValue={displayName} disabled={!authEnabled || profilePending} className={fieldClass} autoComplete="name" aria-invalid={Boolean(profileState.fieldErrors?.displayName)} /></Field>
          <Field label="Fuso horário" hint="Datas e horários serão exibidos usando este fuso."><select name="timezone" defaultValue={timezone} disabled={!authEnabled || profilePending} className={fieldClass}>{timezones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Feedback state={profileState} />
          <button disabled={!authEnabled || profilePending} className={primaryButtonClass}>{profilePending ? "Salvando…" : "Salvar perfil"}</button>
        </form>
      </section>

      <section className="rounded-3xl bg-black p-5 text-white sm:p-7">
        <SectionHeading eyebrow="Sessão" title="Acesso à conta" description="Sua sessão atual está protegida pelo Supabase Auth." dark />
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">E-mail conectado</p><p className="mt-2 break-all text-sm font-bold">{email || "Conta de demonstração"}</p></div>
        <button type="button" disabled={!authEnabled} onClick={() => void logout()} className="mt-5 w-full rounded-xl bg-[#ffd600] px-5 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-40">Sair da conta</button>
      </section>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-7">
        <SectionHeading eyebrow="Identidade" title="Alterar e-mail" description="Enviaremos uma confirmação antes de trocar o endereço da conta." />
        <form action={emailAction} className="mt-6 space-y-5">
          <Field label="Novo e-mail"><input name="email" type="email" disabled={!authEnabled || emailPending} className={fieldClass} autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={Boolean(emailState.fieldErrors?.email)} /></Field>
          <Feedback state={emailState} />
          <button disabled={!authEnabled || emailPending} className={primaryButtonClass}>{emailPending ? "Enviando…" : "Solicitar alteração"}</button>
        </form>
      </section>

      <section className="rounded-3xl border border-black/10 bg-[#ffd600] p-5 sm:p-7">
        <SectionHeading eyebrow="Segurança" title="Alterar senha" description="Confirme sua senha atual e escolha uma nova senha segura." />
        <form action={passwordAction} className="mt-6 space-y-4">
          <PasswordField name="currentPassword" label="Senha atual" error={passwordState.fieldErrors?.currentPassword?.[0]} disabled={!authEnabled || passwordPending} autoComplete="current-password" />
          <PasswordField name="newPassword" label="Nova senha" error={passwordState.fieldErrors?.newPassword?.[0]} disabled={!authEnabled || passwordPending} autoComplete="new-password" />
          <PasswordField name="confirmPassword" label="Confirmar nova senha" error={passwordState.fieldErrors?.confirmPassword?.[0]} disabled={!authEnabled || passwordPending} autoComplete="new-password" />
          <Feedback state={passwordState} />
          <button disabled={!authEnabled || passwordPending} className={primaryButtonClass}>{passwordPending ? "Alterando…" : "Alterar senha"}</button>
        </form>
      </section>
    </div>
    <section className="foco-panel mt-6 p-5 sm:p-7"><SectionHeading eyebrow="Dados e privacidade" title="Seu espaço, sob seu controle" description="Exporte uma cópia dos registros locais ou recomece com o espaço vazio." /><div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#ffd600]">Armazenamento local</p><p className="mt-2 text-3xl font-black">{formatBytes(storageBytes)}</p><p className="mt-1 text-xs text-[var(--muted)]">Estimativa dos dados do FOCO salvos neste navegador.</p></div><div className="flex flex-col gap-2 sm:flex-row md:flex-col"><button type="button" onClick={exportData} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">↓ Exportar dados</button><button type="button" onClick={() => setClearOpen(true)} className="rounded-xl border border-red-500/25 px-5 py-3 text-sm font-bold text-red-400">Limpar todos os dados</button></div></div></section>
    <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Limpar todos os dados?" description="Hábitos, notas, metas, finanças, agenda e recompensas deste navegador serão removidos. Esta ação não pode ser desfeita."><div className="flex justify-end gap-3"><button type="button" onClick={() => setClearOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button type="button" onClick={clearLocalData} className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white">Sim, limpar dados</button></div></Modal>
  </div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function SectionHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div><p className={`text-xs font-black uppercase tracking-[0.16em] ${dark ? "text-[#ffd600]" : "text-black/40"}`}>{eyebrow}</p><h2 className="mt-2 text-2xl font-black">{title}</h2><p className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/45" : "text-black/50"}`}>{description}</p></div>;
}

function PasswordField({ name, label, error, disabled, autoComplete }: { name: string; label: string; error?: string; disabled: boolean; autoComplete: string }) {
  return <Field label={label}><input name={name} type="password" disabled={disabled} className={fieldClass} autoComplete={autoComplete} aria-invalid={Boolean(error)} />{error && <p className="mt-2 text-sm font-medium text-red-800">{error}</p>}</Field>;
}

function Feedback({ state }: { state: AccountState }) {
  return <div aria-live="polite">{state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}{state.success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}</div>;
}
