import { useState } from 'react';
import { appUrl, supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'forgot' | 'newPassword';

export function AuthScreen({ recovery = false, onDone }: { recovery?: boolean; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newPassword' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchTo = (m: Mode) => { setMode(m); setError(''); setNotice(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim() }, emailRedirectTo: appUrl() }
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('请查收邮件 · Check your email and tap the link to confirm, then sign in here.');
          setMode('signin');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        if (error) throw error;
        setNotice('已发送 · If that email has an account, a reset link is on its way.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setNotice('密码已更新 · Password updated.');
        onDone?.();
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const title = { signin: '登录 Sign in', signup: '注册 Create account', forgot: '忘记密码 Reset password', newPassword: '新密码 New password' }[mode];

  return (
    <main className="screen" style={{ paddingBottom: 40, minHeight: '100dvh', justifyContent: 'center' }}>
      <div className="auth-cover">
        <span className="auth-year">{new Date().getFullYear()}</span>
        <span className="auth-sub">PLANNER · 手帐</span>
      </div>

      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-head"><h2 style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</h2></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="auth-name">名字 Name</label>
              <input id="auth-name" className="input" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          {mode !== 'newPassword' && (
            <div className="field">
              <label htmlFor="auth-email">邮箱 Email</label>
              <input id="auth-email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="auth-password">密码 Password</label>
              <input id="auth-password" className="input" type="password" required minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode !== 'signin' && <span className="muted" style={{ fontSize: 12 }}>At least 6 characters</span>}
            </div>
          )}

          {error && <p role="alert" className="auth-msg bg-important c-important">{error}</p>}
          {notice && <p role="status" className="auth-msg" style={{ background: 'var(--tint)' }}>{notice}</p>}

          <button className="primary" type="submit" disabled={busy}>
            {busy ? '…' : { signin: '登录 Sign in', signup: '注册 Sign up', forgot: '发送链接 Send link', newPassword: '保存 Save' }[mode]}
          </button>

          {mode === 'signin' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button type="button" className="text-btn strong" onClick={() => switchTo('signup')}>没有账号？Create account</button>
              <button type="button" className="text-btn" onClick={() => switchTo('forgot')}>忘记密码 Forgot?</button>
            </div>
          )}
          {(mode === 'signup' || mode === 'forgot') && (
            <button type="button" className="text-btn" onClick={() => switchTo('signin')}>已有账号 · Back to sign in</button>
          )}
        </div>
      </form>

      <p className="muted" style={{ margin: 0, fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
        Your planner is saved on this device and synced to your account,<br />so it's the same on your phone, iPad and laptop.
      </p>
    </main>
  );
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return '邮箱或密码不对 · Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return '请先确认邮箱 · Please confirm your email first (check your inbox).';
  if (/already registered/i.test(msg)) return '这个邮箱已注册 · That email already has an account. Sign in instead.';
  if (/failed to fetch|network/i.test(msg)) return '没有网络 · No connection. Try again when you are online.';
  return msg;
}
