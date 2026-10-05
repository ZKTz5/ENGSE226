import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmCancellationDialog from '../components/ConfirmCancellationDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import VehicleRequestCard from '../components/VehicleRequestCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey } from '../i18n/translations.js';
import { cancelVehicleRequest, getMyVehicleRequests } from '../services/vehicleRequestService.js';

function MyRequestsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const headingRef = useRef(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [noticeKey, setNoticeKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelingId, setCancelingId] = useState(null);
  const [pending, setPending] = useState(null);

  const load = useCallback(() => {
    let ignore = false;
    setState('loading');
    getMyVehicleRequests().then((rows) => { if (!ignore) { setItems(rows); setState('success'); } })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, []);
  useEffect(() => load(), [load, reloadKey]);

  async function confirmCancel() {
    setCancelingId(pending.id);
    setErrorKey('');
    try {
      const updated = await cancelVehicleRequest(pending.id);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPending(null);
      setNoticeKey('request.cancelledSuccess');
    } catch (error) {
      setErrorKey(apiErrorKey(error));
      setPending(null);
    } finally {
      setCancelingId(null);
    }
  }

  if (!session) return <section className="page-section"><EmptyState title={t('request.signInTitle')} message={t('request.signInText')} action={<Link className="button primary inline" to="/login">{t('nav.login')}</Link>} /></section>;
  return (
    <section className="page-section" data-testid="page-my-requests">
      <header className="page-heading"><div><p className="eyebrow dark">{t('request.eyebrow')}</p><h1 ref={headingRef} tabIndex={-1}>{t('request.myTitle')}</h1><p>{t('request.myIntro')}</p></div><Link className="button primary inline" to="/requests/new">{t('common.newRequest')}</Link></header>
      {noticeKey && <p role="status" className="notice">{t(noticeKey)}</p>}
      {state === 'loading' && <LoadingState message={t('common.loadingRequests')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((value) => value + 1)} />}
      {state === 'success' && items.length === 0 && <EmptyState title={t('request.emptyTitle')} message={t('request.emptyText')} action={<Link className="button primary inline" to="/requests/new">{t('common.newRequest')}</Link>} />}
      {state === 'success' && items.length > 0 && <div className="request-list">{items.map((item) => <VehicleRequestCard key={item.id} request={item} onCancel={setPending} />)}</div>}
      {errorKey && state === 'success' && <p role="alert" className="form-error">{t(errorKey)}</p>}
      {pending && <ConfirmCancellationDialog open pending={cancelingId === pending.id}
        title={t('request.cancelTitle')} message={t('request.cancelPrompt')}
        keepLabel={t('request.keep')} confirmLabel={t('request.cancelConfirm')}
        pendingLabel={t('request.cancelling')} restoreFocusTarget={headingRef.current}
        onKeep={() => setPending(null)} onConfirm={confirmCancel} />}
    </section>
  );
}
export default MyRequestsPage;
