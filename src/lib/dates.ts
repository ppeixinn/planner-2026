// Dates are stored as local 'YYYY-MM-DD' strings so a day never shifts with time zones.

export type ISODate = string;

export const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 0 = Monday … 6 = Sunday (planner weeks start on Monday). */
export function weekdayIndex(s: ISODate): number {
  return (fromISO(s).getDay() + 6) % 7;
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekdayIndex(s));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
}

/** Monday-start grid of whole weeks covering the month. */
export function monthGrid(year: number, month: number): ISODate[][] {
  const first = toISO(new Date(year, month, 1));
  const last = toISO(new Date(year, month + 1, 0));
  const weeks: ISODate[][] = [];
  let cur = startOfWeek(first);
  while (cur <= last) {
    const week: ISODate[] = [];
    for (let i = 0; i < 7; i++) week.push(addDays(cur, i));
    weeks.push(week);
    cur = addDays(cur, 7);
  }
  return weeks;
}

export function formatLong(s: ISODate): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS_EN[d.getMonth()]}`;
}

export function formatShort(s: ISODate): string {
  const d = fromISO(s);
  return `${WEEKDAYS_EN[weekdayIndex(s)]} ${d.getDate()} ${MONTHS_EN[d.getMonth()].slice(0, 3)}`;
}

export function timeToMinutes(t?: string): number {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Which 早 / 午 / 晚 column a start time falls into. */
export function slotForTime(t?: string): 'am' | 'pm' | 'eve' | null {
  const m = timeToMinutes(t);
  if (m < 0) return null;
  if (m < 12 * 60) return 'am';
  if (m < 18 * 60) return 'pm';
  return 'eve';
}
