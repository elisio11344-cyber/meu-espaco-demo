import { describe, expect, it } from "vitest";
import { seedNotes } from "@/lib/local-data";
import { getPinnedNote, prioritizeNotes } from "./notes";

describe("destaques das notas", () => {
  it("mantém a nota fixada no início", () => {
    const notes = seedNotes.map((note) => ({ ...note, isPinned: note.id === "note-books" }));
    expect(prioritizeNotes(notes)[0].id).toBe("note-books");
    expect(getPinnedNote(notes)?.id).toBe("note-books");
  });

  it("prioriza notas importantes depois da nota fixada", () => {
    expect(prioritizeNotes(seedNotes).slice(0, 2).map((note) => note.id)).toEqual(["note-morning", "note-focus"]);
  });
});
