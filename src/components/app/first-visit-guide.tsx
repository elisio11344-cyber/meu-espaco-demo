"use client";

import { useEffect, useState } from "react";

export type GuideContent = {
  title: string;
  description: string;
  steps: Array<{ button: string; title: string; description: string }>;
};

export function FirstVisitGuide({ storageKey, content, reopenSignal }: { storageKey: string; content: GuideContent; reopenSignal: number }) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setOpen(window.localStorage.getItem(storageKey) !== "done");
    setCurrentStep(0);
  }, [storageKey]);

  useEffect(() => {
    if (reopenSignal > 0) {
      setCurrentStep(0);
      setOpen(true);
    }
  }, [reopenSignal]);

  function finish() {
    window.localStorage.setItem(storageKey, "done");
    setOpen(false);
  }

  if (!open) return null;
  const step = content.steps[currentStep];
  const lastStep = currentStep === content.steps.length - 1;
  return <div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="guide-title" className="w-full max-w-xl rounded-t-[2rem] border border-black/10 bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl sm:rounded-[2rem] sm:p-8">
      <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Tutorial da aba · {currentStep + 1} de {content.steps.length}</p><h2 id="guide-title" className="mt-2 text-3xl font-black tracking-tight">{content.title}</h2><p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{content.description}</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffd600] text-xl font-black text-black">?</span></div>

      <div className="mt-7 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6" aria-live="polite">
        <div key={`${storageKey}-${currentStep}`} className="animate-[guide-in_.22s_ease-out]"><span className="inline-flex rounded-xl bg-[#ffd600] px-3 py-2 text-xs font-black text-black">{step.button}</span><h3 className="mt-5 text-xl font-black">{step.title}</h3><p className="mt-2 min-h-12 text-sm leading-relaxed text-[var(--muted)]">{step.description}</p></div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2" aria-label="Progresso do tutorial">{content.steps.map((item, index) => <button key={item.button} type="button" onClick={() => setCurrentStep(index)} aria-label={`Ir para etapa ${index + 1}: ${item.button}`} aria-current={index === currentStep ? "step" : undefined} className={`h-2.5 rounded-full transition-all ${index === currentStep ? "w-8 bg-[#ffd600]" : "w-2.5 bg-[var(--border)]"}`} />)}</div>

      <div className="mt-7 grid grid-cols-2 gap-3"><button type="button" disabled={currentStep === 0} onClick={() => setCurrentStep((stepIndex) => Math.max(0, stepIndex - 1))} className="rounded-xl border border-[var(--border)] px-5 py-3.5 text-sm font-black disabled:opacity-35">Anterior</button>{lastStep ? <button type="button" onClick={finish} className="rounded-xl bg-[#ffd600] px-5 py-3.5 text-sm font-black text-black transition hover:-translate-y-0.5">Concluir tutorial</button> : <button type="button" onClick={() => setCurrentStep((stepIndex) => Math.min(content.steps.length - 1, stepIndex + 1))} className="rounded-xl bg-[#ffd600] px-5 py-3.5 text-sm font-black text-black transition hover:-translate-y-0.5">Próximo</button>}</div>
    </section>
  </div>;
}
