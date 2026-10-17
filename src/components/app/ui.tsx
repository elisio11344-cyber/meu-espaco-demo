"use client";

import { useEffect } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action: React.ReactNode }) {
  return <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">{description}</p></div>{action}</header>;
}

export function Modal({ title, description, open, onClose, children }: { title: string; description: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] grid items-end bg-black/60 p-0 sm:place-items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7">
      <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">Novo registro</p><h2 id="modal-title" className="mt-1 text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-black/50">{description}</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/15 text-xl" aria-label="Fechar">×</button></div>
      <div className="mt-6">{children}</div>
    </section>
  </div>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-black/40">{hint}</span>}</label>;
}

export const fieldClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]";
export const primaryButtonClass = "inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40";
