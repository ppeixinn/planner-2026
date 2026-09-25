import { useApp } from '../AppContext';

export function GoalsScreen() {
  const { book } = useApp();
  return (
    <main className="screen">
      <header className="topbar">
        <h1 className="pill">GOALS <span>{book.year}</span></h1>
      </header>
      <section className="card">
        <div className="card-head"><h2>我想成为一个怎样的人？</h2></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="hand" style={{ margin: 0, fontSize: 24 }}>目标页面在下一阶段加入</p>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Goals, quarter plans and KPIs arrive in phase 3. For now your habits tick on the Today page.
          </p>
        </div>
      </section>
    </main>
  );
}
