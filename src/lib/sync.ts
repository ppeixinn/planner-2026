import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db, SYNCED_TABLES, type SyncedTable } from '../data/db';
import { supabase } from './supabase';

// Local-first sync. Every record is saved on the device first (IndexedDB), then
// mirrored to one Supabase table, `records`, keyed by (user, table, id).
// Conflicts resolve by last write wins on `updatedAt`, both here and in a
// database trigger, so an older device can never overwrite newer edits.

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error';
export interface SyncStatus {
  state: SyncState;
  lastSynced?: number;
  error?: string;
}

let status: SyncStatus = { state: 'off' };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => status);
}

const PULL_KEY = 'sync.lastPulled';
const PUSH_KEY = 'sync.lastPushed';
const PAGE = 1000;

interface RemoteRow {
  tbl: string;
  id: string;
  data: { updatedAt?: number } & Record<string, unknown>;
  updated_at: number;
  server_ts: string;
}

let userId: string | null = null;
let applyingRemote = false;
let running: Promise<void> | null = null;
let rerun = false;
let debounce: number | undefined;
let interval: number | undefined;
let channel: RealtimeChannel | null = null;
const unhooks: (() => void)[] = [];

async function meta<T>(key: string, fallback: T): Promise<T> {
  return ((await db.settings.get(key))?.value as T | undefined) ?? fallback;
}

async function pull(): Promise<void> {
  if (!supabase) return;
  const since = await meta(PULL_KEY, '');
  // Re-read a few seconds of overlap: rows committed at nearly the same moment can land out of order.
  let from = since ? new Date(new Date(since).getTime() - 10_000).toISOString() : '1970-01-01T00:00:00Z';
  let last = since;
  for (;;) {
    const { data, error } = await supabase
      .from('records')
      .select('tbl,id,data,updated_at,server_ts')
      .gt('server_ts', from)
      .order('server_ts', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    const rows = (data ?? []) as RemoteRow[];
    if (rows.length === 0) break;
    applyingRemote = true;
    try {
      await db.transaction('rw', SYNCED_TABLES.map((t) => db.table(t)), async () => {
        for (const r of rows) {
          if (!(SYNCED_TABLES as readonly string[]).includes(r.tbl)) continue;
          const table = db.table(r.tbl as SyncedTable);
          const local = (await table.get(r.id)) as { updatedAt?: number } | undefined;
          if (!local || (local.updatedAt ?? 0) < r.updated_at) await table.put(r.data);
        }
      });
    } finally {
      applyingRemote = false;
    }
    from = rows[rows.length - 1].server_ts;
    last = from;
    if (rows.length < PAGE) break;
  }
  if (last) await db.settings.put({ key: PULL_KEY, value: last });
}

async function push(): Promise<void> {
  if (!supabase || !userId) return;
  const since = await meta(PUSH_KEY, 0);
  const scanStart = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const t of SYNCED_TABLES) {
    const changed = await db.table(t).filter((r: { updatedAt?: number }) => (r.updatedAt ?? 0) > since).toArray();
    for (const r of changed) {
      rows.push({ user_id: userId, tbl: t, id: r.id, data: r, updated_at: r.updatedAt, deleted: !!r.deleted });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('records').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,tbl,id' });
    if (error) throw error;
  }
  // Anything written after the scan began has updatedAt >= scanStart and goes out next round.
  await db.settings.put({ key: PUSH_KEY, value: scanStart - 1 });
}

export function syncNow(): Promise<void> {
  if (!supabase || !userId) return Promise.resolve();
  if (running) { rerun = true; return running; }
  running = (async () => {
    do {
      rerun = false;
      if (!navigator.onLine) { setStatus({ state: 'offline' }); break; }
      setStatus({ state: 'syncing' });
      try {
        await pull();
        await push();
        setStatus({ state: 'idle', lastSynced: Date.now(), error: undefined });
      } catch (e) {
        setStatus({ state: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) });
        break;
      }
    } while (rerun);
  })().finally(() => { running = null; });
  return running;
}

function schedule(ms = 1500) {
  clearTimeout(debounce);
  debounce = window.setTimeout(() => { syncNow(); }, ms);
}

const onVisible = () => { if (document.visibilityState === 'visible') schedule(200); };
const onOnline = () => schedule(200);

/** First pull on a device that has nothing yet. Resolves false when offline or it fails. */
export async function initialPull(): Promise<boolean> {
  const start = Date.now();
  try {
    await pull();
    // What was just downloaded doesn't need uploading again.
    await db.settings.put({ key: PUSH_KEY, value: start - 1 });
    return true;
  } catch {
    return false;
  }
}

export function startSync(uid: string): void {
  stopSync();
  if (!supabase) return;
  userId = uid;
  setStatus({ state: 'idle' });

  // Any local write schedules a sync shortly after.
  for (const t of SYNCED_TABLES) {
    const table = db.table(t);
    const onWrite = () => { if (!applyingRemote) schedule(); };
    table.hook('creating', onWrite);
    table.hook('updating', onWrite);
    unhooks.push(() => { table.hook('creating').unsubscribe(onWrite); table.hook('updating').unsubscribe(onWrite); });
  }

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  interval = window.setInterval(() => syncNow(), 60_000);

  // Another device saved something: pull it straight away.
  channel = supabase
    .channel(`records-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${uid}` }, () => schedule(400))
    .subscribe();

  syncNow();
}

export function stopSync(): void {
  unhooks.splice(0).forEach((u) => u());
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('online', onOnline);
  clearInterval(interval);
  clearTimeout(debounce);
  if (channel && supabase) supabase.removeChannel(channel);
  channel = null;
  userId = null;
  setStatus({ state: 'off' });
}
