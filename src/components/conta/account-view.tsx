"use client";

import { useActionState } from "react";
import { logout } from "@/lib/auth/actions";
import { updateEmail, updatePassword, updateProfile } from "@/lib/conta/actions";
import type { AccountState } from "@/lib/conta/schema";
import { Field, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";

const timezones = [
  { value: "Australia/Sydney", label: "Sydney, Austrália" },
  { value: "America/Sao_Paulo", label: "Brasília, Brasil" },
  { value: "America/New_York", label: "Nova York, Estados Unidos" },
  { value: "America/Los_Angeles", label: "Los Angeles, Estados Unidos" },
  { value: "Europe/London", label: "Londres, Reino Unido" },
  { value: "UTC", label: "UTC" },
];

export function AccountView({ email, displayName, timezone, authEnabled }: { email: string; displayName: string; timezone: string; authEnabled: boolean }) {
  const [profileState, profileAction, profilePending] = useActionState<AccountState, FormData>(updateProfile, {});
  const [emailState, emailAction, emailPending] = useActionState<AccountState, FormData>(updateEmail, {});
  const [passwordState, passwordAction, passwordPending] = useActionState<AccountState, FormData>(updatePassword, {});

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
  </div>;
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
