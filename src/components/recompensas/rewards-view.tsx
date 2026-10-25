"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { createId, useLocalCollection } from "@/lib/local-data";
import { useGamification, type Reward } from "@/lib/gamification";

export function RewardsView() {
  const { entries, rewards, setRewards, redemptions, balance, lifetimeEarned, purchaseReward } = useGamification();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "purchased" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useLocalCollection<string>("foco-reward-favorites", []);
  const [pendingPurchase, setPendingPurchase] = useState<Reward | null>(null);
  const visibleRewards = useMemo(() => rewards.filter((reward) => reward.active && reward.title.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || (filter === "available" ? balance >= reward.cost : filter === "favorites" ? favorites.includes(reward.id) : redemptions.some((redemption) => redemption.rewardId === reward.id)))), [balance, favorites, filter, redemptions, rewards, search]);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(reward: Reward) { setEditing(reward); setOpen(true); }

  function saveReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reward: Reward = { id: editing?.id ?? createId("reward"), title: String(data.get("title")), description: String(data.get("description")), cost: Number(data.get("cost")), active: true, createdAt: editing?.createdAt ?? new Date().toISOString() };
    setRewards((current) => editing ? current.map((item) => item.id === editing.id ? reward : item) : [reward, ...current]);
    setOpen(false);
  }

  function buy(reward: Reward) {
    const purchased = purchaseReward(reward);
    setMessage(purchased ? `“${reward.title}” foi comprada. Aproveite!` : "Você ainda não tem pontos suficientes.");
    setPendingPurchase(null);
  }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Gamificação" title="Recompensas" description="Transforme consistência em pontos e troque seu saldo por recompensas que fazem sentido para você." action={<button type="button" onClick={openCreate} className={primaryButtonClass}>+ Nova recompensa</button>} />
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Saldo disponível" value={`${balance} pts`} accent /><Stat label="Pontos conquistados" value={`${lifetimeEarned} pts`} /><Stat label="Recompensas compradas" value={String(redemptions.length)} /><Stat label="Sua loja" value={`${rewards.filter((item) => item.active).length} itens`} /></section>
    {message && <div role="status" className="mt-5 flex items-center justify-between rounded-2xl bg-[#fff5b3] px-4 py-3 text-sm font-bold"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Fechar mensagem">×</button></div>}
    <div className="foco-panel mt-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto">{([{ value: "all", label: "Todas" }, { value: "available", label: "Disponíveis" }, { value: "purchased", label: "Compradas" }, { value: "favorites", label: "Favoritas" }] as const).map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${filter === item.value ? "bg-[#ffd600] text-black" : "border border-[var(--border)] text-[var(--muted)]"}`}>{item.label}</button>)}</div><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} lg:max-w-xs`} type="search" placeholder="Buscar recompensas..." /></div>
    <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_.72fr]">
      <section><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd600]">Recompensas pessoais</p><h2 className="mt-1 text-xl font-black">Sua loja</h2></div><span className="text-xs font-bold text-[var(--muted)]">{visibleRewards.length} disponíveis</span></div><div className="grid gap-4 sm:grid-cols-2">{visibleRewards.map((reward, index) => { const favorite = favorites.includes(reward.id); return <article key={reward.id} className={`relative overflow-hidden rounded-3xl border p-5 ${index === 0 ? "border-[#ffd600] bg-gradient-to-br from-[#312a05] to-black" : "border-[var(--border)] bg-[var(--surface)]"}`}><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#ffd600] to-transparent opacity-50"/><div className="flex items-start justify-between"><button type="button" onClick={() => setFavorites((items) => favorite ? items.filter((id) => id !== reward.id) : [...items, reward.id])} className={`grid h-11 w-11 place-items-center rounded-xl border ${favorite ? "border-[#ffd600] bg-[#ffd600] text-black" : "border-[var(--border)] text-[#ffd600]"}`} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>{favorite ? "♥" : "♡"}</button><button type="button" onClick={() => openEdit(reward)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold">Editar</button></div><h3 className="mt-5 text-xl font-black">{reward.title}</h3><p className="mt-2 min-h-10 text-sm leading-relaxed text-[var(--muted)]">{reward.description}</p><div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="text-lg font-black text-[#ffd600]">{reward.cost} pts</span><button type="button" onClick={() => setPendingPurchase(reward)} disabled={balance < reward.cost} className="rounded-xl bg-[#ffd600] px-4 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-30">Resgatar</button></div></article>; })}{visibleRewards.length === 0 && <div className="foco-panel p-12 text-center text-sm text-[var(--muted)] sm:col-span-2">Nenhuma recompensa encontrada neste filtro.</div>}</div></section>
      <section className="overflow-hidden rounded-3xl bg-black text-white"><div className="border-b border-white/10 p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">Atividade</p><h2 className="mt-1 text-xl font-black">Histórico de pontos</h2></div><div className="max-h-[520px] divide-y divide-white/10 overflow-y-auto">{entries.map((entry) => <div key={entry.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${entry.amount > 0 ? "bg-[#ffd600] text-black" : "bg-white/10 text-white"}`}>{entry.amount > 0 ? "+" : "−"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.description}</p><p className="mt-1 text-xs text-white/35">{new Date(entry.createdAt).toLocaleDateString("pt-BR")}</p></div><p className={`font-black ${entry.amount > 0 ? "text-[#ffd600]" : "text-white"}`}>{entry.amount > 0 ? "+" : ""}{entry.amount}</p></div>)}</div></section>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar recompensa" : "Criar recompensa"} description="Defina algo motivador e um custo proporcional ao esforço."><form onSubmit={saveReward} className="space-y-5"><Field label="Título"><input className={fieldClass} name="title" required defaultValue={editing?.title} placeholder="Ex.: Pedir minha comida favorita" /></Field><Field label="Descrição"><textarea className={`${fieldClass} min-h-24`} name="description" defaultValue={editing?.description} placeholder="Como você vai aproveitar essa recompensa?" /></Field><Field label="Custo em pontos"><input className={fieldClass} name="cost" type="number" min="1" required defaultValue={editing?.cost ?? 100} /></Field><div className="flex items-center justify-between border-t border-black/10 pt-5">{editing ? <button type="button" onClick={() => { setRewards((items) => items.filter((item) => item.id !== editing.id)); setOpen(false); }} className="text-sm font-bold text-red-700">Excluir</button> : <span/>}<div className="flex gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar</button></div></div></form></Modal>
    <Modal open={pendingPurchase !== null} onClose={() => setPendingPurchase(null)} title="Confirmar resgate" description="Os pontos serão debitados da sua carteira e a compra ficará no histórico.">{pendingPurchase && <div><div className="rounded-2xl border border-[#ffd600]/30 bg-[#ffd600]/10 p-5"><p className="text-lg font-black">{pendingPurchase.title}</p><p className="mt-2 text-sm text-[var(--muted)]">Custo: <strong className="text-[#ffd600]">{pendingPurchase.cost} pts</strong> · Saldo depois: <strong>{balance - pendingPurchase.cost} pts</strong></p></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setPendingPurchase(null)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button type="button" onClick={() => buy(pendingPurchase)} className={primaryButtonClass}>Confirmar resgate</button></div></div>}</Modal>
  </div>;
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <article className={`foco-stat p-5 ${accent ? "foco-stat-accent" : ""}`}><span className={`foco-icon ${accent ? "border-black/10 bg-black/10 text-black" : ""}`}>★</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-black/40">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>; }
