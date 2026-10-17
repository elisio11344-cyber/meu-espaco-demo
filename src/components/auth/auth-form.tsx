"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, register } from "@/lib/auth/actions";
import type { AuthState } from "@/lib/auth/schema";
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState<AuthState, FormData>(isRegister ? register : login, {});
  const fields = [{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }, { name: "password", label: "Senha", type: "password", autoComplete: isRegister ? "new-password" : "current-password" }, ...(isRegister ? [{ name: "confirmPassword", label: "Confirme sua senha", type: "password", autoComplete: "new-password" }] : [])];
  return <><form action={action} noValidate className="space-y-5">
    {fields.map((field) => <div key={field.name}>
      <label className="mb-2 block text-sm font-medium" htmlFor={field.name}>{field.label}</label>
      <input {...field} id={field.name} required disabled={pending} aria-invalid={Boolean(state.fieldErrors?.[field.name])} aria-describedby={state.fieldErrors?.[field.name] ? `${field.name}-error` : field.name === "password" && isRegister ? "password-hint" : undefined} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-[#ffd600] disabled:opacity-60" />
      {field.name === "password" && isRegister && <p id="password-hint" className="mt-2 text-xs text-black/45">Use pelo menos 8 caracteres.</p>}
      {state.fieldErrors?.[field.name] && <p id={`${field.name}-error`} className="mt-2 text-sm text-red-700">{state.fieldErrors[field.name]?.[0]}</p>}
    </div>)}
    <div aria-live="polite">{state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}{state.success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}</div>
    <button disabled={pending} className="w-full rounded-xl bg-black px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-black/80 disabled:opacity-60">{pending ? "Aguarde…" : isRegister ? "Criar conta" : "Entrar"}</button>
  </form><p className="mt-6 text-center text-sm text-black/55">{isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <Link className="font-black underline decoration-[#ffd600] decoration-4 underline-offset-4" href={isRegister ? "/login" : "/registro"}>{isRegister ? "Entrar" : "Criar conta"}</Link></p></>;
}
