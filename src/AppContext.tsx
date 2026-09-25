import { createContext, useContext } from 'react';
import type { Entry, Yearbook } from './data/db';
import type { Settings } from './data/hooks';
import type { ISODate } from './lib/dates';
import type { Tab } from './components/TabBar';

export interface Account {
  id: string;
  email: string;
  name: string;
}

export type SubPage = 'appearance' | 'yearbooks' | 'semester' | null;

export interface AppCtx {
  book: Yearbook;
  books: Yearbook[];
  settings: Settings;
  today: ISODate;
  /** Date the Month/Week views are focused on. */
  focus: ISODate;
  setFocus: (d: ISODate) => void;
  entries: Entry[];
  readOnly: boolean;
  openEntry: (init: Partial<Entry> & { date: ISODate }) => void;
  go: (tab: Tab, sub?: SubPage) => void;
  /** Null when running without accounts (no Supabase keys in this build). */
  account: Account | null;
  signOut: () => Promise<void>;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
