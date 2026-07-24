import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function authenticate(mode) {
    setMessage('');

    if (!email || !password) {
      setMessage('メールアドレスとパスワードを入力してね。');
      return;
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setMessage(
      result.error
        ? result.error.message
        : mode === 'signup'
          ? '登録しました。確認メールが届いた場合は認証してください。'
          : 'ログインしました。'
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">🦔</div>
        <h1>Harimaro Memories</h1>
        <p>はりまろとの思い出を、大切に残そう。</p>

        <label>メールアドレス</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

        <label>パスワード</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

        <div className="button-row">
          <button onClick={() => authenticate('login')}>ログイン</button>
          <button className="secondary-button" onClick={() => authenticate('signup')}>
            新規登録
          </button>
        </div>

        <p className="message">{message}</p>
      </section>
    </main>
  );
}
