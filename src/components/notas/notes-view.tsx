"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { BrainGraph } from "./brain-graph";
import { createId, useLocalCollection, type Note } from "@/lib/local-data";
import { prioritizeNotes } from "@/lib/notas/notes";

export function NotesView() {
  const [notes, setNotes] = useLocalCollection<Note>("foco-notes", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [view, setView] = useState<"notes" | "brain">("notes");
  const [search, setSearch] = useState("");
  const visibleNotes = useMemo(() => prioritizeNotes(notes.filter((note) => `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()))), [notes, search]);

  useEffect(() => {
    if (window.location.hash === "#brain") setView("brain");
  }, []);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(note: Note) { setEditing(note); setOpen(true); }

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const links = data.getAll("links").map(String);
    const note: Note = { id: editing?.id ?? createId("note"), title: String(data.get("title")), content: String(data.get("content")), tags: String(data.get("tags")).split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean), links, updatedAt: new Date().toISOString().slice(0, 10), isPinned: data.get("isPinned") === "on", isImportant: data.get("isImportant") === "on" };
    setNotes((current) => {
      const others = current.filter((item) => item.id !== note.id).map((item) => ({ ...(links.includes(item.id) ? { ...item, links: Array.from(new Set([...item.links, note.id])) } : { ...item, links: item.links.filter((link) => link !== note.id) }), isPinned: note.isPinned ? false : item.isPinned }));
      return [note, ...others];
    });
    setOpen(false);
  }

  function deleteNote(id: string) { setNotes((items) => items.filter((item) => item.id !== id).map((item) => ({ ...item, links: item.links.filter((link) => link !== id) }))); }
  function togglePinned(note: Note) { setNotes((items) => items.map((item) => ({ ...item, isPinned: item.id === note.id ? !note.isPinned : note.isPinned ? item.isPinned : false }))); }
  function toggleImportant(note: Note) { setNotes((items) => items.map((item) => item.id === note.id ? { ...item, isImportant: !note.isImportant } : item)); }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Segundo cérebro" title="Notas" description="Registre ideias, edite livremente e conecte uma nota à outra para revelar relações no seu Brain." action={<button type="button" onClick={openCreate} className={primaryButtonClass}>+ Nova nota</button>} />
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex rounded-xl border border-black/10 bg-white p-1"><button type="button" onClick={() => setView("notes")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "notes" ? "bg-black text-white" : "text-black/45"}`}>Todas as notas</button><button type="button" onClick={() => setView("brain")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "brain" ? "bg-black text-white" : "text-black/45"}`}>Brain</button></div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} sm:max-w-xs`} type="search" placeholder="Buscar notas ou etiquetas..." />
    </div>
    {view === "brain" ? <section id="brain" className="mt-6 rounded-3xl bg-black p-5 text-white sm:p-7"><div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">Mapa de conhecimento</p><h2 className="mt-1 text-2xl font-black">Seu Brain</h2><p className="mt-2 text-sm text-white/45">Notas importantes aparecem como estrelas no mapa.</p></div><BrainGraph notes={visibleNotes} /></section> : <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleNotes.map((note) => { const pinned = note.isPinned ?? false; const important = note.isImportant ?? false; const dark = important && !pinned; return <article key={note.id} className={`group rounded-3xl border p-5 transition hover:-translate-y-1 hover:shadow-lg ${pinned ? "border-black/15 bg-[#ffd600]" : important ? "border-[#ffd600] bg-black text-white" : "border-black/10 bg-white"}`}>
      <div className="flex items-start justify-between gap-4"><span className={`text-[10px] font-black uppercase tracking-[0.14em] ${dark ? "text-white/40" : "text-black/40"}`}>Atualizada em {new Date(`${note.updatedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span><button type="button" onClick={() => openEdit(note)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${dark ? "border-white/15" : "border-black/10"}`}>Editar</button></div>
      <div className="mt-4 flex flex-wrap gap-2"><label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-black ${pinned ? "bg-black text-white" : dark ? "bg-white/10" : "bg-black/5"}`}><input type="checkbox" checked={pinned} onChange={() => togglePinned(note)} className="accent-[#ffd600]" />Fixar</label><label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-black ${important ? "bg-[#ffd600] text-black" : dark ? "bg-white/10" : "bg-black/5"}`}><input type="checkbox" checked={important} onChange={() => toggleImportant(note)} className="accent-black" />★ Importante</label></div>
      <h2 className="mt-5 text-xl font-black leading-tight">{note.title}</h2><p className={`mt-3 line-clamp-4 text-sm leading-relaxed ${dark ? "text-white/55" : "text-black/55"}`}>{note.content}</p>
      <div className="mt-6 flex flex-wrap gap-2">{note.tags.map((tag) => <span key={tag} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${dark ? "bg-white/10" : "bg-black/[0.07]"}`}>#{tag}</span>)}</div>
      <p className={`mt-5 border-t pt-4 text-xs font-bold ${dark ? "border-white/10 text-white/40" : "border-black/10 text-black/40"}`}>↗ {note.links.length} {note.links.length === 1 ? "conexão" : "conexões"}</p>
    </article>; })}{visibleNotes.length === 0 && <p className="py-16 text-sm text-black/40">Nenhuma nota encontrada.</p>}</section>}
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar nota" : "Criar uma nota"} description="Você pode alterar o conteúdo e reorganizar todas as conexões.">
      <form onSubmit={saveNote} className="space-y-5"><Field label="Título"><input className={fieldClass} name="title" required defaultValue={editing?.title} placeholder="Qual é a ideia principal?" /></Field><Field label="Conteúdo"><textarea className={`${fieldClass} min-h-32 resize-y`} name="content" required defaultValue={editing?.content} placeholder="Escreva sem se preocupar com a forma..." /></Field><Field label="Etiquetas" hint="Separe por vírgulas."><input className={fieldClass} name="tags" defaultValue={editing?.tags.join(", ")} placeholder="foco, estudo, ideia" /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-[#fffbea] p-4"><input type="checkbox" name="isPinned" defaultChecked={editing?.isPinned ?? false} className="h-5 w-5 accent-black" /><span><span className="block text-sm font-black">Fixar no dashboard</span><span className="text-xs text-black/45">Substitui a nota fixada atual.</span></span></label><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-black p-4 text-white"><input type="checkbox" name="isImportant" defaultChecked={editing?.isImportant ?? false} className="h-5 w-5 accent-[#ffd600]" /><span><span className="block text-sm font-black">Marcar importante</span><span className="text-xs text-white/45">Destaque e estrela no Brain.</span></span></label></div>
      {notes.filter((note) => note.id !== editing?.id).length > 0 && <fieldset><legend className="mb-2 text-sm font-bold">Conectar com</legend><div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-black/10 bg-white p-3 sm:grid-cols-2">{notes.filter((note) => note.id !== editing?.id).map((note) => <label key={note.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-[#fffbea]"><input type="checkbox" name="links" value={note.id} defaultChecked={editing?.links.includes(note.id)} className="accent-black"/><span className="truncate">{note.title}</span></label>)}</div></fieldset>}
      <div className="flex items-center justify-between border-t border-black/10 pt-5">{editing ? <button type="button" onClick={() => { deleteNote(editing.id); setOpen(false); }} className="text-sm font-bold text-red-700">Excluir</button> : <span/>}<div className="flex gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar nota</button></div></div></form>
    </Modal>
  </div>;
}
