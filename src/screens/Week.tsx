import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../AppContext';
import { db } from '../data/db';
import { addTask, deleteTask, patchDayNote, toggleTask } from '../data/actions';
import { entriesOn } from '../lib/recurrence';
import { addDays, fromISO, MONTHS_EN, slotForTime, startOfWeek, WEEKDAYS_EN } from '../lib/dates';
import { shortLabel, longLabel, weekLabel } from '../lib/semester';
import { Icon } from '../components/Icon';
import { NoteArea } from '../components/NoteArea';

const SLOTS = ['am', 'pm', 'eve'] as const;

export function WeekScreen() {
  const { book, today, focus, setFocus, entries, openEntry, readOnly } = useApp();
  const sem = book.semester;
  const monday = startOfWeek(focus);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];
  const wl = weekLabel(sem, monday);

  const notes = useLiveQuery(
    () => db.dayNotes.where('date').between(monday, sunday, true, true).filter((n) => n.yearbookId === book.id && !n.deleted).toArray(),
    [book.id, monday]
  ) ?? [];
  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(monday).filter((t) => t.yearbookId === book.id && t.scope === 'week' && !t.deleted).sortBy('order'),
    [book.id, monday]
  ) ?? [];
  const [newTask, setNewTask] = useState('');
  const submitTask = () => {
    const t = newTask.trim();
    if (!t) return;
    addTask(book.id, t, monday, 'week');
    setNewTask('');
  };

  const m1 = fromISO(monday);
  const m2 = fromISO(sunday);
  const range = m1.getMonth() === m2.getMonth()
    ? `${m1.getDate()} – ${m2.getDate()} ${MONTHS_EN[m1.getMonth()]}`
    : `${m1.getDate()} ${MONTHS_EN[m1.getMonth()].slice(0, 3)} – ${m2.getDate()} ${MONTHS_EN[m2.getMonth()].slice(0, 3)}`;

  return (
    <main className="screen">
      <header className="topbar">
        <h1 className="pill">WEEKLY <span>{book.year}</span></h1>
        <span className="muted" style={{ fontSize: 13 }}>一日三栏</span>
      </header>

      <div className="topbar">
        <button className="icon-btn" aria-label="Previous week" onClick={() => setFocus(addDays(monday, -7))}><Icon name="left" size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {wl && <span className="week-tag" style={{ fontSize: 28 }} aria-label={longLabel(wl)}>{shortLabel(wl) === 'R' ? 'Recess' : shortLabel(wl)}</span>}
          <span style={{ fontSize: 16, fontWeight: 600 }}>{range}</span>
        </div>
        <button className="icon-btn" aria-label="Next week" onClick={() => setFocus(addDays(monday, 7))}><Icon name="right" size={18} /></button>
      </div>

      <div className="card">
        <div className="week-grid-head"><span /><span>早</span><span>午</span><span>晚</span></div>
        {days.map((d, i) => {
          const es = entriesOn(entries, d, sem);
          const note = notes.find((n) => n.date === d);
          const allDay = es.filter((e) => !e.start);
          return (
            <div key={d} className={`week-grid-row${d === today ? ' today' : ''}`}>
              <button className="day" onClick={() => setFocus(d)} aria-label={`${WEEKDAYS_EN[i]} ${fromISO(d).getDate()}`}>
                <small>{WEEKDAYS_EN[i].toUpperCase()}</small>
                {d === today
                  ? <b style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{fromISO(d).getDate()}</b>
                  : <b>{fromISO(d).getDate()}</b>}
              </button>
              {SLOTS.map((slot) => (
                <div key={slot} className="cell">
                  {slot === 'am' && allDay.map((e) => (
                    <button key={e.id} className={`mini-pill bg-${e.category} c-${e.category}`} style={{ border: 0 }} onClick={() => openEntry(e)}>{e.title}</button>
                  ))}
                  {es.filter((e) => e.start && slotForTime(e.start) === slot).map((e) => (
                    <button key={e.id} onClick={() => openEntry(e)} style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left' }}
                      className={e.category === 'class' ? 'mini-entry' : `hand c-${e.category}`}>
                      {e.category === 'class'
                        ? <>{e.title.replace(' Lecture', ' Lec').replace(' Tutorial', ' Tut')}<small>{e.start}{e.location ? ` · ${e.location}` : ''}</small></>
                        : <span style={{ fontSize: 18, lineHeight: 1 }}>{e.title}</span>}
                    </button>
                  ))}
                  <NoteArea
                    className="hand-area c-personal"
                    label={`${WEEKDAYS_EN[i]} ${slot} notes`}
                    value={note?.[slot]}
                    disabled={readOnly}
                    onSave={(v) => patchDayNote(book.id, d, { [slot]: v })}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head"><h2>本周待办<small>THIS WEEK</small></h2></div>
        <div style={{ padding: '2px 14px 0' }}>
          {tasks.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 48, borderBottom: '1px solid var(--line-2)' }}>
              <button className={`check${t.done ? ' on' : ''}`} aria-label={`${t.done ? 'Mark not done' : 'Mark done'}: ${t.title}`} onClick={() => toggleTask(t, today)} disabled={readOnly}>
                <span className="box">{t.done && <Icon name="check" size={14} strokeWidth={3} />}</span>
              </button>
              <span style={{ flexGrow: 1, fontSize: 15 }} className={t.done ? 'task-done' : ''}>{t.title}</span>
              {t.done && !readOnly && (
                <button className="back-btn" style={{ margin: 0 }} aria-label={`Remove ${t.title}`} onClick={() => deleteTask(t.id)}><Icon name="x" size={16} /></button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <form className="add-inline" onSubmit={(e) => { e.preventDefault(); submitTask(); }}>
            <Icon name="plus" size={18} />
            <input aria-label="New task for this week" placeholder="Add a task for this week" value={newTask} onChange={(e) => setNewTask(e.target.value)} onBlur={submitTask} />
          </form>
        )}
      </section>
    </main>
  );
}
