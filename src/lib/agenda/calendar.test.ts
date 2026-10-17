import { describe, expect, it } from "vitest";
import { daysFrom, eventsForDate, monthGrid, shiftPeriod, startOfWeek } from "./calendar";
import { seedCalendarEvents } from "@/lib/local-data";

describe("agenda", () => {
  it("encontra as obrigações do dia em ordem", () => {
    expect(eventsForDate(seedCalendarEvents, "2026-10-11").map((event) => event.id)).toEqual(["event-planning", "event-training"]);
  });

  it("gera semanas começando na segunda-feira", () => {
    const monday = startOfWeek(new Date(2026, 9, 11, 12));
    expect(monday.getDay()).toBe(1);
    expect(daysFrom(monday, 7)).toHaveLength(7);
  });

  it("gera uma grade mensal de seis semanas e navega por período", () => {
    expect(monthGrid(new Date(2026, 9, 11, 12))).toHaveLength(42);
    expect(shiftPeriod(new Date(2026, 9, 11, 12), "month", 1).getMonth()).toBe(10);
  });
});
