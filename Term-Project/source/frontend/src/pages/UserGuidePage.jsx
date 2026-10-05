import { useLanguage } from '../contexts/LanguageContext.jsx';

const guideSteps = Array.from({ length: 12 }, (_, index) => `guide.step${index + 1}`);
function UserGuidePage() {
  const { t } = useLanguage();
  return (
    <section className="page-section user-guide" data-testid="page-user-guide">
      <header className="page-heading"><div><p className="eyebrow dark">RMUTL SHUTTLE</p><h1>{t('guide.title')}</h1><p>{t('guide.intro')}</p></div></header>
      <ol className="guide-list">{guideSteps.map((key, index) => <li key={key}><span className="guide-step-number" aria-hidden="true">{index + 1}</span><p>{t(key)}</p></li>)}</ol>
    </section>
  );
}
export default UserGuidePage;
