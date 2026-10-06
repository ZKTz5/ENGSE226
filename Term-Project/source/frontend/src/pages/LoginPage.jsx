import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  if (session) {
    return (
      <section className="login-layout">
        <div className="login-card">
          <p className="eyebrow dark">SIGNED IN</p>
          <h1>Welcome back, {session.user.name}</h1>
          <p>Your RMUTL account is ready to use.</p>
          <Link className="button primary inline" to="/">Go to dashboard</Link>
        </div>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your institutional email and password.');
      return;
    }
    if (!email.trim().toLowerCase().endsWith('@rmutl.ac.th')) {
      setError('Use your institutional email ending in @rmutl.ac.th.');
      return;
    }
    setState('loading');
    try {
      await signIn({ email: email.trim(), password });
      setState('success');
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to sign in. Please try again.');
      setState('idle');
    }
  }

  return (
    <section className="login-layout" data-testid="page-login">
      <div className="login-aside">
        <p className="eyebrow">RMUTL SHUTTLE</p>
        <h1>One university.<br />Three connected campuses.</h1>
        <p>Sign in with your institutional account to access your RMUTL shuttle account.</p>
        <span className="login-route-graphic" aria-hidden="true">DS <i /> JY <i /> CM</span>
      </div>
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow dark">YOUR ACCOUNT</p>
        <h2>Sign in</h2>
        <p className="muted-copy">Use your @rmutl.ac.th email address.</p>
        <div className="field">
          <label htmlFor="login-email">Institutional email</label>
          <input id="login-email" autoComplete="username" type="email" value={email}
            onChange={(event) => setEmail(event.target.value)} placeholder="name@rmutl.ac.th" required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" autoComplete="current-password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {state === 'success' && <p className="form-success" role="status">Signed in successfully.</p>}
        <button className="button primary login-submit" type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-footnote">Shuttle schedules can be explored without signing in. <Link to="/schedules">Browse routes</Link></p>
      </form>
    </section>
  );
}

export default LoginPage;
