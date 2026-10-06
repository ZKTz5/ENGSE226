import { useLanguage } from '../contexts/LanguageContext.jsx';

function LoadingState({ message }) {
  const { t } = useLanguage();
  return <div className="state-card" data-testid="loading-state" role="status"><span className="spinner" aria-hidden="true" />{message ?? t('common.loading')}</div>;
}

export default LoadingState;
