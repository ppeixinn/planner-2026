import { Icon } from './Icon';

export type Tab = 'today' | 'month' | 'week' | 'goals' | 'more';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'month', label: 'Month', icon: 'calendar' },
  { id: 'week', label: 'Week', icon: 'week' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'more', label: 'More', icon: 'grid' }
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-current={active === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
            <Icon name={t.icon} size={24} />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
