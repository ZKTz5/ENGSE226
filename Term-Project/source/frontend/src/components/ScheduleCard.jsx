import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { displayCampusName, formatDeparture } from '../i18n/translations.js';

export { formatDeparture };

function ScheduleCard({ schedule }) {
  const { language, t } = useLanguage();
  return (
    <article className="schedule-card">
      <div className="schedule-time-block">
        <span className="schedule-date-label">{t('common.departure')}</span>
        <strong>{formatDeparture(schedule.departure_time, language)}</strong>
      </div>
      <div className="schedule-route">
        <p className="eyebrow dark">{t('common.route')} {String(schedule.id).padStart(3, '0')}</p>
        <h3>{displayCampusName(schedule.originName, language)}<span aria-hidden="true"> → </span>{displayCampusName(schedule.destinationName, language)}</h3>
        <p>{t('schedule.confirmedCount', { count: schedule.confirmedCount })} · {t('schedule.seatsAvailable', { count: schedule.availableSeats })}</p>
      </div>
      <div className="schedule-card-action">
        <span className={`badge shuttle-badge ${schedule.status}`}>{t(`status.${schedule.status}`)}</span>
        <Link className="button secondary" to={`/schedules/${schedule.id}`}>{t('common.viewDetails')}</Link>
      </div>
    </article>
  );
}

export default ScheduleCard;
