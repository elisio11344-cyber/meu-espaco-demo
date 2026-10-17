import type { CalendarEvent } from "@/lib/local-data";

export type CalendarView = "day" | "week" | "month" | "year";

export function localDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function eventsForDate(events: CalendarEvent[], key: string) {
  return events.filter((event) => localDateKey(event.startAt) === key).sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(12, 0, 0, 0);
  return result;
}

export function daysFrom(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  return daysFrom(startOfWeek(first), 42);
}

export function shiftPeriod(date: Date, view: CalendarView, amount: number) {
  const next = new Date(date);
  if (view === "day") next.setDate(next.getDate() + amount);
  if (view === "week") next.setDate(next.getDate() + amount * 7);
  if (view === "month") next.setMonth(next.getMonth() + amount);
  if (view === "year") next.setFullYear(next.getFullYear() + amount);
  return next;
}

export function periodLabel(date: Date, view: CalendarView) {
  if (view === "day") return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(date);
  if (view === "week") {
    const days = daysFrom(startOfWeek(date), 7);
    return `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  if (view === "month") return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return String(date.getFullYear());
}
