import { useLanguage } from '../contexts/LanguageContext.jsx';

function EmptyState({ title, message, action }) {
  const { t } = useLanguage();
  return (
    <section className="state-card empty-state" data-testid="empty-state">
      <span className="empty-icon" aria-hidden="true">↗</span>
      <h2>{title ?? t('state.emptyTitle')}</h2>
      <p>{message ?? t('state.emptyText')}</p>
      {action}
    </section>
  );
}

export default EmptyState;
