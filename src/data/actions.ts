import { db, newId, type DayNote, type Entry, type MonthNote, type Task, type Yearbook } from './db';
import type { ISODate } from '../lib/dates';

export async function saveEntry(e: Omit<Entry, 'updatedAt'>): Promise<void> {
  await db.entries.put({ ...e, updatedAt: Date.now() });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.update(id, { deleted: true, updatedAt: Date.now() });
}

export async function addTask(yearbookId: string, title: string, date: ISODate, scope: Task['scope']): Promise<void> {
  const order = await db.tasks.where('date').equals(date).count();
  await db.tasks.add({ id: newId(), yearbookId, title, date, scope, done: false, order, updatedAt: Date.now() });
}

export async function toggleTask(t: Task, today: ISODate): Promise<void> {
  await db.tasks.update(t.id, { done: !t.done, doneOn: !t.done ? today : undefined, updatedAt: Date.now() });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.update(id, { deleted: true, updatedAt: Date.now() });
}

/** Unfinished day tasks from earlier days move to today, marked as rolled over. */
export async function rollOverTasks(yearbookId: string, today: ISODate): Promise<void> {
  const stale = await db.tasks
    .where('yearbookId').equals(yearbookId)
    .filter((t) => !t.deleted && !t.done && t.scope === 'day' && t.date < today)
    .toArray();
  if (stale.length === 0) return;
  const now = Date.now();
  await db.tasks.bulkPut(stale.map((t) => ({ ...t, date: today, tag: t.tag ?? '昨日 Carried', updatedAt: now })));
}

export async function patchDayNote(yearbookId: string, date: ISODate, patch: Partial<DayNote>): Promise<void> {
  const id = `${yearbookId}:${date}`;
  const cur = await db.dayNotes.get(id);
  const base = cur && !cur.deleted ? cur : { id, yearbookId, date };
  await db.dayNotes.put({ ...base, ...patch, deleted: undefined, updatedAt: Date.now() });
}

export async function patchMonthNote(yearbookId: string, month: string, patch: Partial<MonthNote>): Promise<void> {
  const id = `${yearbookId}:${month}`;
  const cur = await db.monthNotes.get(id);
  const base = cur && !cur.deleted ? cur : { id, yearbookId, month };
  await db.monthNotes.put({ ...base, ...patch, deleted: undefined, updatedAt: Date.now() });
}

export async function toggleHabit(habitId: string, date: ISODate): Promise<void> {
  const id = `${habitId}:${date}`;
  const cur = await db.habitTicks.get(id);
  const wasOn = !!cur?.on && !cur.deleted;
  await db.habitTicks.put({ id, habitId, date, on: !wasOn, updatedAt: Date.now() });
}

export async function setYearbookTheme(id: string, theme: string): Promise<void> {
  await db.yearbooks.update(id, { theme, updatedAt: Date.now() });
}

export interface CarryOver {
  birthdays: boolean;
  habits: boolean;
}

export async function createYearbook(year: number, from: Yearbook, carry: CarryOver): Promise<string> {
  const id = `yb-${year}`;
  const now = Date.now();
  await db.transaction('rw', [db.yearbooks, db.entries, db.habits], async () => {
    await db.yearbooks.put({ id, year, theme: from.theme, updatedAt: now });
    if (carry.birthdays) {
      const bdays = await db.entries.where('yearbookId').equals(from.id).filter((e) => e.category === 'birthday' && !e.deleted).toArray();
      await db.entries.bulkAdd(bdays.map((e) => ({ ...e, id: newId(), yearbookId: id, date: `${year}${e.date.slice(4)}`, updatedAt: now })));
    }
    if (carry.habits) {
      const habits = await db.habits.where('yearbookId').equals(from.id).filter((h) => !h.deleted).toArray();
      await db.habits.bulkAdd(habits.map((h) => ({ ...h, id: newId(), yearbookId: id, updatedAt: now })));
    }
  });
  return id;
}

export async function addPastYearbook(year: number, theme: string): Promise<string> {
  const id = `yb-${year}`;
  await db.yearbooks.put({ id, year, theme, readOnly: true, updatedAt: Date.now() });
  return id;
}
