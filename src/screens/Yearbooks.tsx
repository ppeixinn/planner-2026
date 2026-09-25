import { useState } from 'react';
import { useApp } from '../AppContext';
import { db } from '../data/db';
import { setSetting } from '../data/hooks';
import { addPastYearbook, createYearbook } from '../data/actions';
import { palette, PALETTES } from '../lib/theme';
import { Icon } from '../components/Icon';

export function YearbooksScreen() {
  const { book, books, today, settings, go } = useApp();
  const thisYear = Number(today.slice(0, 4));
  const latest = books[books.length - 1];
  const nextYear = latest.year + 1;
  const earliest = books[0].year;
  const [carry, setCarry] = useState({ birthdays: true, habits: true });

  const coverColour = (b: typeof book) => palette(settings.themeScope === 'all' ? settings.globalTheme : b.theme).head;

  const open = (id: string) => {
    setSetting('activeYearbook', id);
    go('month');
  };

  const startNext = async () => {
    const id = await createYearbook(nextYear, latest, carry);
    open(id);
  };

  const addPast = async () => {
    // Cycle through the palette so each old book gets its own cover.
    const theme = PALETTES[(thisYear - (earliest - 1)) % PALETTES.length].id;
    const id = await addPastYearbook(earliest - 1, theme);
    open(id);
  };

  const toggleLock = (id: string, readOnly: boolean) => db.yearbooks.update(id, { readOnly: !readOnly, updatedAt: Date.now() });

  return (
    <main className="screen">
      <header className="topbar" style={{ justifyContent: 'flex-start' }}>
        <button className="back-btn" aria-label="Back to tools" onClick={() => go('more')}><Icon name="left" /></button>
        <h1 className="pill">年册 <span>YEARBOOKS</span></h1>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {[...books].reverse().map((b) => (
          <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="book-btn" aria-pressed={b.id === book.id} aria-label={`Open ${b.year} yearbook`} onClick={() => open(b.id)}>
              <span className="cover" style={{ height: 132, background: coverColour(b) }}>
                <b>{b.year}</b>
                <small>PLANNER</small>
              </span>
            </button>
            <span style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{b.id === book.id ? '打开中 Open' : b.year === thisYear ? '本年 This year' : b.year > thisYear ? '明年 Next' : '往年 Past'}</span>
              {b.year < thisYear && (
                <button className="text-btn" style={{ fontSize: 12, minHeight: 32 }} onClick={() => toggleLock(b.id, !!b.readOnly)}>
                  {b.readOnly ? '已锁 Locked' : '锁定 Lock'}
                </button>
              )}
            </span>
          </div>
        ))}
      </section>

      {!books.some((b) => b.year === nextYear) && latest.year >= thisYear && (
        <section className="card" style={{ borderStyle: 'dashed', borderWidth: 1.5 }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>开始 {nextYear} · Start {nextYear}</span>
            <span className="muted" style={{ fontSize: 13 }}>A fresh book. Bring along:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="pen-chip" aria-pressed={carry.birthdays} onClick={() => setCarry({ ...carry, birthdays: !carry.birthdays })}
                style={carry.birthdays ? { background: 'var(--tint)', borderColor: 'var(--deep)' } : undefined}>生日 Birthdays</button>
              <button className="pen-chip" aria-pressed={carry.habits} onClick={() => setCarry({ ...carry, habits: !carry.habits })}
                style={carry.habits ? { background: 'var(--tint)', borderColor: 'var(--deep)' } : undefined}>习惯 Habits</button>
            </div>
            <button className="primary" onClick={startNext}>开始 {nextYear} 年册</button>
          </div>
        </section>
      )}

      <section className="card">
        <button className="row" onClick={addPast}>
          <Icon name="plus" size={20} />
          <span className="grow"><span className="title">添加 {earliest - 1} · Add a past year</span><span className="sub">Fill in old memories; lock it when done. PDF import comes later.</span></span>
        </button>
      </section>
    </main>
  );
}
