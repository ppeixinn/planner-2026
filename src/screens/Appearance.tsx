import { useApp } from '../AppContext';
import { setSetting, themeFor } from '../data/hooks';
import { setYearbookTheme } from '../data/actions';
import { HAND_FONTS, PALETTES } from '../lib/theme';
import { Icon } from '../components/Icon';

export function AppearanceScreen() {
  const { book, settings, go } = useApp();
  const current = themeFor(settings, book);

  const pickTheme = (id: string) => {
    if (settings.themeScope === 'all') setSetting('globalTheme', id);
    else setYearbookTheme(book.id, id);
  };

  const pickScope = (scope: 'book' | 'all') => {
    // Switching scope keeps whatever colour is showing now.
    if (scope === 'all') setSetting('globalTheme', current.id);
    else setYearbookTheme(book.id, current.id);
    setSetting('themeScope', scope);
  };

  return (
    <main className="screen">
      <header className="topbar" style={{ justifyContent: 'flex-start' }}>
        <button className="back-btn" aria-label="Back to tools" onClick={() => go('more')}><Icon name="left" /></button>
        <h1 className="pill">外观 <span>APPEARANCE</span></h1>
      </header>

      <section aria-label="Preview" className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 8px 24px rgba(35,38,31,0.08)' }}>
        <div className="topbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pill small" style={{ fontSize: 10 }}>FRIDAY</span>
            <span style={{ fontSize: 22, fontWeight: 600 }}>25 September</span>
          </div>
          <span className="week-tag" style={{ fontSize: 28 }}>W7</span>
        </div>
        <div className="banner bg-important c-important" style={{ padding: '8px 10px' }}>
          <span className="kicker">IMPORTANT</span><span style={{ fontWeight: 600 }}>Project deadline</span>
        </div>
        <div className="card">
          <div className="three" style={{ background: 'var(--tint)' }}>
            {['早', '午', '晚'].map((s) => <div key={s} className="slot-head" style={{ border: 0 }}>{s}</div>)}
          </div>
          <div className="three">
            <div><div className="slot-body" style={{ minHeight: 56 }}><span className="hand c-personal" style={{ fontSize: 19 }}>复习 Revise</span></div></div>
            <div><div className="slot-body" style={{ minHeight: 56 }}><span className="mini-entry">14:30 Tutorial</span></div></div>
            <div><div className="slot-body" style={{ minHeight: 56 }}><span className="hand c-personal" style={{ fontSize: 19 }}>健身 Gym</span></div></div>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>主题色 <small className="muted" style={{ letterSpacing: '0.08em', fontSize: 11 }}>MORANDI COLOURS</small></h2>
        <div className="swatches">
          {PALETTES.map((p) => (
            <button key={p.id} className="swatch" aria-pressed={current.id === p.id} aria-label={`${p.en} theme`} onClick={() => pickTheme(p.id)}>
              <span className="top" style={{ background: p.head }} />
              <span className="bar"><i style={{ background: p.deep }} /><i style={{ background: p.tint }} /><i style={{ background: p.paper }} /></span>
              <span className="name"><b>{p.zh}</b><small>{p.en}</small></span>
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Apply colour to">
          <button aria-pressed={settings.themeScope === 'book'} onClick={() => pickScope('book')}>本册 This book</button>
          <button aria-pressed={settings.themeScope === 'all'} onClick={() => pickScope('all')}>全部 All books</button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>手写字体 <small className="muted" style={{ letterSpacing: '0.08em', fontSize: 11 }}>HANDWRITING · 中文 + ENGLISH</small></h2>
        <div className="card">
          {HAND_FONTS.map((f) => (
            <button key={f.id} className="row" aria-pressed={settings.font === f.id} onClick={() => setSetting('font', f.id)} style={{ minHeight: 64 }}>
              <span className="radio" />
              <span className="grow">
                <span style={{ fontFamily: f.family, fontSize: 24, lineHeight: 1.1 }}>今天也要加油 · Keep going</span>
                <span className="sub">{f.label}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <button className="row" aria-pressed={settings.softPens} onClick={() => setSetting('softPens', !settings.softPens)} style={{ minHeight: 60 }}>
          <span className="grow"><span className="title">柔和笔色 Soft pen colours</span><span className="sub">Mute orange / red / pink to match the theme</span></span>
          <span className="switch"><span /></span>
        </button>
      </section>
    </main>
  );
}
