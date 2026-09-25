import type { Entry } from '../data/db';
import { Icon } from './Icon';

export const CATEGORY_LABEL: Record<Entry['category'], string> = {
  class: '课 Class',
  personal: '私 Personal',
  important: '要 Important',
  birthday: '生日 Birthday'
};

export function EntryRow({ e, onOpen }: { e: Entry; onOpen: () => void }) {
  const repeating = e.repeat.kind !== 'none';
  return (
    <button className="row" onClick={onOpen}>
      <div className="time">
        {e.start ? <><b>{e.start}</b><span>{e.end ?? ''}</span></> : <span>All day</span>}
      </div>
      <div className="grow">
        {e.category === 'class'
          ? <span className="title">{e.title}</span>
          : <span className={`title hand c-${e.category}`} style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.05 }}>{e.title}</span>}
        <span className="sub" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {e.location && <span>{e.location}</span>}
          {repeating && (
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Icon name="repeat" size={14} />{e.repeat.kind === 'yearly' ? 'Yearly' : 'Weekly'}
            </span>
          )}
          {!e.location && !repeating && <span>{CATEGORY_LABEL[e.category]}</span>}
        </span>
      </div>
      <span className={`dot dot-${e.category}`} />
    </button>
  );
}
