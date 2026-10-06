import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { displayCampusName, formatDeparture } from '../i18n/translations.js';

function RequestSubmissionTicket({ request }) {
  const { language, t } = useLanguage();
  const panelRef = useRef(null);
  useEffect(() => { panelRef.current?.focus(); }, []);
  const statusKey = `request.status.${request.status}`;
  return (
    <section className="request-ticket" ref={panelRef} tabIndex={-1} aria-labelledby="request-success-title" role="status">
      <p className="eyebrow dark">{t('request.ticket.reference')} #{request.id}</p>
      <h2 id="request-success-title">{t('request.ticket.submitted')}</h2>
      <p>{t('request.ticket.received')}</p>
      <dl className="request-facts">
        <div><dt>{t('request.origin')}</dt><dd>{displayCampusName(request.origin, language)}</dd></div>
        <div><dt>{t('request.destination')}</dt><dd>{displayCampusName(request.destination, language)}</dd></div>
        <div><dt>{t('request.tripType')}</dt><dd>{t(`request.trip.${request.tripType}`)}</dd></div>
        <div><dt>{t('request.departure')}</dt><dd>{formatDeparture(request.departureAt, language)}</dd></div>
        {request.returnAt && <div><dt>{t('request.returnAt')}</dt><dd>{formatDeparture(request.returnAt, language)}</dd></div>}
        <div><dt>{t('request.passengerCount')}</dt><dd>{request.passengerCount}</dd></div>
        <div><dt>{t('request.statusLabel')}</dt><dd><span className={`request-status ${request.status}`}>{t(statusKey)}</span></dd></div>
      </dl>
      {request.status === 'APPROVED' && <p className="approval-stamp">{t('request.approvedStamp')}</p>}
      <div className="ticket-actions">
        <Link className="button primary inline" to="/requests">{t('common.myRequests')}</Link>
        <Link className="button secondary inline" to="/requests/new">{t('common.newRequest')}</Link>
      </div>
    </section>
  );
}

export default RequestSubmissionTicket;
