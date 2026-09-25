import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Session } from '@supabase/supabase-js';
import { db, openDb, type Entry } from './data/db';
import { seedSample } from './data/seed';
import { themeFor, useSettings, useYearbooks } from './data/hooks';
import { rollOverTasks } from './data/actions';
import { applyTheme } from './lib/theme';
import { supabase } from './lib/supabase';
import { initialPull, startSync, stopSync } from './lib/sync';
import { todayISO, type ISODate } from './lib/dates';
import { Ctx, type Account, type AppCtx, type SubPage } from './AppContext';
import { TabBar, type Tab } from './components/TabBar';
import { Icon } from './components/Icon';
import { TodayScreen } from './screens/Today';
import { MonthScreen } from './screens/Month';
import { WeekScreen } from './screens/Week';
import { GoalsScreen } from './screens/Goals';
import { MoreScreen } from './screens/More';
import { AppearanceScreen } from './screens/Appearance';
import { YearbooksScreen } from './screens/Yearbooks';
import { SemesterScreen } from './screens/Semester';
import { EntrySheet } from './screens/EntrySheet';
import { AuthScreen } from './screens/Auth';

function readHash(): { tab: Tab; sub: SubPage } {
  const [tab, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const tabs: Tab[] = ['today', 'month', 'week', 'goals', 'more'];
  return {
    tab: (tabs.includes(tab as Tab) ? tab : 'today') as Tab,
    sub: (['appearance', 'yearbooks', 'semester'].includes(sub) ? sub : null) as SubPage
  };
}

function Splash({ text }: { text?: string }) {
  return (
    <main className="screen" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
      <span className="hand muted" style={{ fontSize: 26 }}>{text ?? '载入中 · Loading…'}</span>
    </main>
  );
}

/** Decides between the sign-in page and the planner. Without Supabase keys it runs on this device only. */
export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (supabase && session === undefined) return <div className="app"><Splash /></div>;
  if (supabase && !session) return <div className="app"><AuthScreen /></div>;
  if (recovery) return <div className="app"><AuthScreen recovery onDone={() => setRecovery(false)} /></div>;

  const account: Account | null = session
    ? { id: session.user.id, email: session.user.email ?? '', name: (session.user.user_metadata?.name as string | undefined) ?? '' }
    : null;
  return <Planner key={account?.id ?? 'local'} account={account} />;
}

type Boot = 'loading' | 'ready' | 'offline';

function Planner({ account }: { account: Account | null }) {
  // Open this account's own local database before any query runs.
  useState(() => openDb(account ? `planner-${account.id}` : 'planner-local'));
  const [boot, setBoot] = useState<Boot>('loading');
  const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState(readHash);
  const [today, setToday] = useState(todayISO);
  const [focus, setFocus] = useState<ISODate>(todayISO);
  const [editing, setEditing] = useState<(Partial<Entry> & { date: ISODate }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = () => db.yearbooks.filter((y) => !y.deleted).count();
      if (!account) {
        if ((await count()) === 0) await seedSample();
      } else if ((await count()) === 0) {
        // New device or new account: fetch what the account already has before adding samples.
        if (!(await initialPull())) { if (!cancelled) setBoot('offline'); return; }
        if ((await count()) === 0) await seedSample();
      }
      if (cancelled) return;
      setBoot('ready');
      if (account) startSync(account.id);
    })();
    return () => { cancelled = true; stopSync(); };
  }, [account?.id, attempt]);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    // Keep "today" right when the app stays open past midnight or comes back from the background.
    const tick = () => setToday(todayISO());
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const settings = useSettings();
  const books = useYearbooks();
  const book = books?.find((b) => b.id === settings?.activeYearbook) ?? books?.find((b) => b.year === Number(today.slice(0, 4))) ?? books?.[books.length - 1];
  const entries = useLiveQuery(
    () => (book ? db.entries.where('yearbookId').equals(book.id).filter((e) => !e.deleted).toArray() : []),
    [book?.id]
  );

  useEffect(() => {
    if (settings && book) applyTheme(themeFor(settings, book), settings.font, settings.softPens);
    document.body.classList.toggle('soft', !!settings?.softPens);
  }, [settings, book]);

  useEffect(() => {
    if (boot === 'ready' && book && !book.readOnly) rollOverTasks(book.id, today);
  }, [boot, book?.id, today]);

  // Opening another yearbook points Month and Week at that year.
  useEffect(() => {
    if (!book) return;
    if (Number(focus.slice(0, 4)) !== book.year) setFocus(book.year === Number(today.slice(0, 4)) ? today : `${book.year}-01-01`);
  }, [book?.year]);

  const ctx: AppCtx | null = useMemo(() => {
    if (!settings || !book || !books || !entries) return null;
    return {
      book, books, settings, today, focus, setFocus, entries, account,
      readOnly: !!book.readOnly,
      openEntry: (init) => setEditing(init),
      go: (tab, sub = null) => { location.hash = sub ? `/${tab}/${sub}` : `/${tab}`; },
      signOut: async () => {
        stopSync();
        await supabase?.auth.signOut();
      }
    };
  }, [settings, book, books, entries, today, focus, account]);

  if (boot === 'offline') {
    return (
      <div className="app">
        <main className="screen" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <span className="hand" style={{ fontSize: 26 }}>需要网络 · Needs internet once</span>
          <p className="muted" style={{ margin: 0, maxWidth: 300, lineHeight: 1.5 }}>The first time you sign in on a device, your planner is downloaded. After that it works offline.</p>
          <button className="primary" style={{ maxWidth: 240 }} onClick={() => { setBoot('loading'); setAttempt((a) => a + 1); }}>再试 Try again</button>
        </main>
      </div>
    );
  }
  if (boot !== 'ready' || !ctx) return <div className="app"><Splash /></div>;

  const { tab, sub } = route;
  let screen: JSX.Element;
  if (tab === 'more' && sub === 'appearance') screen = <AppearanceScreen />;
  else if (tab === 'more' && sub === 'yearbooks') screen = <YearbooksScreen />;
  else if (tab === 'more' && sub === 'semester') screen = <SemesterScreen />;
  else if (tab === 'month') screen = <MonthScreen />;
  else if (tab === 'week') screen = <WeekScreen />;
  else if (tab === 'goals') screen = <GoalsScreen />;
  else if (tab === 'more') screen = <MoreScreen />;
  else screen = <TodayScreen />;

  const showFab = !ctx.readOnly && (tab === 'today' || tab === 'month' || tab === 'week') && !sub;

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        {screen}
        {showFab && (
          <button className="fab" aria-label="Add entry" onClick={() => setEditing({ date: tab === 'today' ? today : focus })}>
            <Icon name="plus" size={24} strokeWidth={2.2} />
          </button>
        )}
        <TabBar active={tab} onChange={(t) => ctx.go(t)} />
        {editing && <EntrySheet init={editing} onClose={() => setEditing(null)} />}
      </div>
    </Ctx.Provider>
  );
}
