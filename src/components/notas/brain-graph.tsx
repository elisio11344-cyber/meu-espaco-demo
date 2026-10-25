"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Note } from "@/lib/local-data";
import { useAppPreferences } from "@/lib/app-preferences";

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 560;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.4;

type Camera = { x: number; y: number; scale: number };

export function BrainGraph({ notes, compact = false }: { notes: Note[]; compact?: boolean }) {
  const { userKey } = useAppPreferences();
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? "");
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{ pointerId: number; x: number; y: number; nodeId?: string } | null>(null);
  const patternId = useId().replaceAll(":", "");
  const storageKey = `foco:${userKey}:brain-positions`;
  const nodes = useMemo(() => createLayout(notes).map((node) => ({ ...node, ...(savedPositions[node.note.id] ?? {}) })), [notes, savedPositions]);
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const positions = new Map(nodes.map((node) => [node.note.id, node]));
  const edges = nodes.flatMap(({ note }) => note.links.map((target) => ({ from: positions.get(note.id), to: positions.get(target), key: `${note.id}-${target}` }))).filter((edge) => edge.from && edge.to);
  const selectedConnections = new Set(selected ? [selected.id, ...selected.links, ...notes.filter((note) => note.links.includes(selected.id)).map((note) => note.id)] : []);

  useEffect(() => {
    try { setSavedPositions(JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, { x: number; y: number }>); }
    catch { setSavedPositions({}); }
  }, [storageKey]);

  function changeZoom(delta: number) {
    setCamera((current) => ({ ...current, scale: clamp(current.scale + delta, MIN_ZOOM, MAX_ZOOM) }));
  }

  function resetCamera() {
    setCamera({ x: 0, y: 0, scale: 1 });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -0.12 : 0.12);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const width = event.currentTarget.getBoundingClientRect().width || VIEWBOX_WIDTH;
    const unit = VIEWBOX_WIDTH / width;
    const deltaX = (event.clientX - drag.x) * unit;
    const deltaY = (event.clientY - drag.y) * unit;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    if (drag.nodeId) {
      setSavedPositions((current) => {
        const node = positions.get(drag.nodeId!);
        if (!node) return current;
        const next = { ...current, [drag.nodeId!]: { x: node.x + deltaX / camera.scale, y: node.y + deltaY / camera.scale } };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    } else setCamera((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
  }

  function finishDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function handleNodePointerDown(event: ReactPointerEvent<SVGGElement>, nodeId: string) {
    event.stopPropagation();
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, nodeId };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  if (notes.length === 0) return <div className="brain-empty grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/20 px-6 text-center text-sm text-white/45">Crie notas e conecte-as para formar seu Brain.</div>;

  return <div className={`brain-layout grid gap-5 ${compact ? "lg:grid-cols-[1fr_250px]" : "xl:grid-cols-[1fr_300px]"}`}>
    <div className="brain-canvas relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d10]">
      <div className="brain-toolbar absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-white/10 bg-black/70 p-1 text-white shadow-xl backdrop-blur">
        <button type="button" onClick={() => changeZoom(-0.18)} aria-label="Diminuir zoom" title="Diminuir zoom" className="brain-tool">−</button>
        <output className="min-w-12 text-center text-[10px] font-black tabular-nums text-white/55" aria-live="polite">{Math.round(camera.scale * 100)}%</output>
        <button type="button" onClick={() => changeZoom(0.18)} aria-label="Aumentar zoom" title="Aumentar zoom" className="brain-tool">+</button>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button type="button" onClick={resetCamera} aria-label="Centralizar mapa" title="Centralizar mapa" className="brain-tool text-[10px]">◎</button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden items-center gap-2 rounded-lg bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ffd600]" /> Arraste para mover · role para ampliar
      </div>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={`brain-svg w-full select-none ${compact ? "min-h-[330px]" : "min-h-[420px]"}`}
        role="img"
        aria-label="Mapa de conexões entre notas"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <defs>
          <pattern id={`${patternId}-minor`} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,.075)" /></pattern>
          <pattern id={`${patternId}-major`} width="110" height="110" patternUnits="userSpaceOnUse"><rect width="110" height="110" fill={`url(#${patternId}-minor)`} /><path d="M110 0H0V110" fill="none" stroke="rgba(255,214,0,.055)" strokeWidth="1" /></pattern>
          <radialGradient id={`${patternId}-glow`}><stop offset="0" stopColor="#ffd600" stopOpacity=".1" /><stop offset="1" stopColor="#ffd600" stopOpacity="0" /></radialGradient>
          <filter id={`${patternId}-shadow`} x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000" floodOpacity=".7" /></filter>
        </defs>
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={`url(#${patternId}-major)`} />
        <circle cx="480" cy="280" r="300" fill={`url(#${patternId}-glow)`} />
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`} className="brain-stage">
          {edges.map((edge) => {
            const active = selectedConnections.has(edge.from!.note.id) && selectedConnections.has(edge.to!.note.id);
            return <line key={edge.key} x1={edge.from!.x} y1={edge.from!.y} x2={edge.to!.x} y2={edge.to!.y} className={active ? "brain-edge brain-edge-active" : "brain-edge"} />;
          })}
          {nodes.map(({ note, x, y, degree }) => {
            const active = note.id === selected?.id;
            const connected = selectedConnections.has(note.id);
            const important = note.isImportant ?? false;
            const radius = 18 + Math.min(degree * 3, 13) + (active ? 6 : 0);
            return <g key={note.id} role="button" tabIndex={0} aria-label={`Abrir nota ${note.title}`} aria-pressed={active} onPointerDown={(event) => handleNodePointerDown(event, note.id)} onClick={() => setSelectedId(note.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(note.id); } }} className={`brain-node cursor-pointer outline-none ${active ? "is-active" : connected ? "is-connected" : ""}`} style={{ transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r={radius + 14} fill="transparent" />
              {active && <circle cx={x} cy={y} r={radius + 13} className="brain-node-pulse" />}
              {important ? <polygon points={starPoints(x, y, radius + 6, radius * 0.52)} className="brain-node-shape brain-node-star" filter={`url(#${patternId}-shadow)`} /> : <circle cx={x} cy={y} r={radius} className="brain-node-shape" filter={`url(#${patternId}-shadow)`} />}
              <circle cx={x} cy={y} r={active ? 5.5 : 4} className="brain-node-core" />
              <text x={x} y={y + radius + 24} textAnchor="middle" className="brain-node-label">{shorten(note.title, 23)}</text>
              {important && <text x={x + radius + 8} y={y - radius + 2} className="brain-node-badge">★</text>}
            </g>;
          })}
        </g>
      </svg>
    </div>
    {selected && <aside className="brain-inspector relative overflow-hidden rounded-2xl border border-[#ffd600]/30 bg-[#151511] p-5 text-white">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#ffd600]/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd600]">Nota selecionada</p><span className="text-xs text-white/25">{String(nodes.findIndex((node) => node.note.id === selected.id) + 1).padStart(2, "0")}</span></div>
        <h3 className="mt-4 text-xl font-black leading-tight">{selected.title}</h3>
        <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-white/50">{selected.content}</p>
        <div className="mt-5 flex flex-wrap gap-2">{selected.tags.map((tag) => <span key={tag} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/60">#{tag}</span>)}</div>
        <div className="mt-6 grid grid-cols-2 border-t border-white/10 pt-4"><div><p className="text-2xl font-black text-[#ffd600]">{selected.links.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">conexões</p></div><div><p className="text-2xl font-black text-white">{selected.isImportant ? "★" : "—"}</p><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">importante</p></div></div>
      </div>
    </aside>}
  </div>;
}

function createLayout(notes: Note[]) {
  return notes.map((note, index) => {
    const angle = index * 2.3999632297 - Math.PI / 2;
    const progress = notes.length <= 1 ? 0 : index / (notes.length - 1);
    const radius = 50 + Math.sqrt(progress) * 225;
    const jitter = Math.abs(hash(note.id));
    const degree = new Set([...note.links, ...notes.filter((candidate) => candidate.links.includes(note.id)).map((candidate) => candidate.id)]).size;
    return { note, degree, x: VIEWBOX_WIDTH / 2 + Math.cos(angle) * radius * 1.45 + (jitter % 29) - 14, y: VIEWBOX_HEIGHT / 2 + Math.sin(angle) * radius * 0.9 + (jitter % 23) - 11 };
  });
}

function hash(value: string) {
  return [...value].reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 0);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function shorten(value: string, size: number) {
  return value.length > size ? `${value.slice(0, size - 1)}…` : value;
}

function starPoints(centerX: number, centerY: number, outerRadius: number, innerRadius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(" ");
}
