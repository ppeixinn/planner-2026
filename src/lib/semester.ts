import { addDays, daysBetween, type ISODate } from './dates';

export interface Semester {
  /** Monday of teaching week 1. */
  start: ISODate;
  /** Teaching weeks before the recess week (e.g. 7). */
  weeksBeforeRecess: number;
  /** Total teaching weeks (e.g. 13). */
  teachingWeeks: number;
  /** Optional exam period, inclusive. */
  examStart?: ISODate;
  examEnd?: ISODate;
}

export type WeekLabel =
  | { kind: 'teaching'; n: number }
  | { kind: 'recess' }
  | { kind: 'study' }
  | { kind: 'exam' };

export function weekLabel(sem: Semester | undefined, date: ISODate): WeekLabel | null {
  if (!sem) return null;
  if (sem.examStart && sem.examEnd && date >= sem.examStart && date <= sem.examEnd) return { kind: 'exam' };
  const diff = daysBetween(sem.start, date);
  if (diff < 0) return null;
  const idx = Math.floor(diff / 7);
  if (idx < sem.weeksBeforeRecess) return { kind: 'teaching', n: idx + 1 };
  if (idx === sem.weeksBeforeRecess) return { kind: 'recess' };
  const n = idx; // one recess week shifts the count by one
  if (n <= sem.teachingWeeks) return { kind: 'teaching', n };
  if (idx === sem.teachingWeeks + 1) return { kind: 'study' };
  return null;
}

export function isTeachingDay(sem: Semester | undefined, date: ISODate): boolean {
  const w = weekLabel(sem, date);
  return !!w && w.kind === 'teaching';
}

export function shortLabel(w: WeekLabel | null): string {
  if (!w) return '';
  switch (w.kind) {
    case 'teaching': return `W${w.n}`;
    case 'recess': return 'R';
    case 'study': return 'S';
    case 'exam': return 'E';
  }
}

export function longLabel(w: WeekLabel | null): string {
  if (!w) return '';
  switch (w.kind) {
    case 'teaching': return `Teaching week ${w.n}`;
    case 'recess': return 'Recess week';
    case 'study': return 'Study week';
    case 'exam': return 'Exams';
  }
}

export function lastTeachingDay(sem: Semester): ISODate {
  // teachingWeeks + 1 recess week, ending on Sunday
  return addDays(sem.start, (sem.teachingWeeks + 1) * 7 - 1);
}
