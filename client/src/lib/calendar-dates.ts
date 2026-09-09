import { parseISO, startOfDay } from 'date-fns';

/**
 * All-day event boundaries are stored as UTC midnight ("2026-03-05T00:00:00Z"). Constructing a
 * plain `new Date(iso)` and reading it back with local getters shifts the date by the viewer's UTC
 * offset (e.g. renders on Mar 4 for negative offsets). Read the Y-M-D directly from the string
 * instead, and build a *local* midnight Date from those parts so it lines up with the local
 * calendar grid (which is built from local Date objects) regardless of the viewer's timezone.
 */
export function allDayDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function minutesSinceStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Does this event occur on the given local calendar day? (all-day events compared date-only, timed events by real overlap) */
export function eventSpansDay(event: { isAllDay: boolean; startsAt: string; endsAt: string }, day: Date): boolean {
  if (event.isAllDay) {
    const start = allDayDate(event.startsAt);
    const end = allDayDate(event.endsAt); // exclusive
    return day.getTime() >= start.getTime() && day.getTime() < end.getTime();
  }
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return start.getTime() < dayEnd.getTime() && end.getTime() > dayStart.getTime();
}

/** Does this task's [startDate, dueDate] span include the given day? DateOnly strings are parsed with parseISO (local), never `new Date()`. */
export function taskSpansDay(task: { startDate?: string | null; dueDate?: string | null }, day: Date): boolean {
  if (!task.startDate && !task.dueDate) return false;
  const start = task.startDate ? parseISO(task.startDate) : parseISO(task.dueDate!);
  const end = task.dueDate ? parseISO(task.dueDate) : parseISO(task.startDate!);
  const dayStart = startOfDay(day).getTime();
  return dayStart >= startOfDay(start).getTime() && dayStart <= startOfDay(end).getTime();
}

export interface LayoutItem {
  start: Date;
  end: Date;
}

export interface PackedItem<T> {
  item: T;
  lane: number;
  lanes: number;
}

/**
 * Packs a set of timed items into side-by-side lanes so overlapping events render next to each
 * other instead of stacking. Items are grouped into clusters of mutually-overlapping items via a
 * running max-end sweep, then greedily assigned to the first lane whose previous occupant already
 * ended.
 */
export function layoutOverlaps<T extends LayoutItem>(items: T[]): PackedItem<T>[] {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: PackedItem<T>[] = [];

  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEndTimes: number[] = [];
    const laneOf = new Map<T, number>();
    for (const it of cluster) {
      let lane = laneEndTimes.findIndex((endTime) => endTime <= it.start.getTime());
      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(it.end.getTime());
      } else {
        laneEndTimes[lane] = it.end.getTime();
      }
      laneOf.set(it, lane);
    }
    const lanes = laneEndTimes.length;
    for (const it of cluster) result.push({ item: it, lane: laneOf.get(it)!, lanes });
  };

  for (const it of sorted) {
    if (cluster.length > 0 && it.start.getTime() >= clusterEnd) {
      flush();
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end.getTime());
  }
  flush();

  return result;
}
