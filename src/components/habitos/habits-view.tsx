"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { useGamification } from "@/lib/gamification";
import { createId, useLocalCollection, type Habit } from "@/lib/local-data";

export function HabitsView() {
  const [habits, setHabits] = useLocalCollection<Habit>("foco-habits", []);
  const { balance, awardPoints } = useGamification();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isCompleted = (habit: Habit) => habit.completedDates?.includes(today) ?? habit.completed;
  const completed = habits.filter(isCompleted).length;

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(habit: Habit) { setEditing(habit); setOpen(true); }

  function saveHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const habit: Habit = { id: editing?.id ?? createId("habit"), name: String(data.get("name")), frequency: String(data.get("frequency")) as Habit["frequency"], target: Number(data.get("target")), unit: String(data.get("unit")), category: String(data.get("category")), completed: editing?.completed ?? false, streak: editing?.streak ?? 0, pointsReward: Number(data.get("pointsReward")), completedDates: editing?.completedDates ?? [] };
    setHabits((current) => editing ? current.map((item) => item.id === editing.id ? habit : item) : [habit, ...current]);
    setOpen(false);
  }

  function toggleHabit(habit: Habit) {
    const done = isCompleted(habit);
    setHabits((items) => items.map((item) => item.id === habit.id ? { ...item, completed: !done, completedDates: done ? (item.completedDates ?? []).filter((date) => date !== today) : Array.from(new Set([...(item.completedDates ?? []), today])), streak: done ? Math.max(0, item.streak - 1) : item.streak + 1 } : item));
    if (!done) awardPoints(habit.pointsReward ?? 10, "habit_completion", `${habit.id}:${today}`, `Hábito concluído: ${habit.name}`);
  }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Constância" title="Hábitos" description="Crie rotinas, ganhe pontos ao concluir e edite qualquer detalhe quando sua rotina mudar." action={<button type="button" onClick={openCreate} className={primaryButtonClass}>+ Novo hábito</button>} />
    <section className="mt-7 grid gap-4 sm:grid-cols-4"><Summary label="Concluídos hoje" value={`${completed}/${habits.length}`} accent /><Summary label="Taxa do dia" value={`${habits.length ? Math.round(completed / habits.length * 100) : 0}%`} /><Summary label="Maior sequência" value={`${Math.max(0, ...habits.map((habit) => habit.streak))} dias`} /><Summary label="Carteira" value={`${balance} pts`} /></section>
    <section className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white"><div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6"><h2 className="font-black">Rotina atual</h2><span className="text-xs font-bold text-black/35">{habits.length} hábitos</span></div>{habits.length === 0 ? <div className="p-12 text-center text-sm text-black/40">Nenhum hábito registrado ainda.</div> : <div className="divide-y divide-black/[0.07]">{habits.map((habit) => { const done = isCompleted(habit); return <article key={habit.id} className="flex items-center gap-4 px-5 py-4 sm:px-6"><button type="button" onClick={() => toggleHabit(habit)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-black ${done ? "border-[#ffd600] bg-[#ffd600]" : "border-black/15"}`} aria-label={`${done ? "Desmarcar" : "Concluir"} ${habit.name}`}>{done && "✓"}</button><div className="min-w-0 flex-1"><h3 className={`font-bold ${done ? "text-black/35 line-through" : ""}`}>{habit.name}</h3><div className="mt-1 flex flex-wrap gap-2 text-xs text-black/45"><span>{habit.frequency}</span><span>•</span><span>{habit.target} {habit.unit}</span><span>•</span><span>{habit.category}</span><span>•</span><span className="font-bold text-amber-700">+{habit.pointsReward ?? 10} pts</span></div></div><div className="hidden text-right sm:block"><p className="text-xl font-black">{habit.streak}</p><p className="text-[10px] font-bold uppercase tracking-wider text-black/35">dias</p></div><button type="button" onClick={() => openEdit(habit)} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold">Editar</button></article>; })}</div>}</section>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar hábito" : "Adicionar hábito"} description="Todos os campos podem ser alterados sem apagar as conclusões anteriores."><form onSubmit={saveHabit} className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome do hábito"><input className={fieldClass} name="name" required defaultValue={editing?.name} placeholder="Ex.: Meditar pela manhã" /></Field></div><Field label="Frequência"><select className={fieldClass} name="frequency" defaultValue={editing?.frequency}><option>Diário</option><option>Dias úteis</option><option>Semanal</option></select></Field><Field label="Categoria"><select className={fieldClass} name="category" defaultValue={editing?.category}><option>Saúde</option><option>Treino</option><option>Estudo</option><option>Organização</option><option>Bem-estar</option><option>Outro</option></select></Field><Field label="Meta"><input className={fieldClass} name="target" required type="number" min="1" step="0.01" defaultValue={editing?.target ?? 1} /></Field><Field label="Unidade"><input className={fieldClass} name="unit" required defaultValue={editing?.unit} placeholder="vezes, minutos, páginas..." /></Field><Field label="Pontos por conclusão"><input className={fieldClass} name="pointsReward" type="number" min="0" required defaultValue={editing?.pointsReward ?? 10} /></Field><div className="flex items-end justify-end gap-3 sm:col-span-2">{editing && <button type="button" onClick={() => { setHabits((items) => items.filter((item) => item.id !== editing.id)); setOpen(false); }} className="mr-auto py-3 text-sm font-bold text-red-700">Excluir</button>}<button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar hábito</button></div></form></Modal>
  </div>;
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-2xl border border-black/10 p-5 ${accent ? "bg-[#ffd600]" : "bg-white"}`}><p className="text-xs font-bold uppercase tracking-wider text-black/40">{label}</p><p className="mt-2 text-2xl font-black xl:text-3xl">{value}</p></div>; }
