import Dexie, { type Table } from 'dexie';
import type { ISODate } from '../lib/dates';
import type { Semester } from '../lib/semester';

// Every synced record carries id + updatedAt + deleted so a sync layer
// (Supabase, phase 2) can merge changes from phone, iPad and laptop.
interface Synced {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export type Category = 'class' | 'personal' | 'important' | 'birthday';

export type Repeat =
  | { kind: 'none' }
  | { kind: 'weekly'; until?: ISODate; skipNonTeaching: boolean }
  | { kind: 'yearly' };

export interface Entry extends Synced {
  yearbookId: string;
  title: string;
  category: Category;
  date: ISODate;
  start?: string;
  end?: string;
  location?: string;
  repeat: Repeat;
  note?: string;
}

export interface Task extends Synced {
  yearbookId: string;
  title: string;
  /** Day the task is planned for; weekly tasks use the Monday of the week. */
  date: ISODate;
  scope: 'day' | 'week';
  done: boolean;
  doneOn?: ISODate;
  tag?: string;
  order: number;
}

export interface DayNote extends Synced {
  /** id = `${yearbookId}:${date}` */
  yearbookId: string;
  date: ISODate;
  am?: string;
  pm?: string;
  eve?: string;
  memory?: string;
  mood?: number;
}

export interface MonthNote extends Synced {
  /** id = `${yearbookId}:${yyyy-mm}` */
  yearbookId: string;
  month: string;
  goals?: string;
  done?: string;
  notDone?: string;
  learned?: string;
  reflect?: string;
  other?: string;
}

export interface Habit extends Synced {
  yearbookId: string;
  zh: string;
  en: string;
  meta?: string;
  order: number;
}

export interface HabitTick extends Synced {
  /** id = `${habitId}:${date}` */
  habitId: string;
  date: ISODate;
  on: boolean;
}

export interface Yearbook extends Synced {
  year: number;
  theme: string;
  readOnly?: boolean;
  semester?: Semester;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class PlannerDB extends Dexie {
  yearbooks!: Table<Yearbook, string>;
  entries!: Table<Entry, string>;
  tasks!: Table<Task, string>;
  dayNotes!: Table<DayNote, string>;
  monthNotes!: Table<MonthNote, string>;
  habits!: Table<Habit, string>;
  habitTicks!: Table<HabitTick, string>;
  settings!: Table<Setting, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      yearbooks: 'id, year',
      entries: 'id, yearbookId, date, category',
      tasks: 'id, yearbookId, date, [yearbookId+scope]',
      dayNotes: 'id, yearbookId, date',
      monthNotes: 'id, yearbookId, month',
      habits: 'id, yearbookId',
      habitTicks: 'id, habitId, date',
      settings: 'key'
    });
  }
}

/** Tables that sync between devices; `settings` stays per-device. */
export const SYNCED_TABLES = ['yearbooks', 'entries', 'tasks', 'dayNotes', 'monthNotes', 'habits', 'habitTicks'] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

// One local database per signed-in account, so two people sharing an iPad never mix planners.
// Reassigned by openDb(); ES module bindings keep every importer pointing at the current one.
export let db: PlannerDB;

export function openDb(name: string): PlannerDB {
  if (db?.name === name) return db;
  db?.close();
  db = new PlannerDB(name);
  return db;
}

export function newId(): string {
  return crypto.randomUUID();
}
