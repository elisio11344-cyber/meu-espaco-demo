import type { Note } from "@/lib/local-data";

export function prioritizeNotes(notes: Note[]) {
  return [...notes].sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant)));
}

export function getPinnedNote(notes: Note[]) {
  return notes.find((note) => note.isPinned) ?? notes[0];
}
