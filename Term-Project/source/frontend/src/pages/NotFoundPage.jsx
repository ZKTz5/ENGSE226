import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <section className="state-card" data-testid="page-not-found">
      <p className="eyebrow dark">404</p><h1>{t('notFound.title')}</h1><p>{t('notFound.text')}</p><Link className="button primary inline" to="/">{t('notFound.home')}</Link>
    </section>
  );
}

export default NotFoundPage;
