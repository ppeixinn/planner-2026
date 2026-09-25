import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { newId, type Category, type Entry, type Repeat } from '../data/db';
import { deleteEntry, saveEntry } from '../data/actions';
import { formatShort, WEEKDAYS_FULL, weekdayIndex } from '../lib/dates';
import { lastTeachingDay, shortLabel, weekLabel } from '../lib/semester';

const CATS: { id: Category; label: string; dot: string }[] = [
  { id: 'class', label: '课 Class', dot: 'dot-class' },
  { id: 'personal', label: '私 Personal', dot: 'dot-personal' },
  { id: 'important', label: '要 Important', dot: 'dot-important' },
  { id: 'birthday', label: '生日 Birthday', dot: 'dot-birthday' }
];

type RepeatChoice = 'none' | 'weekly' | 'yearly';

export function EntrySheet({ init, onClose }: { init: Partial<Entry> & { date: string }; onClose: () => void }) {
  const { book, readOnly } = useApp();
  const sem = book.semester;
  const isNew = !init.id;
  const [title, setTitle] = useState(init.title ?? '');
  const [category, setCategory] = useState<Category>(init.category ?? 'personal');
  const [date, setDate] = useState(init.date);
  const [start, setStart] = useState(init.start ?? '');
  const [end, setEnd] = useState(init.end ?? '');
  const [location, setLocation] = useState(init.location ?? '');
  const [repeat, setRepeat] = useState<RepeatChoice>(init.repeat?.kind ?? 'none');
  const [skip, setSkip] = useState(init.repeat?.kind === 'weekly' ? init.repeat.skipNonTeaching : init.category === 'class');
  const defaultUntil = (c: Category) => (c === 'class' && sem ? lastTeachingDay(sem) : `${book.year}-12-31`);
  const [until, setUntil] = useState(
    init.repeat?.kind === 'weekly' && init.repeat.until ? init.repeat.until : defaultUntil(init.category ?? 'personal')
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Choosing a pen suggests the usual repeat: classes weekly, birthdays yearly.
  const pickCategory = (c: Category) => {
    setCategory(c);
    if (isNew) { setSkip(c === 'class'); setUntil(defaultUntil(c)); }
    if (isNew && c === 'class') setRepeat('weekly');
    if (isNew && c === 'birthday') setRepeat('yearly');
    if (isNew && (c === 'personal' || c === 'important')) setRepeat('none');
  };

  const wl = weekLabel(sem, date);
  const canSave = title.trim().length > 0 && !readOnly;

  const save = async () => {
    if (!canSave) return;
    const rep: Repeat = repeat === 'weekly'
      ? { kind: 'weekly', until: until || undefined, skipNonTeaching: skip }
      : repeat === 'yearly' ? { kind: 'yearly' } : { kind: 'none' };
    await saveEntry({
      id: init.id ?? newId(),
      yearbookId: book.id,
      title: title.trim(),
      category,
      date,
      start: start || undefined,
      end: start && end ? end : undefined,
      location: location.trim() || undefined,
      repeat: rep
    });
    onClose();
  };

  const remove = async () => {
    if (!init.id) return;
    const series = init.repeat && init.repeat.kind !== 'none';
    if (!confirm(series ? `Delete every "${init.title}"? 删除整个重复？` : `Delete "${init.title}"? 删除？`)) return;
    await deleteEntry(init.id);
    onClose();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={isNew ? 'New entry' : 'Edit entry'} onClick={(e) => e.stopPropagation()}>
        <span className="grabber" />
        <div className="sheet-top">
          <button className="text-btn" onClick={onClose}>取消 Cancel</button>
          <h1>{isNew ? '新建 New' : '编辑 Edit'}</h1>
          <button className="text-btn strong" onClick={save} disabled={!canSave}>保存 Save</button>
        </div>

        <div className="field">
          <label htmlFor="entry-title">标题 Title</label>
          <input id="entry-title" className="input" value={title} autoFocus={isNew} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Tutorial · 和朋友吃饭" />
        </div>

        <div className="field">
          <span className="label">笔色 Pen colour</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATS.map((c) => (
              <button key={c.id} className={`pen-chip${category === c.id ? ` bg-${c.id} c-${c.id}` : ''}`} aria-pressed={category === c.id} onClick={() => pickCategory(c.id)}>
                <i className={`dot ${c.dot}`} style={{ width: 10, height: 10, borderRadius: 5 }} />{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <label className="row">
            <span className="grow"><span className="title" style={{ fontWeight: 500 }}>日期 Date</span></span>
            <input type="date" value={date} min={`${book.year}-01-01`} max={`${book.year}-12-31`} onChange={(e) => e.target.value && setDate(e.target.value)} />
            {wl && <span className="week-tag" style={{ fontSize: 20 }}>{shortLabel(wl)}</span>}
          </label>
          <label className="row">
            <span className="grow"><span className="title" style={{ fontWeight: 500 }}>开始 Start</span></span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start time" />
          </label>
          {start && (
            <label className="row">
              <span className="grow"><span className="title" style={{ fontWeight: 500 }}>结束 End</span></span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End time" />
            </label>
          )}
          <label className="row">
            <span className="grow"><span className="title" style={{ fontWeight: 500 }}>地点 Place</span></span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="LT1" style={{ border: 0, textAlign: 'right', fontSize: 15, background: 'transparent', minHeight: 40, width: 140 }} />
          </label>
        </div>

        <div className="field">
          <span className="label">重复 Repeat</span>
          <div className="seg">
            <button aria-pressed={repeat === 'none'} onClick={() => setRepeat('none')}>不重复 Once</button>
            <button aria-pressed={repeat === 'weekly'} onClick={() => setRepeat('weekly')}>每周 Weekly</button>
            <button aria-pressed={repeat === 'yearly'} onClick={() => setRepeat('yearly')}>每年 Yearly</button>
          </div>
        </div>

        {repeat === 'weekly' && (
          <div className="group">
            <div className="row">
              <span className="grow"><span className="title" style={{ fontWeight: 500 }}>Every {WEEKDAYS_FULL[weekdayIndex(date)]}</span><span className="sub">from {formatShort(date)}</span></span>
            </div>
            <label className="row">
              <span className="grow"><span className="title" style={{ fontWeight: 500 }}>直到 Until</span></span>
              <input type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} />
            </label>
            {sem && (
              <button className="row" aria-pressed={skip} onClick={() => setSkip(!skip)}>
                <span className="grow"><span className="title" style={{ fontWeight: 500 }}>跳过假期 Skip recess &amp; exam weeks</span></span>
                <span className="switch"><span /></span>
              </button>
            )}
          </div>
        )}

        <button className="primary" onClick={save} disabled={!canSave}>
          {repeat === 'weekly' ? `保存到每个${'一二三四五六日'[weekdayIndex(date)]} · Save weekly` : '保存 Save'}
        </button>
        {!isNew && !readOnly && <button className="text-btn danger" onClick={remove}>删除 Delete{init.repeat && init.repeat.kind !== 'none' ? ' series' : ''}</button>}
      </div>
    </div>
  );
}
