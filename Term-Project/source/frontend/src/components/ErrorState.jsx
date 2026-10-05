import { useLanguage } from '../contexts/LanguageContext.jsx';

function ErrorState({ message, onRetry }) {
  const { t } = useLanguage();
  return (
    <section className="state-card error-state" data-testid="error-state" role="alert">
      <h2>{t('state.loadErrorTitle')}</h2>
      <p>{message || t('state.networkError')}</p>
      <button className="button primary" data-testid="retry-button" type="button" onClick={onRetry}>{t('common.retry')}</button>
    </section>
  );
}

export default ErrorState;
