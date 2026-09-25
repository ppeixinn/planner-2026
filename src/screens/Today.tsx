import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../AppContext';
import { db } from '../data/db';
import { addTask, deleteTask, patchDayNote, toggleHabit, toggleTask } from '../data/actions';
import { setSetting } from '../data/hooks';
import { entriesOn } from '../lib/recurrence';
import { addDays, formatLong, formatShort, slotForTime, WEEKDAYS_FULL, weekdayIndex } from '../lib/dates';
import { longLabel, shortLabel, weekLabel } from '../lib/semester';
import { Icon } from '../components/Icon';
import { EntryRow } from '../components/EntryRow';
import { NoteArea } from '../components/NoteArea';

const SLOTS = [
  { key: 'am', zh: '早', en: 'Morning' },
  { key: 'pm', zh: '午', en: 'Afternoon' },
  { key: 'eve', zh: '晚', en: 'Evening' }
] as const;

const MOOD_SHADES = ['#E1E5DC', '#C6CFBD', '#A3B39A', '#7C9171', '#4F6647'];

export function TodayScreen() {
  const { book, books, today, entries, openEntry, readOnly } = useApp();
  const sem = book.semester;
  const todays = entriesOn(entries, today, sem);
  const highlights = todays.filter((e) => e.category === 'important' || e.category === 'birthday');
  const schedule = todays.filter((e) => e.category === 'class' || e.start || e.category === 'personal');

  const upcoming = [1, 2, 3, 4, 5, 6, 7].flatMap((n) => {
    const d = addDays(today, n);
    return entriesOn(entries, d, sem).filter((e) => e.category !== 'class' && e.repeat.kind !== 'weekly').map((e) => ({ d, e }));
  }).slice(0, 3);

  const wk = weekLabel(sem, today);
  const nextWk = weekLabel(sem, addDays(today, 7));

  const note = useLiveQuery(() => db.dayNotes.get(`${book.id}:${today}`).then((n) => (n?.deleted ? undefined : n)), [book.id, today]);
  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(today).filter((t) => t.yearbookId === book.id && t.scope === 'day' && !t.deleted).sortBy('order'),
    [book.id, today]
  ) ?? [];
  const habits = useLiveQuery(() => db.habits.where('yearbookId').equals(book.id).filter((h) => !h.deleted).sortBy('order'), [book.id]) ?? [];
  const ticks = useLiveQuery(() => db.habitTicks.where('date').equals(today).filter((t) => !t.deleted).toArray(), [today]) ?? [];

  const [newTask, setNewTask] = useState('');
  const submitTask = () => {
    const t = newTask.trim();
    if (!t) return;
    addTask(book.id, t, today, 'day');
    setNewTask('');
  };

  const current = books.find((b) => b.year === Number(today.slice(0, 4)));
  const otherBook = book.year !== Number(today.slice(0, 4));

  return (
    <main className="screen">
      {otherBook && (
        <div className="readonly-banner">
          <span style={{ flexGrow: 1 }}>正在看 {book.year} 年册 · Viewing the {book.year} yearbook</span>
          {current && <button className="text-btn strong" onClick={() => setSetting('activeYearbook', current.id)}>回到 {current.year}</button>}
        </div>
      )}

      <header className="topbar" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="pill small">{WEEKDAYS_FULL[weekdayIndex(today)].toUpperCase()}</span>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>{formatLong(today)}</h1>
          {wk && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }} className="muted">
              <span className="week-tag" style={{ fontSize: 24 }}>{shortLabel(wk)}</span>
              <span>{longLabel(wk)}{nextWk?.kind === 'recess' ? ' · recess next week' : ''}</span>
            </div>
          )}
        </div>
      </header>

      {highlights.map((e) => (
        <button key={e.id} className={`banner bg-${e.category}`} onClick={() => openEntry(e)}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={`c-${e.category}`}>
            <Icon name="star" size={18} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }} className={`c-${e.category}`}>
            <span className="kicker">{e.category === 'birthday' ? '生日 · BIRTHDAY' : '重要 · IMPORTANT'}{e.start ? ` · ${e.start}` : ''}</span>
            <span className="big">{e.title}</span>
          </span>
        </button>
      ))}

      <section className="card">
        <div className="card-head">
          <h2>今日安排<small>SCHEDULE</small></h2>
        </div>
        {schedule.length === 0 && <div className="empty">No classes today · 今天没课</div>}
        {schedule.map((e) => <EntryRow key={e.id} e={e} onOpen={() => openEntry(e)} />)}
        {upcoming.map(({ d, e }) => (
          <button key={e.id + d} className="row" style={{ background: '#FAFAF7' }} onClick={() => openEntry(e)}>
            <span style={{ width: 52, fontSize: 12, fontWeight: 600 }} className="muted">{formatShort(d).split(' ').slice(0, 2).join(' ').toUpperCase()}</span>
            <span className={`hand c-${e.category}`} style={{ fontSize: 20, flexGrow: 1 }}>{e.title}</span>
          </button>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><h2>一日三栏<small>DAY IN THREE</small></h2></div>
        <div className="three">
          {SLOTS.map((s) => (
            <div key={s.key}>
              <div className="slot-head">{s.zh} {s.en}</div>
              <div className="slot-body">
                {todays.filter((e) => e.start && slotForTime(e.start) === s.key).map((e) =>
                  e.category === 'class'
                    ? <span key={e.id} className="mini-entry">{e.start} {e.title.replace(/ (Lecture|Tutorial)$/, (m) => (m === ' Lecture' ? ' Lec' : ' Tut'))}</span>
                    : <span key={e.id} className={`mini-pill bg-${e.category} c-${e.category}`}>{e.title}</span>
                )}
                <NoteArea
                  className="hand-area c-personal"
                  label={`${s.en} notes`}
                  placeholder="…"
                  value={note?.[s.key]}
                  disabled={readOnly}
                  onSave={(v) => patchDayNote(book.id, today, { [s.key]: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>待办<small>TO-DO</small></h2>
          <span className="muted" style={{ fontSize: 12 }}>{tasks.filter((t) => t.done).length} of {tasks.length} done</span>
        </div>
        <div style={{ padding: '2px 14px 0' }}>
          {tasks.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 48, borderBottom: '1px solid var(--line-2)' }}>
              <button className={`check${t.done ? ' on' : ''}`} aria-label={`${t.done ? 'Mark not done' : 'Mark done'}: ${t.title}`} onClick={() => toggleTask(t, today)} disabled={readOnly}>
                <span className="box">{t.done && <Icon name="check" size={14} strokeWidth={3} />}</span>
              </button>
              <span style={{ flexGrow: 1, fontSize: 15 }} className={t.done ? 'task-done' : ''}>{t.title}</span>
              {t.tag && <span className="tag">{t.tag}</span>}
              {t.done && !readOnly && (
                <button className="back-btn" style={{ margin: 0 }} aria-label={`Remove ${t.title}`} onClick={() => deleteTask(t.id)}>
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <form className="add-inline" onSubmit={(e) => { e.preventDefault(); submitTask(); }}>
            <Icon name="plus" size={18} />
            <input aria-label="New task" placeholder="Add task · unfinished ones roll to tomorrow" value={newTask} onChange={(e) => setNewTask(e.target.value)} onBlur={submitTask} />
          </form>
        )}
      </section>

      {habits.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>习惯<small>HABITS</small></h2></div>
          <div className="habits">
            {habits.map((h) => {
              const on = !!ticks.find((t) => t.habitId === h.id && t.on);
              return (
                <button key={h.id} className="habit" aria-pressed={on} aria-label={h.en} onClick={() => toggleHabit(h.id, today)} disabled={readOnly}>
                  <span className="ring">{on ? <Icon name="check" size={20} strokeWidth={2.6} /> : h.zh}</span>
                  <b>{h.en}</b>
                  {h.meta && <small>{h.meta}</small>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>今日回忆<small>MEMORY</small></h2>
          <span className="muted" style={{ fontSize: 12 }}>Saves to Memories {book.year}</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <NoteArea
            multiline={false}
            className="hand-input"
            label="One line to remember today"
            placeholder="今天记住的一件事 · one line to remember"
            value={note?.memory}
            disabled={readOnly}
            onSave={(v) => patchDayNote(book.id, today, { memory: v })}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>心情 Mood</span>
            <div className="moods">
              {MOOD_SHADES.map((c, i) => (
                <button key={c} aria-label={`Mood ${i + 1} of 5`} aria-pressed={note?.mood === i} disabled={readOnly}
                  onClick={() => patchDayNote(book.id, today, { mood: note?.mood === i ? undefined : i })}>
                  <span style={{ background: c }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
