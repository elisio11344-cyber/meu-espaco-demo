"use client";

import { useMemo, useState } from "react";
import type { Note } from "@/lib/local-data";

export function BrainGraph({ notes, compact = false }: { notes: Note[]; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? "");
  const nodes = useMemo(() => notes.map((note, index) => {
    const angle = (Math.PI * 2 * index / Math.max(notes.length, 1)) - Math.PI / 2;
    const ring = index % 3 === 0 ? .72 : 1;
    return { note, x: 400 + Math.cos(angle) * 265 * ring, y: 200 + Math.sin(angle) * 145 * ring };
  }), [notes]);
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const positions = new Map(nodes.map((node) => [node.note.id, node]));
  const edges = nodes.flatMap(({ note }) => note.links.map((target) => ({ from: positions.get(note.id), to: positions.get(target), key: `${note.id}-${target}` }))).filter((edge) => edge.from && edge.to);

  if (notes.length === 0) return <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/20 text-sm text-white/45">Crie notas e conecte-as para formar seu Brain.</div>;

  return <div className={`grid gap-5 ${compact ? "lg:grid-cols-[1fr_260px]" : "xl:grid-cols-[1fr_300px]"}`}>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <svg viewBox="0 0 800 400" className="h-auto min-h-[280px] w-full" role="img" aria-label="Mapa de conexões entre notas">
        <defs><pattern id="brain-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.08)" /></pattern></defs>
        <rect width="800" height="400" fill="url(#brain-grid)" />
        {edges.map((edge) => <line key={edge.key} x1={edge.from!.x} y1={edge.from!.y} x2={edge.to!.x} y2={edge.to!.y} stroke="#ffd600" strokeOpacity=".25" strokeWidth="2" />)}
        {nodes.map(({ note, x, y }) => {
          const active = note.id === selected?.id;
          const important = note.isImportant ?? false;
          return <g key={note.id} role="button" tabIndex={0} aria-label={`Abrir nota ${note.title}`} onClick={() => setSelectedId(note.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(note.id); }} className="cursor-pointer outline-none">
            {important ? <polygon points={starPoints(x, y, active ? 39 : 31, active ? 18 : 14)} fill={active ? "#ffd600" : "#191919"} stroke="#ffd600" strokeWidth={active ? 3 : 2} /> : <circle cx={x} cy={y} r={active ? 34 : 25} fill={active ? "#ffd600" : "#191919"} stroke={active ? "#ffd600" : "rgba(255,255,255,.2)"} strokeWidth="2" />}
            <circle cx={x} cy={y} r="5" fill={active ? "#000" : "#ffd600"} />
            <text x={x} y={y + (active ? 51 : 43)} textAnchor="middle" fill={active ? "#ffd600" : "rgba(255,255,255,.65)"} fontSize="12" fontWeight="700">{note.title.length > 18 ? `${note.title.slice(0, 16)}…` : note.title}</text>
          </g>;
        })}
      </svg>
    </div>
    {selected && <aside className="rounded-2xl bg-[#ffd600] p-5 text-black"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">Nota selecionada</p><h3 className="mt-2 text-xl font-black">{selected.title}</h3><p className="mt-3 text-sm leading-relaxed text-black/60">{selected.content}</p><div className="mt-5 flex flex-wrap gap-2">{selected.tags.map((tag) => <span key={tag} className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold">#{tag}</span>)}</div><p className="mt-6 text-xs font-bold text-black/45">{selected.links.length} conexões</p></aside>}
  </div>;
}

function starPoints(centerX: number, centerY: number, outerRadius: number, innerRadius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(" ");
}
