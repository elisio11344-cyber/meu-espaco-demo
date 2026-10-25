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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isCompleted = (habit: Habit) => habit.completedDates?.includes(today) ?? habit.completed;
  const completed = habits.filter(isCompleted).length;
  const categories = useMemo(() => ["Todos", ...Array.from(new Set(habits.map((habit) => habit.category)))], [habits]);
  const visibleHabits = useMemo(() => habits.filter((habit) => (category === "Todos" || habit.category === category) && habit.name.toLowerCase().includes(search.toLowerCase())), [category, habits, search]);

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
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Concluídos hoje" value={`${completed}/${habits.length}`} accent /><Summary label="Taxa do dia" value={`${habits.length ? Math.round(completed / habits.length * 100) : 0}%`} /><Summary label="Maior sequência" value={`${Math.max(0, ...habits.map((habit) => habit.streak))} dias`} /><Summary label="Carteira" value={`${balance} pts`} /></section>
    <div className="foco-panel mt-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${category === item ? "bg-[#ffd600] text-black" : "border border-[var(--border)] text-[var(--muted)]"}`}>{item}</button>)}</div><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} lg:max-w-xs`} type="search" placeholder="Buscar hábitos..." /></div>
    <section className="foco-panel mt-5 overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Rotina de hoje</p><h2 className="mt-1 font-black">Todos os hábitos</h2></div><span className="text-xs font-bold text-[var(--muted)]">{visibleHabits.length} hábitos</span></div>{visibleHabits.length === 0 ? <div className="p-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#ffd600]/30 bg-[#ffd600]/10 text-2xl text-[#ffd600]">✓</span><p className="mt-4 text-sm font-black">Nenhum hábito encontrado.</p><p className="mt-1 text-xs text-[var(--muted)]">Crie sua primeira rotina ou ajuste os filtros.</p></div> : <div className="divide-y divide-black/[0.07]">{visibleHabits.map((habit) => { const done = isCompleted(habit); return <article key={habit.id} className="flex items-center gap-4 px-5 py-4 sm:px-6"><button type="button" onClick={() => toggleHabit(habit)} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-black ${done ? "border-[#ffd600] bg-[#ffd600] text-black" : "border-[var(--border)] hover:border-[#ffd600]"}`} aria-label={`${done ? "Desmarcar" : "Concluir"} ${habit.name}`}>{done && "✓"}</button><div className="min-w-0 flex-1"><h3 className={`font-bold ${done ? "text-black/35 line-through" : ""}`}>{habit.name}</h3><div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]"><span>{habit.frequency}</span><span>•</span><span>{habit.target} {habit.unit}</span><span>•</span><span>{habit.category}</span><span>•</span><span className="font-bold text-[#ffd600]">+{habit.pointsReward ?? 10} pts</span></div></div><div className="hidden text-right sm:block"><p className="text-xl font-black">{habit.streak}</p><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">dias</p></div><button type="button" onClick={() => openEdit(habit)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold">Editar</button></article>; })}</div>}</section>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar hábito" : "Adicionar hábito"} description="Todos os campos podem ser alterados sem apagar as conclusões anteriores."><form onSubmit={saveHabit} className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome do hábito"><input className={fieldClass} name="name" required defaultValue={editing?.name} placeholder="Ex.: Meditar pela manhã" /></Field></div><Field label="Frequência"><select className={fieldClass} name="frequency" defaultValue={editing?.frequency}><option>Diário</option><option>Dias úteis</option><option>Semanal</option></select></Field><Field label="Categoria"><select className={fieldClass} name="category" defaultValue={editing?.category}><option>Saúde</option><option>Treino</option><option>Estudo</option><option>Organização</option><option>Bem-estar</option><option>Outro</option></select></Field><Field label="Meta"><input className={fieldClass} name="target" required type="number" min="1" step="0.01" defaultValue={editing?.target ?? 1} /></Field><Field label="Unidade"><input className={fieldClass} name="unit" required defaultValue={editing?.unit} placeholder="vezes, minutos, páginas..." /></Field><Field label="Pontos por conclusão"><input className={fieldClass} name="pointsReward" type="number" min="0" required defaultValue={editing?.pointsReward ?? 10} /></Field><div className="flex items-end justify-end gap-3 sm:col-span-2">{editing && <button type="button" onClick={() => { setHabits((items) => items.filter((item) => item.id !== editing.id)); setOpen(false); }} className="mr-auto py-3 text-sm font-bold text-red-700">Excluir</button>}<button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar hábito</button></div></form></Modal>
  </div>;
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`foco-stat p-5 ${accent ? "foco-stat-accent" : ""}`}><span className={`foco-icon ${accent ? "border-black/10 bg-black/10 text-black" : ""}`}>✦</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-black/40">{label}</p><p className="mt-2 text-2xl font-black xl:text-3xl">{value}</p></div>; }
