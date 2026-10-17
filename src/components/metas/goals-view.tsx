"use client";

import { FormEvent, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { useGamification } from "@/lib/gamification";
import { createId, useLocalCollection, type Goal } from "@/lib/local-data";

export function GoalsView() {
  const [goals, setGoals] = useLocalCollection<Goal>("foco-goals", []);
  const { balance, awardPoints } = useGamification();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(goal: Goal) { setEditing(goal); setOpen(true); }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const goal: Goal = { id: editing?.id ?? createId("goal"), title: String(data.get("title")), category: String(data.get("category")), target: Number(data.get("target")), current: Number(data.get("current")), deadline: String(data.get("deadline")), status: String(data.get("status")) as Goal["status"], pointsReward: Number(data.get("pointsReward")), isImportant: data.get("isImportant") === "on", completedAt: editing?.completedAt };
    setGoals((current) => editing ? current.map((item) => item.id === editing.id ? goal : item) : [goal, ...current]);
    setOpen(false);
  }

  function completeGoal(goal: Goal) {
    if (goal.status === "completed") return;
    setGoals((items) => items.map((item) => item.id === goal.id ? { ...item, current: item.target, status: "completed", completedAt: new Date().toISOString() } : item));
    awardPoints(goal.pointsReward ?? 100, "goal_completion", goal.id, `Meta concluída: ${goal.title}`);
  }

  function toggleImportant(goal: Goal) {
    setGoals((items) => items.map((item) => item.id === goal.id ? { ...item, isImportant: !item.isImportant } : item));
  }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Direção" title="Metas" description="Transforme objetivos em números, conclua etapas e ganhe pontos pelo resultado." action={<button type="button" onClick={openCreate} className={primaryButtonClass}>+ Nova meta</button>} />
    <div className="mt-7 flex items-center justify-between rounded-2xl bg-[#ffd600] p-5"><div><p className="text-xs font-black uppercase tracking-wider text-black/45">Carteira de pontos</p><p className="mt-1 text-3xl font-black">{balance} pts</p></div><span className="text-4xl">★</span></div>
    <section className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{goals.map((goal) => { const status = goal.status ?? (goal.current >= goal.target ? "completed" : "in_progress"); const progress = Math.min(100, Math.round(goal.current / goal.target * 100)); const important = goal.isImportant ?? false; return <article key={goal.id} className={`rounded-3xl border p-6 transition ${important ? "border-[#ffd600] bg-black text-white shadow-[0_16px_45px_rgba(0,0,0,0.16)]" : "border-black/10 bg-white"}`}><div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${important ? "bg-[#ffd600] text-black" : "bg-[#fff5b3]"}`}>{goal.category}</span>{status === "completed" && <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">Concluída</span>}</div><button type="button" onClick={() => openEdit(goal)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${important ? "border-white/15" : "border-black/10"}`}>Editar</button></div><label className={`mt-5 flex w-fit cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${important ? "bg-[#ffd600] text-black" : "bg-black/5 text-black/55"}`}><input type="checkbox" checked={important} onChange={() => toggleImportant(goal)} className="h-4 w-4 accent-black" />★ Meta importante</label><h2 className="mt-5 text-2xl font-black leading-tight">{goal.title}</h2><div className="mt-8 flex items-end justify-between"><div><p className={`text-xs ${important ? "text-white/45" : "text-black/40"}`}>Progresso</p><p className="mt-1 text-xl font-black">{goal.current.toLocaleString("pt-BR")} <span className="text-sm opacity-40">/ {goal.target.toLocaleString("pt-BR")}</span></p></div><p className="text-xl font-black">{progress}%</p></div><div className={`mt-4 h-2 overflow-hidden rounded-full ${important ? "bg-white/15" : "bg-black/10"}`}><div className="h-full rounded-full bg-[#ffd600]" style={{ width: `${progress}%` }} /></div><div className={`mt-5 flex items-center justify-between text-xs ${important ? "text-white/45" : "text-black/40"}`}><span>{new Date(`${goal.deadline}T12:00:00`).toLocaleDateString("pt-BR")}</span><span className="font-bold text-amber-500">+{goal.pointsReward ?? 100} pts</span></div>{status !== "completed" && <div className="mt-5 flex gap-2"><button type="button" onClick={() => setGoals((items) => items.map((item) => item.id === goal.id ? { ...item, current: Math.min(item.target, Number((item.current + item.target * .05).toFixed(2))), status: "in_progress" } : item))} className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold ${important ? "bg-white/10" : "bg-black/5"}`}>+ 5% de progresso</button><button type="button" onClick={() => completeGoal(goal)} className="flex-1 rounded-xl bg-[#ffd600] px-3 py-2.5 text-xs font-black text-black">Concluir meta</button></div>}</article>; })}</section>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar meta" : "Definir uma meta"} description="Alterar a meta não apaga seu histórico de pontos ou conclusão."><form onSubmit={saveGoal} className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome da meta"><input className={fieldClass} name="title" required defaultValue={editing?.title} placeholder="Ex.: Economizar para uma viagem" /></Field></div><Field label="Categoria"><select className={fieldClass} name="category" defaultValue={editing?.category}><option>Finanças</option><option>Saúde</option><option>Estudo</option><option>Carreira</option><option>Pessoal</option></select></Field><Field label="Status"><select className={fieldClass} name="status" defaultValue={editing?.status ?? "not_started"}><option value="not_started">Não iniciada</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></Field><Field label="Prazo"><input className={fieldClass} name="deadline" type="date" required defaultValue={editing?.deadline} /></Field><Field label="Valor-alvo"><input className={fieldClass} name="target" type="number" min="1" step="0.01" required defaultValue={editing?.target} /></Field><Field label="Progresso atual"><input className={fieldClass} name="current" type="number" min="0" step="0.01" defaultValue={editing?.current ?? 0} required /></Field><Field label="Pontos ao concluir"><input className={fieldClass} name="pointsReward" type="number" min="0" defaultValue={editing?.pointsReward ?? 100} required /></Field><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-[#fffbea] p-4 sm:col-span-2"><input type="checkbox" name="isImportant" defaultChecked={editing?.isImportant ?? false} className="h-5 w-5 accent-black" /><span><span className="block text-sm font-black">Destacar como importante</span><span className="mt-0.5 block text-xs text-black/45">A meta ganhará destaque aqui e no dashboard.</span></span></label><div className="flex items-end justify-end gap-3 sm:col-span-2">{editing && <button type="button" onClick={() => { setGoals((items) => items.filter((item) => item.id !== editing.id)); setOpen(false); }} className="mr-auto py-3 text-sm font-bold text-red-700">Excluir</button>}<button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar meta</button></div></form></Modal>
  </div>;
}
