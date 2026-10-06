import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { displayCampusName, formatDeparture } from '../i18n/translations.js';

function VehicleRequestCard({ request, onCancel }) {
  const { language, t } = useLanguage();
  return (
    <article className="request-card" data-testid="vehicle-request-card">
      <div className="request-card-main">
        <p className="eyebrow dark">{t('request.reference')} #{request.id}</p>
        <h2>{displayCampusName(request.origin, language)} <span aria-hidden="true">→</span> {displayCampusName(request.destination, language)}</h2>
        <p>{formatDeparture(request.departureAt, language)} · {t(`request.trip.${request.tripType}`)}</p>
        <p>{request.passengerCount} · {request.purpose}</p>
        {request.assignedVehicleCode && <p>{t('request.assignedVehicle')}: {request.assignedVehicleCode}</p>}
        {request.rejectionReason && <p className="rejection-reason">{t('request.rejectionReason')}: {request.rejectionReason}</p>}
      </div>
      <span className={`request-status ${request.status}`}>{t(`request.status.${request.status}`)}</span>
      <div className="request-card-actions">
        <Link className="button secondary" to={`/requests/${request.id}`}>{t('request.viewDetail')}</Link>
        {request.status === 'PENDING' && onCancel && <button className="button cancel-button" type="button" onClick={() => onCancel(request)}>{t('request.cancel')}</button>}
      </div>
    </article>
  );
}

export default VehicleRequestCard;
