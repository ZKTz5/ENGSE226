import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { createBooking, getSchedule } from '../services/shuttleService.js';

function ScheduleDetailPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [schedule, setSchedule] = useState(null);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [bookingErrorKey, setBookingErrorKey] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    getSchedule(scheduleId).then((item) => {
      if (!ignore) { setSchedule(item); setState('success'); }
    }).catch((reason) => {
      if (!ignore) { setErrorKey(apiErrorKey(reason)); setState('error'); }
    });
    return () => { ignore = true; };
  }, [scheduleId, reloadKey]);

  async function handleBooking() {
    if (!session) {
      navigate('/login');
      return;
    }
    setBookingLoading(true);
    setBookingErrorKey('');
    setBookingResult(null);
    try {
      const created = await createBooking(schedule.id);
      setBookingResult(created);
      getSchedule(scheduleId).then(setSchedule).catch(() => {});
    } catch (reason) {
      setBookingErrorKey(apiErrorKey(reason));
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <section data-testid="page-schedule-detail">
      <Link className="back-link" to="/schedules">← {t('common.backSchedules')}</Link>
      {state === 'loading' && <LoadingState message={t('common.loadingDetails')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && schedule && (
        <article className="detail-hero">
          <p className="eyebrow dark">{t('common.schedule')} {String(schedule.id).padStart(3, '0')}</p>
          <h1>{displayCampusName(schedule.originName, language)}<span aria-hidden="true"> → </span>{displayCampusName(schedule.destinationName, language)}</h1>
          <p className="detail-departure">{formatDeparture(schedule.departure_time, language)}</p>
          <div className="detail-facts">
            <div><span>{t('common.departure')}</span><strong>{formatDeparture(schedule.departure_time, language)}</strong></div>
            <div><span>{t('common.capacity')}</span><strong>{schedule.capacity} {t('common.passengers')}</strong></div>
            <div><span>{t('common.confirmed')}</span><strong>{schedule.confirmedCount}</strong></div>
            <div><span>{t('common.availableSeats')}</span><strong>{schedule.availableSeats}</strong></div>
          </div>
          <p className={`detail-status ${schedule.status}`} role="status">{t(`status.${schedule.status}`)}</p>
          {schedule.status === 'expired' && <p className="muted-copy">{t('detail.expiredHelp')}</p>}
          {schedule.status === 'full' && <p className="muted-copy">{t('detail.fullHelp')}</p>}
          {bookingResult && (
            <div className={`booking-outcome ${bookingResult.status}`} role="status">
              {bookingResult.status === 'waitlisted'
                ? <>{t('ticket.waitlistStatus')} {t('ticket.waitlistHelp')}</>
                : t('ticket.confirmedStatus')}
              {' '}<Link to="/bookings">{t('common.openBookings')}</Link>
            </div>
          )}
          {bookingErrorKey && <p className="form-error" role="alert">{t(bookingErrorKey)}</p>}
          {schedule.status !== 'expired' && (
            session ? (
              <button className="button primary booking-action" type="button" onClick={handleBooking} disabled={bookingLoading}>
                {bookingLoading ? t('detail.submitting') : schedule.status === 'full' || schedule.status === 'waitlist' ? t('detail.joinWaitlist') : t('detail.book')}
              </button>
            ) : (
              <Link className="button primary inline booking-action" to="/login">{t('detail.signInToBook')}</Link>
            )
          )}
          <Link className="button primary inline" to="/schedules">{t('common.returnSchedules')}</Link>
        </article>
      )}
    </section>
  );
}

export default ScheduleDetailPage;
