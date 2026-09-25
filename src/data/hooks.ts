import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Yearbook } from './db';
import { palette } from '../lib/theme';

export interface Settings {
  activeYearbook: string;
  font: string;
  softPens: boolean;
  themeScope: 'book' | 'all';
  globalTheme: string;
}

const DEFAULTS: Settings = {
  activeYearbook: 'yb-2026',
  font: 'casual',
  softPens: false,
  themeScope: 'book',
  globalTheme: 'sage'
};

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.settings.toArray();
    const s: Record<string, unknown> = { ...DEFAULTS };
    for (const r of rows) s[r.key] = r.value;
    return s as unknown as Settings;
  }, []);
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

export function useYearbooks(): Yearbook[] | undefined {
  return useLiveQuery(() => db.yearbooks.orderBy('year').filter((y) => !y.deleted).toArray(), []);
}

export function themeFor(settings: Settings, book: Yearbook | undefined) {
  return palette(settings.themeScope === 'all' ? settings.globalTheme : book?.theme);
}
