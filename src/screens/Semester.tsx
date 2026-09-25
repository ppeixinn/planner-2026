import { useState } from 'react';
import { useApp } from '../AppContext';
import { db } from '../data/db';
import { weekdayIndex } from '../lib/dates';
import type { Semester } from '../lib/semester';
import { Icon } from '../components/Icon';

export function SemesterScreen() {
  const { book, go, readOnly } = useApp();
  const init: Semester = book.semester ?? { start: `${book.year}-08-10`, weeksBeforeRecess: 7, teachingWeeks: 13 };
  const [sem, setSem] = useState<Semester>(init);
  const [saved, setSaved] = useState(false);
  const notMonday = weekdayIndex(sem.start) !== 0;

  const save = async () => {
    await db.yearbooks.update(book.id, { semester: sem, updatedAt: Date.now() });
    setSaved(true);
  };
  const clear = async () => {
    await db.yearbooks.update(book.id, { semester: undefined, updatedAt: Date.now() });
    go('more');
  };

  const set = (patch: Partial<Semester>) => { setSem({ ...sem, ...patch }); setSaved(false); };

  return (
    <main className="screen">
      <header className="topbar" style={{ justifyContent: 'flex-start' }}>
        <button className="back-btn" aria-label="Back to tools" onClick={() => go('more')}><Icon name="left" /></button>
        <h1 className="pill">学期 <span>SEMESTER</span></h1>
      </header>

      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Teaching-week labels (W1–W13) and “skip recess &amp; exam weeks” on repeating classes use these dates.
      </p>

      <div className="group" style={{ background: 'var(--card)' }}>
        <label className="row">
          <span className="grow"><span className="title" style={{ fontWeight: 500 }}>W1 周一 Monday of week 1</span>{notMonday && <span className="sub c-important">Pick a Monday</span>}</span>
          <input type="date" value={sem.start} onChange={(e) => e.target.value && set({ start: e.target.value })} disabled={readOnly} />
        </label>
        <label className="row">
          <span className="grow"><span className="title" style={{ fontWeight: 500 }}>Recess after week</span></span>
          <input type="number" min={1} max={20} value={sem.weeksBeforeRecess} onChange={(e) => set({ weeksBeforeRecess: Number(e.target.value) })}
            style={{ width: 64, border: 0, textAlign: 'right', background: 'transparent', fontSize: 15 }} disabled={readOnly} />
        </label>
        <label className="row">
          <span className="grow"><span className="title" style={{ fontWeight: 500 }}>Teaching weeks</span></span>
          <input type="number" min={1} max={20} value={sem.teachingWeeks} onChange={(e) => set({ teachingWeeks: Number(e.target.value) })}
            style={{ width: 64, border: 0, textAlign: 'right', background: 'transparent', fontSize: 15 }} disabled={readOnly} />
        </label>
        <label className="row">
          <span className="grow"><span className="title" style={{ fontWeight: 500 }}>考试开始 Exams start</span></span>
          <input type="date" value={sem.examStart ?? ''} onChange={(e) => set({ examStart: e.target.value || undefined })} disabled={readOnly} />
        </label>
        <label className="row">
          <span className="grow"><span className="title" style={{ fontWeight: 500 }}>考试结束 Exams end</span></span>
          <input type="date" value={sem.examEnd ?? ''} onChange={(e) => set({ examEnd: e.target.value || undefined })} disabled={readOnly} />
        </label>
      </div>

      {!readOnly && <button className="primary" onClick={save} disabled={notMonday}>{saved ? '已保存 Saved' : '保存 Save'}</button>}
      {!readOnly && book.semester && <button className="text-btn danger" onClick={clear}>Remove semester (no week labels)</button>}
    </main>
  );
}
