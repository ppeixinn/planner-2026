import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../AppContext';
import { db, type MonthNote } from '../data/db';
import { patchMonthNote } from '../data/actions';
import { entriesOn } from '../lib/recurrence';
import { fromISO, monthGrid, MONTHS_EN, toISO, WEEKDAYS_EN, weekdayIndex } from '../lib/dates';
import { shortLabel, longLabel, weekLabel } from '../lib/semester';
import { EntryRow } from '../components/EntryRow';
import { Icon } from '../components/Icon';
import { NoteArea } from '../components/NoteArea';

const NOTE_BOXES: { key: keyof MonthNote; zh: string }[] = [
  { key: 'goals', zh: '本月目标' },
  { key: 'done', zh: '已完成的事情' },
  { key: 'notDone', zh: '未完成的事情' },
  { key: 'learned', zh: '学到的事情' },
  { key: 'reflect', zh: '需要自省的事情' },
  { key: 'other', zh: '其他' }
];

const SHORT: Record<string, string> = { Lecture: 'Lec', Tutorial: 'Tut' };

export function MonthScreen() {
  const { book, today, focus, setFocus, entries, openEntry, readOnly } = useApp();
  const sem = book.semester;
  const f = fromISO(focus);
  const year = f.getFullYear();
  const month = f.getMonth();
  const monthKey = focus.slice(0, 7);
  const weeks = monthGrid(year, month);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chipsRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [month]);

  const note = useLiveQuery(() => db.monthNotes.get(`${book.id}:${monthKey}`).then((n) => (n?.deleted ? undefined : n)), [book.id, monthKey]);
  const agenda = entriesOn(entries, focus, sem);
  const selWeek = weekLabel(sem, focus);

  const goMonth = (m: number) => {
    const target = new Date(year, m, 1);
    if (target.getFullYear() !== book.year) return;
    const isThisMonth = today.slice(0, 7) === toISO(target).slice(0, 7);
    setFocus(isThisMonth ? today : toISO(target));
  };

  return (
    <main className="screen">
      <header className="topbar">
        <h1 className="pill">{MONTHS_EN[month].toUpperCase()} <span>{year}</span></h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label="Previous month" onClick={() => goMonth(month - 1)} disabled={month === 0}><Icon name="left" size={18} /></button>
          <button className="icon-btn" aria-label="Next month" onClick={() => goMonth(month + 1)} disabled={month === 11}><Icon name="right" size={18} /></button>
        </div>
      </header>

      <nav className="chips" aria-label="Months" ref={chipsRef}>
        {Array.from({ length: 12 }, (_, m) => (
          <button key={m} className="chip" aria-current={m === month ? 'true' : undefined} onClick={() => goMonth(m)}>{m + 1}月</button>
        ))}
      </nav>

      <div className="card">
        <div className="mgrid-head">
          <span />
          {WEEKDAYS_EN.map((d, i) => <span key={i}>{d[0]}</span>)}
        </div>
        {weeks.map((week) => {
          const wl = weekLabel(sem, week[0]);
          return (
            <div key={week[0]} className="mgrid-row">
              <span className={`wk${wl?.kind === 'teaching' ? '' : ' off'}`} aria-label={longLabel(wl)}>{shortLabel(wl)}</span>
              {week.map((d) => {
                const inMonth = d.slice(0, 7) === monthKey;
                const es = inMonth ? entriesOn(entries, d, sem) : [];
                const classes = es.filter((e) => e.category === 'class');
                const tag = es.find((e) => e.category !== 'class');
                const n = fromISO(d).getDate();
                return (
                  <button
                    key={d}
                    className={`mcell${inMonth ? '' : ' out'}${d === focus ? ' sel' : ''}`}
                    aria-label={`${WEEKDAYS_EN[weekdayIndex(d)]} ${n} ${MONTHS_EN[fromISO(d).getMonth()]}${es.length ? `, ${es.length} items` : ''}`}
                    onClick={() => (inMonth ? setFocus(d) : fromISO(d).getFullYear() === book.year && setFocus(d))}
                    onDoubleClick={() => !readOnly && openEntry({ date: d })}
                  >
                    <span className={`num${d === today ? ' today' : ''}`}>{n}</span>
                    <span className="dots">{classes.slice(0, 5).map((c) => <i key={c.id} />)}</span>
                    {tag && <span className={`mtag bg-${tag.category} c-${tag.category}`}>{tag.title.replace(/ (Lecture|Tutorial)$/, (m) => ' ' + SHORT[m.trim()])}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="dot dot-class" />Class</span>
        <span><i className="dot dot-personal" />Personal</span>
        <span><i className="dot dot-important" />Important</span>
        <span><i className="dot dot-birthday" />Birthday</span>
        {sem && <span><b className="week-tag" style={{ fontSize: 16 }}>W</b>Teaching week</span>}
      </div>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: 14, color: 'var(--ink)' }}>{WEEKDAYS_EN[weekdayIndex(focus)]}, {f.getDate()} {MONTHS_EN[month]}</h2>
          <span className="week-tag" style={{ fontSize: 20 }}>{selWeek?.kind === 'teaching' ? shortLabel(selWeek) : longLabel(selWeek)}</span>
        </div>
        {agenda.length === 0 && <div className="empty">Free day — tap + to add something</div>}
        {agenda.map((e) => <EntryRow key={e.id} e={e} onOpen={() => openEntry(e)} />)}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
          本月回顾 <small className="muted" style={{ letterSpacing: '0.08em', fontSize: 11, fontWeight: 500 }}>MONTH NOTES</small>
        </h2>
        <div className="notes-grid">
          {NOTE_BOXES.map((b) => (
            <div key={b.key} className="card note-box">
              <div className="card-head"><h2>{b.zh}</h2></div>
              <NoteArea
                className="hand-area"
                label={b.zh}
                placeholder="Tap to write"
                value={note?.[b.key] as string | undefined}
                disabled={readOnly}
                onSave={(v) => patchMonthNote(book.id, monthKey, { [b.key]: v })}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
