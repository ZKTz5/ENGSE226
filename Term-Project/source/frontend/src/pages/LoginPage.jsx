import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey } from '../i18n/translations.js';
import { isInstitutionalEmail } from '../utils/institutionalEmail.js';

function LoginPage() {
  const { session, signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState('idle');
  const [errorKey, setErrorKey] = useState('');

  if (session) {
    return (
      <section className="login-layout">
        <div className="login-card">
          <p className="eyebrow dark">{t('login.signedIn')}</p>
          <h1>{t('login.welcome', { name: session.user.name })}</h1>
          <p>{t('login.ready')}</p>
          <Link className="button primary inline" to="/">{t('login.goHome')}</Link>
        </div>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorKey('');
    if (!email.trim() || !password) {
      setErrorKey('login.required');
      return;
    }
    if (!isInstitutionalEmail(email)) {
      setErrorKey('login.invalidDomain');
      return;
    }
    setState('loading');
    try {
      await signIn({ email: email.trim(), password });
      setState('success');
      navigate('/requests/new', { replace: true });
    } catch (reason) {
      setErrorKey(apiErrorKey(reason));
      setState('idle');
    }
  }

  return (
    <section className="login-layout" data-testid="page-login">
      <div className="login-aside">
        <p className="eyebrow">RMUTL SHUTTLE</p>
        <h1>{t('dashboard.headline')}</h1>
        <p>{t('dashboard.intro')}</p>
        <span className="login-route-graphic" aria-hidden="true">{t('campus.jedYod')} <i /> {t('campus.doiSaket')}</span>
      </div>
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow dark">{t('login.eyebrow')}</p>
        <h2>{t('login.title')}</h2>
        <p className="muted-copy">{t('login.emailHelp')}</p>
        <div className="field">
          <label htmlFor="login-email">{t('login.email')}</label>
          <input id="login-email" autoComplete="username" type="email" value={email}
            onInvalid={(event) => event.currentTarget.setCustomValidity(t('validation.required'))}
            onChange={(event) => { event.currentTarget.setCustomValidity(''); setEmail(event.target.value); }}
            placeholder={t('login.emailPlaceholder')} required />
        </div>
        <div className="field">
          <label htmlFor="login-password">{t('login.password')}</label>
          <input id="login-password" autoComplete="current-password" type="password" value={password}
            onInvalid={(event) => event.currentTarget.setCustomValidity(t('validation.required'))}
            onChange={(event) => { event.currentTarget.setCustomValidity(''); setPassword(event.target.value); }} required />
        </div>
        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
        {state === 'success' && <p className="form-success" role="status">{t('login.success')}</p>}
        <button className="button primary login-submit" type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
