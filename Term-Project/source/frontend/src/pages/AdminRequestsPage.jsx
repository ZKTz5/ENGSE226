import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { approveVehicleRequest, completeVehicleRequest, createAdminVehicle, getAdminVehicleRequests, getAdminVehicles, rejectVehicleRequest, setAdminVehicleActive } from '../services/vehicleRequestService.js';

function AdminRequestsPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selection, setSelection] = useState({});
  const [reasons, setReasons] = useState({});
  const [vehicleDraft, setVehicleDraft] = useState({ code: '', capacity: '8' });
  const [state, setState] = useState('loading');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [savingId, setSavingId] = useState(null);
  const [errorKey, setErrorKey] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    let ignore = false;
    setState('loading');
    Promise.all([getAdminVehicleRequests(statusFilter), getAdminVehicles()])
      .then(([rows, fleet]) => { if (!ignore) { setRequests(rows); setVehicles(fleet); setState('success'); } })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, [statusFilter]);
  useEffect(() => load(), [load, reloadKey]);

  async function refresh() {
    setReloadKey((value) => value + 1);
  }
  async function addVehicle(event) {
    event.preventDefault(); setErrorKey(''); setNotice('');
    try {
      await createAdminVehicle({ code: vehicleDraft.code, capacity: Number(vehicleDraft.capacity) });
      setVehicleDraft({ code: '', capacity: '8' });
      setNotice(t('admin.vehicleCreated'));
      await refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
  }
  async function approve(item) {
    setSavingId(item.id); setErrorKey('');
    try {
      await approveVehicleRequest(item.id, selection[item.id] ? Number(selection[item.id]) : null);
      setNotice(t('admin.approved')); await refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
    finally { setSavingId(null); }
  }
  async function reject(item) {
    setSavingId(item.id); setErrorKey('');
    try {
      await rejectVehicleRequest(item.id, reasons[item.id] ?? '');
      setNotice(t('admin.rejected')); await refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
    finally { setSavingId(null); }
  }
  async function complete(item) {
    setSavingId(item.id); setErrorKey('');
    try {
      await completeVehicleRequest(item.id);
      setNotice(t('admin.completed')); await refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
    finally { setSavingId(null); }
  }
  async function toggleVehicle(vehicle) {
    setErrorKey('');
    try { await setAdminVehicleActive(vehicle.id, !vehicle.active); await refresh(); }
    catch (error) { setErrorKey(apiErrorKey(error)); }
  }

  if (!session || session.user.role !== 'admin') return <section className="page-section"><EmptyState title={t('admin.forbiddenTitle')} message={t('admin.forbiddenText')} /></section>;
  return (
    <section className="page-section" data-testid="page-admin-requests">
      <header className="page-heading"><div><p className="eyebrow dark">{t('admin.eyebrow')}</p><h1>{t('admin.title')}</h1><p>{t('admin.intro')}</p></div></header>
      {notice && <p className="notice" role="status">{notice}</p>}{errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
      <section className="panel admin-vehicle-panel"><h2>{t('admin.vehiclesTitle')}</h2><p>{t('admin.homeBaseNotice')}</p>
        <form className="search-fields" onSubmit={addVehicle}>
          <label className="field"><span>{t('admin.vehicleCode')}</span><input value={vehicleDraft.code} onChange={(event) => setVehicleDraft((row) => ({ ...row, code: event.target.value }))} required maxLength="50" /></label>
          <label className="field"><span>{t('admin.vehicleCapacity')}</span><input type="number" min="1" step="1" value={vehicleDraft.capacity} onChange={(event) => setVehicleDraft((row) => ({ ...row, capacity: event.target.value }))} required /></label>
          <button className="button primary" type="submit">{t('admin.addVehicle')}</button>
        </form>
        {vehicles.length > 0 && <ul className="admin-vehicle-list">{vehicles.map((vehicle) => <li key={vehicle.id}>{vehicle.code} · {vehicle.capacity} · {t(vehicle.active ? 'admin.active' : 'admin.inactive')} <button type="button" className="text-button" onClick={() => toggleVehicle(vehicle)}>{t(vehicle.active ? 'admin.deactivate' : 'admin.activate')}</button></li>)}</ul>}
      </section>
      <section className="request-section"><div className="section-heading"><div><p className="eyebrow dark">{t(statusFilter === 'PENDING' ? 'admin.pendingLabel' : 'request.status.APPROVED')}</p><h2>{t(statusFilter === 'PENDING' ? 'admin.queueTitle' : 'admin.approvedQueueTitle')}</h2></div>
        <label className="field admin-status-filter"><span>{t('admin.filterLabel')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="PENDING">{t('request.status.PENDING')}</option><option value="APPROVED">{t('request.status.APPROVED')}</option></select></label>
      </div>
        {state === 'loading' && <LoadingState message={t('common.loadingRequests')} />}
        {state === 'error' && <ErrorState message={t(errorKey)} onRetry={refresh} />}
        {state === 'success' && requests.length === 0 && <EmptyState title={t('admin.emptyTitle')} message={t('admin.emptyText')} />}
        {state === 'success' && requests.map((item) => <article className="admin-request-card panel" key={item.id}>
          <div><p className="eyebrow dark">{t('request.reference')} #{item.id} · {item.requesterName}</p>
            <h3>{displayCampusName(item.origin, language)} → {displayCampusName(item.destination, language)}</h3>
            <p>{formatDeparture(item.departureAt, language)} · {t(`request.trip.${item.tripType}`)} · {item.passengerCount}</p>
            {item.returnAt && <p>{t('request.returnAt')}: {formatDeparture(item.returnAt, language)}</p>}
            <p>{item.purpose}</p>{item.note && <p>{item.note}</p>}
          </div>
          {item.status === 'APPROVED' ? <button className="button primary" type="button" disabled={savingId === item.id} onClick={() => complete(item)}>{t('admin.complete')}</button> : <>
            <label className="field"><span>{t('admin.assignVehicle')}</span><select value={selection[item.id] ?? ''} onChange={(event) => setSelection((all) => ({ ...all, [item.id]: event.target.value }))}>
              <option value="">{t('admin.approveUnassigned')}</option>{vehicles.filter((vehicle) => vehicle.active).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.capacity}</option>)}
            </select></label>
            <label className="field"><span>{t('admin.rejectionReason')}</span><textarea rows="2" value={reasons[item.id] ?? ''} onChange={(event) => setReasons((all) => ({ ...all, [item.id]: event.target.value }))} /></label>
            <div className="ticket-actions"><button className="button primary" type="button" disabled={savingId === item.id} onClick={() => approve(item)}>{t('admin.approve')}</button><button className="button cancel-button" type="button" disabled={savingId === item.id} onClick={() => reject(item)}>{t('admin.reject')}</button></div>
          </>}
        </article>)}
      </section>
    </section>
  );
}
export default AdminRequestsPage;
