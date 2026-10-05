import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmCancellationDialog from '../components/ConfirmCancellationDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { cancelVehicleRequest, getVehicleRequest } from '../services/vehicleRequestService.js';

function RequestDetailPage() {
  const { requestId } = useParams();
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const headingRef = useRef(null);
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    let ignore = false;
    setState('loading');
    getVehicleRequest(requestId).then((data) => { if (!ignore) { setItem(data); setState('success'); } })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, [requestId]);
  useEffect(() => load(), [load, reloadKey]);

  async function cancel() {
    setSaving(true);
    try {
      const updated = await cancelVehicleRequest(item.id);
      setItem(updated);
      setNotice(t('request.cancelledSuccess'));
      setPendingCancel(false);
    } catch (error) {
      setErrorKey(apiErrorKey(error));
      setPendingCancel(false);
    } finally { setSaving(false); }
  }

  if (!session) return <section className="page-section"><EmptyState title={t('request.signInTitle')} message={t('request.signInText')} action={<Link className="button primary inline" to="/login">{t('nav.login')}</Link>} /></section>;
  return (
    <section className="page-section" data-testid="page-request-detail">
      <Link className="back-link" to="/requests">← {t('common.myRequests')}</Link>
      {state === 'loading' && <LoadingState message={t('common.loadingRequestDetails')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((value) => value + 1)} />}
      {state === 'success' && !item && <EmptyState title={t('request.notFoundTitle')} message={t('request.notFoundText')} />}
      {state === 'success' && item && <article className="request-detail panel">
        <p className="eyebrow dark">{t('request.reference')} #{item.id}</p>
        <h1 ref={headingRef} tabIndex={-1}>{displayCampusName(item.origin, language)} → {displayCampusName(item.destination, language)}</h1>
        <p className={`request-status ${item.status}`}>{t(`request.status.${item.status}`)}</p>
        {notice && <p className="notice" role="status">{notice}</p>}
        <dl className="request-facts">
          <div><dt>{t('request.tripType')}</dt><dd>{t(`request.trip.${item.tripType}`)}</dd></div>
          <div><dt>{t('request.departure')}</dt><dd>{formatDeparture(item.departureAt, language)}</dd></div>
          {item.returnAt && <div><dt>{t('request.returnAt')}</dt><dd>{formatDeparture(item.returnAt, language)}</dd></div>}
          <div><dt>{t('request.passengerCount')}</dt><dd>{item.passengerCount}</dd></div>
          <div><dt>{t('request.purpose')}</dt><dd>{item.purpose}</dd></div>
          {item.note && <div><dt>{t('request.note')}</dt><dd>{item.note}</dd></div>}
          {item.assignedVehicleCode && <div><dt>{t('request.assignedVehicle')}</dt><dd>{item.assignedVehicleCode}</dd></div>}
          {item.rejectionReason && <div><dt>{t('request.rejectionReason')}</dt><dd>{item.rejectionReason}</dd></div>}
        </dl>
        {item.status === 'PENDING' && <button className="button cancel-button" type="button" onClick={() => setPendingCancel(true)}>{t('request.cancel')}</button>}
      </article>}
      {pendingCancel && item && <ConfirmCancellationDialog open pending={saving}
        title={t('request.cancelTitle')} message={t('request.cancelPrompt')}
        keepLabel={t('request.keep')} confirmLabel={t('request.cancelConfirm')}
        pendingLabel={t('request.cancelling')} restoreFocusTarget={headingRef.current}
        onKeep={() => setPendingCancel(false)} onConfirm={cancel} />}
    </section>
  );
}
export default RequestDetailPage;
