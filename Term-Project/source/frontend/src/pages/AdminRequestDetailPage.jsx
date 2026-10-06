import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { approveVehicleRequest, completeVehicleRequest, getAdminVehicleRequest, getAdminVehicles, rejectVehicleRequest } from '../services/vehicleRequestService.js';

function AdminRequestDetailPage() {
  const { requestId } = useParams();
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [item, setItem] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selection, setSelection] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    let ignore = false;
    setState('loading');
    Promise.all([getAdminVehicleRequest(requestId), getAdminVehicles()])
      .then(([requestData, fleet]) => {
        if (ignore) return;
        setItem(requestData);
        setVehicles(fleet);
        setState('success');
      })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, [requestId]);
  useEffect(() => load(), [load, reloadKey]);

  async function perform(action, successMessage) {
    setPending(true); setErrorKey(''); setNotice('');
    try {
      await action();
      const updated = await getAdminVehicleRequest(requestId);
      setItem(updated);
      setNotice(t(successMessage));
    } catch (error) { setErrorKey(apiErrorKey(error)); }
    finally { setPending(false); }
  }

  if (!session || session.user.role !== 'admin') return <section className="page-section"><EmptyState title={t('admin.forbiddenTitle')} message={t('admin.forbiddenText')} /></section>;
  return (
    <section className="page-section" data-testid="page-admin-request-detail">
      <Link className="back-link" to="/admin/requests">← {t('admin.backToRequests')}</Link>
      {state === 'loading' && <LoadingState message={t('common.loadingRequestDetails')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((value) => value + 1)} />}
      {state === 'success' && item && <article className="request-detail panel">
        <p className="eyebrow dark">{t('request.reference')} #{item.id}</p>
        <h1>{item.requester?.name}</h1>
        <p className="admin-requester-email">{item.requester?.email}</p>
        <h2>{displayCampusName(item.origin, language)} → {displayCampusName(item.destination, language)}</h2>
        <p className={`request-status ${item.status}`}>{t(`request.status.${item.status}`)}</p>
        {notice && <p role="status" className="notice">{notice}</p>}
        {errorKey && <p role="alert" className="form-error">{t(errorKey)}</p>}
        <dl className="request-facts">
          <div><dt>{t('request.reference')}</dt><dd>#{item.id}</dd></div>
          <div><dt>{t('admin.requester')}</dt><dd>{item.requester?.name} · {item.requester?.email}</dd></div>
          <div><dt>{t('request.origin')} → {t('request.destination')}</dt><dd>{displayCampusName(item.origin, language)} → {displayCampusName(item.destination, language)}</dd></div>
          <div><dt>{t('request.tripType')}</dt><dd>{t(`request.trip.${item.tripType}`)}</dd></div>
          <div><dt>{t('request.departure')}</dt><dd>{formatDeparture(item.departureAt, language)}</dd></div>
          {item.returnAt && <div><dt>{t('request.returnAt')}</dt><dd>{formatDeparture(item.returnAt, language)}</dd></div>}
          <div><dt>{t('request.passengerCount')}</dt><dd>{item.passengerCount}</dd></div>
          <div><dt>{t('admin.purpose')}</dt><dd>{item.purpose}</dd></div>
          {item.note && <div><dt>{t('request.note')}</dt><dd>{item.note}</dd></div>}
          <div><dt>{t('request.statusLabel')}</dt><dd>{t(`request.status.${item.status}`)}</dd></div>
          {item.assignedVehicleCode && <div><dt>{t('request.assignedVehicle')}</dt><dd>{item.assignedVehicleCode}</dd></div>}
          {item.rejectionReason && <div><dt>{t('request.rejectionReason')}</dt><dd>{item.rejectionReason}</dd></div>}
          {item.createdAt && <div><dt>{t('admin.createdAt')}</dt><dd>{formatDeparture(item.createdAt, language)}</dd></div>}
          {item.updatedAt && <div><dt>{t('admin.updatedAt')}</dt><dd>{formatDeparture(item.updatedAt, language)}</dd></div>}
        </dl>
        {item.status === 'PENDING' && <div className="admin-detail-actions">
          <label className="field"><span>{t('admin.assignVehicle')}</span><select value={selection} onChange={(event) => setSelection(event.target.value)}>
            <option value="">{t('admin.approveUnassigned')}</option>{vehicles.filter((vehicle) => vehicle.active).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.capacity}</option>)}
          </select></label>
          <button className="button primary" type="button" disabled={pending} onClick={() => perform(() => approveVehicleRequest(item.id, selection ? Number(selection) : null), 'admin.approved')}>{t(pending ? 'admin.processing' : 'admin.approve')}</button>
          <label className="field"><span>{t('admin.rejectionReason')}</span><textarea rows="3" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label>
          <button className="button cancel-button" type="button" disabled={pending || !rejectionReason.trim()} onClick={() => perform(() => rejectVehicleRequest(item.id, rejectionReason), 'admin.rejected')}>{t(pending ? 'admin.processing' : 'admin.reject')}</button>
        </div>}
        {item.status === 'APPROVED' && <button className="button primary" type="button" disabled={pending} onClick={() => perform(() => completeVehicleRequest(item.id), 'admin.completed')}>{t(pending ? 'admin.processing' : 'admin.complete')}</button>}
      </article>}
      {state === 'success' && !item && <EmptyState title={t('request.notFoundTitle')} message={t('request.notFoundText')} />}
    </section>
  );
}
export default AdminRequestDetailPage;
