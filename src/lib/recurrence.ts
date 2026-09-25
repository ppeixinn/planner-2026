import type { Entry } from '../data/db';
import { timeToMinutes, weekdayIndex, type ISODate } from './dates';
import { isTeachingDay, type Semester } from './semester';

export function occursOn(e: Entry, date: ISODate, sem: Semester | undefined): boolean {
  if (e.deleted) return false;
  switch (e.repeat.kind) {
    case 'none':
      return e.date === date;
    case 'weekly':
      if (date < e.date) return false;
      if (e.repeat.until && date > e.repeat.until) return false;
      if (weekdayIndex(date) !== weekdayIndex(e.date)) return false;
      if (e.repeat.skipNonTeaching && !isTeachingDay(sem, date)) return false;
      return true;
    case 'yearly':
      return date >= e.date && date.slice(5) === e.date.slice(5);
  }
}

const CATEGORY_ORDER: Record<Entry['category'], number> = { important: 0, birthday: 1, personal: 2, class: 3 };

/** Entries on a date: all-day items first (important before others), then by start time. */
export function entriesOn(entries: Entry[], date: ISODate, sem: Semester | undefined): Entry[] {
  return entries
    .filter((e) => occursOn(e, date, sem))
    .sort((a, b) => {
      const ta = timeToMinutes(a.start);
      const tb = timeToMinutes(b.start);
      if (ta !== tb) return ta - tb;
      return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    });
}
