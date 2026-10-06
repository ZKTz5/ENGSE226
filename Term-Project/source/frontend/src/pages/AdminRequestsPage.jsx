import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminDataResetDialog from '../components/AdminDataResetDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { createAdminVehicle, getAdminResetAvailability, getAdminVehicleRequests, getAdminVehicles, resetAdminRequestData, setAdminVehicleActive } from '../services/vehicleRequestService.js';

function AdminRequestsPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [canResetData, setCanResetData] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({ code: '', capacity: '8' });
  const [state, setState] = useState('loading');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorKey, setErrorKey] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const resetButtonRef = useRef(null);

  const load = useCallback(() => {
    let ignore = false;
    setState('loading');
    Promise.all([getAdminVehicleRequests(statusFilter || undefined), getAdminVehicles(), getAdminResetAvailability()])
      .then(([rows, fleet, resetCapability]) => { if (!ignore) { setRequests(rows); setVehicles(fleet); setCanResetData(resetCapability.enabled === true); setState('success'); } })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, [statusFilter]);
  useEffect(() => load(), [load, reloadKey]);

  function refresh() { setReloadKey((value) => value + 1); }

  async function addVehicle(event) {
    event.preventDefault(); setErrorKey(''); setNotice('');
    try {
      await createAdminVehicle({ code: vehicleDraft.code, capacity: Number(vehicleDraft.capacity) });
      setVehicleDraft({ code: '', capacity: '8' });
      setNotice(t('admin.vehicleCreated'));
      refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
  }

  async function toggleVehicle(vehicle) {
    setErrorKey('');
    try { await setAdminVehicleActive(vehicle.id, !vehicle.active); refresh(); }
    catch (error) { setErrorKey(apiErrorKey(error)); }
  }

  async function resetData(confirmation) {
    setResetting(true); setErrorKey(''); setNotice('');
    try {
      const result = await resetAdminRequestData(confirmation);
      setResetOpen(false);
      setNotice(t('admin.resetSuccess', { count: result.deletedRequestCount }));
      refresh();
    } catch (error) { setErrorKey(apiErrorKey(error)); }
    finally { setResetting(false); }
  }

  if (!session || session.user.role !== 'admin') return <section className="page-section"><EmptyState title={t('admin.forbiddenTitle')} message={t('admin.forbiddenText')} /></section>;
  return (
    <section className="page-section" data-testid="page-admin-requests">
      <header className="page-heading"><div><p className="eyebrow dark">{t('admin.eyebrow')}</p><h1>{t('admin.title')}</h1><p>{t('admin.intro')}</p></div></header>
      {notice && <p role="status" className="notice">{notice}</p>}
      {errorKey && <p role="alert" className="form-error">{t(errorKey)}</p>}

      {state === 'success' && canResetData && <section className="admin-reset-panel panel" aria-labelledby="admin-reset-heading">
        <div><h2 id="admin-reset-heading">{t('admin.resetTitle')}</h2><p>{t('admin.resetPreserve')}</p></div>
        <button ref={resetButtonRef} className="button cancel-button" type="button" onClick={() => setResetOpen(true)}>{t('admin.resetButton')}</button>
      </section>}

      <section className="panel admin-vehicle-panel"><h2>{t('admin.vehiclesTitle')}</h2><p>{t('admin.homeBaseNotice')}</p>
        <form className="search-fields" onSubmit={addVehicle}>
          <label className="field"><span>{t('admin.vehicleCode')}</span><input value={vehicleDraft.code} onChange={(event) => setVehicleDraft((row) => ({ ...row, code: event.target.value }))} required maxLength="50" /></label>
          <label className="field"><span>{t('admin.vehicleCapacity')}</span><input type="number" min="1" step="1" value={vehicleDraft.capacity} onChange={(event) => setVehicleDraft((row) => ({ ...row, capacity: event.target.value }))} required /></label>
          <button className="button primary" type="submit">{t('admin.addVehicle')}</button>
        </form>
        {vehicles.length > 0 && <ul className="admin-vehicle-list">{vehicles.map((vehicle) => <li key={vehicle.id}>{vehicle.code} · {vehicle.capacity} · {t(vehicle.active ? 'admin.active' : 'admin.inactive')} <button type="button" className="text-button" onClick={() => toggleVehicle(vehicle)}>{t(vehicle.active ? 'admin.deactivate' : 'admin.activate')}</button></li>)}</ul>}
      </section>

      <section className="request-section">
        <div className="section-heading"><div><p className="eyebrow dark">{t('admin.pendingLabel')}</p><h2>{t('admin.queueTitle')}</h2></div>
          <label className="field admin-status-filter"><span>{t('admin.filterLabel')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="PENDING">{t('request.status.PENDING')}</option><option value="APPROVED">{t('request.status.APPROVED')}</option><option value="">{t('admin.allRequests')}</option>
          </select></label>
        </div>
        {state === 'loading' && <LoadingState message={t('common.loadingRequests')} />}
        {state === 'error' && <ErrorState message={t(errorKey)} onRetry={refresh} />}
        {state === 'success' && requests.length === 0 && <EmptyState title={t('admin.emptyTitle')} message={t('admin.emptyText')} />}
        {state === 'success' && requests.map((item) => <Link className="admin-summary-card panel" key={item.id} to={`/admin/requests/${item.id}`}>
          <div className="admin-summary-heading"><p className="eyebrow dark">{t('request.reference')} #{item.id}</p><span className={`request-status ${item.status}`}>{t(`request.status.${item.status}`)}</span></div>
          <h3>{item.requester?.name}</h3>
          <p className="admin-summary-route">{displayCampusName(item.origin, language)} → {displayCampusName(item.destination, language)}</p>
          <p>{formatDeparture(item.departureAt, language)} · {t(`request.trip.${item.tripType}`)} · {item.passengerCount}</p>
          <p className="admin-purpose" title={item.purpose}>{item.purpose}</p>
          <span className="admin-summary-detail">{t('admin.viewDetails')} →</span>
        </Link>)}
      </section>
      {resetOpen && <AdminDataResetDialog pending={resetting} restoreFocusTarget={resetButtonRef.current}
        onClose={() => setResetOpen(false)} onConfirm={resetData} />}
    </section>
  );
}
export default AdminRequestsPage;
