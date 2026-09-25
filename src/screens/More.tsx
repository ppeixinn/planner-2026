import { useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { themeFor } from '../data/hooks';
import { downloadBackup, exportBackup, parseBackup, restoreBackup } from '../data/backup';
import { formatShort } from '../lib/dates';
import { PALETTES } from '../lib/theme';
import { syncNow, useSyncStatus, type SyncStatus } from '../lib/sync';
import { Icon } from '../components/Icon';

function syncLine(s: SyncStatus): { text: string; colour: string } {
  switch (s.state) {
    case 'syncing': return { text: '同步中 · Syncing…', colour: '#D9A441' };
    case 'offline': return { text: '离线 · Offline, will sync when back online', colour: '#9A9C93' };
    case 'error': return { text: `同步出错 · ${s.error ?? 'Sync failed'}`, colour: '#D8343C' };
    case 'idle': return {
      text: s.lastSynced ? `已同步 · Synced ${new Date(s.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '已连接 · Connected',
      colour: '#4F9A5B'
    };
    default: return { text: 'This device only', colour: '#9A9C93' };
  }
}

function AccountCard() {
  const { account, signOut } = useApp();
  const status = useSyncStatus();
  if (!account) {
    return (
      <section className="card">
        <div className="card-head"><h2>账号<small>ACCOUNT</small></h2></div>
        <div className="row"><Icon name="sync" size={20} /><span className="grow"><span className="title">Saved on this device only</span><span className="sub">This build has no sync set up.</span></span></div>
      </section>
    );
  }
  const line = syncLine(status);
  return (
    <section className="card">
      <div className="card-head"><h2>账号<small>ACCOUNT</small></h2></div>
      <div className="row">
        <span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--head)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {(account.name || account.email).slice(0, 1).toUpperCase()}
        </span>
        <span className="grow"><span className="title">{account.name || 'Me'}</span><span className="sub">{account.email}</span></span>
      </div>
      <button className="row" onClick={() => syncNow()}>
        <span className="sync-dot" style={{ background: line.colour }} />
        <span className="grow"><span className="title" style={{ fontWeight: 500 }}>同步 Sync</span><span className="sub">{line.text}</span></span>
        <span className="muted" style={{ fontSize: 12 }}>Sync now</span>
      </button>
      <button className="row" onClick={() => { if (confirm('Sign out on this device? 退出登录？')) signOut(); }}>
        <span className="grow"><span className="title c-important" style={{ fontWeight: 500 }}>退出登录 Sign out</span></span>
      </button>
    </section>
  );
}

function BackupCard() {
  const { go } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const counts = Object.entries(backup.tables).map(([t, rows]) => `${rows?.length ?? 0} ${t}`).join(', ');
      if (!confirm(`Replace everything in this planner with this file?\n用这个文件替换现在的所有内容？\n\n${counts}`)) return;
      await restoreBackup(backup);
      setMsg('已导入 · Imported. It will sync to your other devices.');
      go('month');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="card">
      <div className="card-head"><h2>备份<small>BACKUP</small></h2></div>
      <button className="row" onClick={async () => downloadBackup(await exportBackup())}>
        <Icon name="book" size={20} />
        <span className="grow"><span className="title">导出 Export</span><span className="sub">Save everything as a file</span></span>
      </button>
      <button className="row" onClick={() => fileRef.current?.click()}>
        <Icon name="plus" size={20} />
        <span className="grow"><span className="title">导入 Import</span><span className="sub">Replace this planner with a backup file</span></span>
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <p role="status" className="auth-msg" style={{ margin: '0 14px 12px', background: 'var(--tint)' }}>{msg}</p>}
    </section>
  );
}

export function MoreScreen() {
  const { book, settings, go } = useApp();
  const theme = themeFor(settings, book);
  const sem = book.semester;

  return (
    <main className="screen">
      <header className="topbar">
        <h1 className="pill">功能 <span>TOOLS</span></h1>
      </header>

      <section className="card">
        <div className="card-head"><h2>设置<small>SETUP</small></h2></div>
        <button className="row" onClick={() => go('more', 'appearance')}>
          <span style={{ display: 'flex', gap: 3 }}>
            {PALETTES.slice(0, 3).map((p, i) => (
              <i key={p.id} style={{ width: 12, height: 24, background: p.head, borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : 0 }} />
            ))}
          </span>
          <span className="grow"><span className="title">外观 Appearance</span><span className="sub">{theme.zh} {theme.en} · handwriting font</span></span>
          <Icon name="right" size={16} />
        </button>
        <button className="row" onClick={() => go('more', 'yearbooks')}>
          <span style={{ width: 36, height: 24, borderRadius: 4, background: theme.head, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{book.year}</span>
          <span className="grow"><span className="title">年册 Yearbooks</span><span className="sub">{book.year} open · start next year or look back</span></span>
          <Icon name="right" size={16} />
        </button>
        <button className="row" onClick={() => go('more', 'semester')}>
          <Icon name="calendar" size={20} />
          <span className="grow">
            <span className="title">学期 Semester &amp; teaching weeks</span>
            <span className="sub">{sem ? `W1 starts ${formatShort(sem.start)} · recess after W${sem.weeksBeforeRecess}` : 'Not set'}</span>
          </span>
          <Icon name="right" size={16} />
        </button>
      </section>

      <AccountCard />
      <BackupCard />

      <section className="card">
        <div className="card-head"><h2>即将推出<small>COMING NEXT</small></h2></div>
        {[
          ['学习计划', 'Study planner + focus timer'],
          ['决策黑箱', 'Decision box · A / B / C'],
          ['回忆记录', 'Memories by month'],
          ['季度规划 · 年度回顾', 'Quarter & year reviews']
        ].map(([zh, en]) => (
          <div key={zh} className="row">
            <Icon name="book" size={20} />
            <span className="grow"><span className="title">{zh}</span><span className="sub">{en}</span></span>
          </div>
        ))}
      </section>
    </main>
  );
}
