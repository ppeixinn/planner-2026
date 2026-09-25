import { db, SYNCED_TABLES, type SyncedTable } from './db';

export interface BackupFile {
  app: 'planner';
  version: 1;
  exportedAt: string;
  tables: Partial<Record<SyncedTable, Record<string, unknown>[]>>;
}

export async function exportBackup(): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const t of SYNCED_TABLES) {
    tables[t] = (await db.table(t).toArray()).filter((r) => !r.deleted);
  }
  return { app: 'planner', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function downloadBackup(file: BackupFile): void {
  const blob = new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `planner-backup-${file.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function parseBackup(text: string): BackupFile {
  const f = JSON.parse(text) as BackupFile;
  if (f?.app !== 'planner' || f.version !== 1 || typeof f.tables !== 'object') {
    throw new Error('This file is not a planner backup.');
  }
  for (const [t, rows] of Object.entries(f.tables)) {
    if (!(SYNCED_TABLES as readonly string[]).includes(t) || !Array.isArray(rows)) throw new Error(`Unknown section "${t}".`);
    if (rows.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'string')) {
      throw new Error(`Section "${t}" has a row without an id.`);
    }
  }
  return f;
}

/**
 * Replace everything in this account with the backup. Current rows are marked
 * deleted (so the removal syncs to other devices) and the backup's rows are
 * written with a fresh timestamp so they win everywhere.
 */
export async function restoreBackup(f: BackupFile): Promise<string | undefined> {
  const now = Date.now();
  await db.transaction('rw', SYNCED_TABLES.map((t) => db.table(t)), async () => {
    for (const t of SYNCED_TABLES) {
      const table = db.table(t);
      const existing = await table.toArray();
      await table.bulkPut(existing.map((r) => ({ ...r, deleted: true, updatedAt: now })));
      const rows = f.tables[t] ?? [];
      await table.bulkPut(rows.map((r) => ({ ...r, deleted: undefined, updatedAt: now + 1 })));
    }
  });
  const years = (f.tables.yearbooks ?? []) as { id: string; year: number }[];
  const thisYear = new Date().getFullYear();
  const pick = years.find((y) => y.year === thisYear) ?? years[years.length - 1];
  if (pick) await db.settings.put({ key: 'activeYearbook', value: pick.id });
  return pick?.id;
}
