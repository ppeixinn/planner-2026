import { db, newId, type Entry, type Habit, type Yearbook } from './db';
import { addDays, startOfWeek, todayISO } from '../lib/dates';

// Sample content for a brand-new account, placed around today so every
// screen has something to show. All of it is made up; delete or edit freely.

const inFlight = new Map<string, Promise<void>>();

/** Adds the sample yearbook once per database, even if called twice at the same moment. */
export function seedSample(): Promise<void> {
  let p = inFlight.get(db.name);
  if (!p) {
    p = seed().finally(() => inFlight.delete(db.name));
    inFlight.set(db.name, p);
  }
  return p;
}

async function seed(): Promise<void> {
  if ((await db.yearbooks.filter((y) => !y.deleted).count()) > 0) return;
  const now = Date.now();
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const id = `yb-${year}`;
  const monday = startOfWeek(today);
  // A pretend semester that started six weeks ago, so week labels show; set the real one in More → Semester.
  const semStart = addDays(monday, -42);

  const yearbook: Yearbook = {
    id, year, theme: 'sage', updatedAt: now,
    semester: { start: semStart, weeksBeforeRecess: 7, teachingWeeks: 13 }
  };

  const weekly = (offset: number, start: string, end: string, title: string, location: string): Entry => ({
    id: newId(), yearbookId: id, title, category: 'class', date: addDays(semStart, offset), start, end, location,
    repeat: { kind: 'weekly', until: addDays(semStart, 14 * 7 - 1), skipNonTeaching: true }, updatedAt: now
  });
  const once = (dayOffset: number, title: string, category: Entry['category'], start?: string): Entry => ({
    id: newId(), yearbookId: id, title, category, date: addDays(today, dayOffset), start,
    repeat: category === 'birthday' ? { kind: 'yearly' } : { kind: 'none' }, updatedAt: now
  });

  const entries: Entry[] = [
    weekly(0, '10:30', '12:20', 'Sample Lecture', 'Room A'),
    weekly(2, '14:30', '15:20', 'Sample Tutorial', 'Room B'),
    weekly(3, '09:30', '11:20', 'Example Lab', 'Lab 2'),
    once(0, '示例 · Tap + to add your own', 'important'),
    once(2, 'Coffee with a friend', 'personal', '16:00'),
    once(5, 'Project deadline', 'important'),
    once(9, 'Friend’s birthday', 'birthday')
  ];

  const habits: Habit[] = [
    { id: newId(), yearbookId: id, zh: '运动', en: 'Exercise', meta: '20:00', order: 0, updatedAt: now },
    { id: newId(), yearbookId: id, zh: '喝水', en: 'Water', meta: '8 glasses', order: 1, updatedAt: now },
    { id: newId(), yearbookId: id, zh: '阅读', en: 'Read', meta: '20 min', order: 2, updatedAt: now },
    { id: newId(), yearbookId: id, zh: '早睡', en: 'Sleep', meta: 'by 00:00', order: 3, updatedAt: now }
  ];

  await db.transaction('rw', [db.yearbooks, db.entries, db.habits, db.settings], async () => {
    await db.yearbooks.put(yearbook);
    await db.entries.bulkAdd(entries);
    await db.habits.bulkAdd(habits);
    await db.settings.put({ key: 'activeYearbook', value: id });
  });
}
