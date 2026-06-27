import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// Week starts Monday (per the weekly review ritual / area_scores spec).
export function weekStartISO(d: Date = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function weekDays(d: Date = new Date()): Date[] {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function prettyDay(d: Date): string {
  return format(d, "EEE");
}

export function prettyDate(d: Date): string {
  return format(d, "MMM d");
}

export function fmtTime(time?: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export { format, isSameDay, parseISO, addDays, differenceInCalendarDays };
