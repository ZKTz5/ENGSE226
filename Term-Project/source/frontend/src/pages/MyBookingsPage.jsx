import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { cancelBooking, getMyBookings } from '../services/shuttleService.js';

function MyBookingsPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [noticeKey, setNoticeKey] = useState('');
  const [cancelingId, setCancelingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadBookings = useCallback(() => {
    let ignore = false;
    setState('loading');
    setErrorKey('');
    getMyBookings().then((items) => {
      if (!ignore) { setBookings(items); setState('success'); }
    }).catch((reason) => {
      if (!ignore) { setErrorKey(apiErrorKey(reason)); setState('error'); }
    });
    return () => { ignore = true; };
  }, []);

  useEffect(() => loadBookings(), [loadBookings, reloadKey]);

  async function handleCancel(booking) {
    setCancelingId(booking.id);
    setErrorKey('');
    setNoticeKey('');
    try {
      const result = await cancelBooking(booking.id);
      setNoticeKey(result.promotedId
        ? 'bookings.promotedNotice'
        : booking.status === 'waitlisted' ? 'bookings.waitlistCancelled' : 'bookings.cancelledNotice');
      setBookings(await getMyBookings());
    } catch (reason) {
      setErrorKey(reason?.code ? apiErrorKey(reason) : 'bookings.cancelError');
    } finally {
      setCancelingId(null);
    }
  }

  if (!session) {
    return (
      <section className="page-section" data-testid="page-my-bookings">
        <div className="page-heading"><div><p className="eyebrow dark">{t('bookings.eyebrow')}</p><h1>{t('bookings.title')}</h1></div></div>
        <EmptyState title={t('bookings.signInTitle')} message={t('bookings.signInText')}
          action={<Link className="button primary inline" to="/login">{t('bookings.signIn')}</Link>} />
      </section>
    );
  }

  return (
    <section className="page-section" data-testid="page-my-bookings">
      <div className="page-heading"><div><p className="eyebrow dark">{t('bookings.eyebrow')}</p><h1>{t('bookings.title')}</h1><p>{t('bookings.intro')}</p></div></div>
      {noticeKey && <p className="notice" role="status">{t(noticeKey)}</p>}
      {state === 'loading' && <LoadingState message={t('common.loadingBookings')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && bookings.length === 0 && (
        <EmptyState title={t('state.noBookingsTitle')} message={t('state.noBookingsText')}
          action={<Link className="button primary inline" to="/schedules">{t('bookings.find')}</Link>} />
      )}
      {state === 'success' && bookings.length > 0 && (
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-main">
                <p className="eyebrow dark">{t('common.bookingRef')} {String(booking.id).padStart(4, '0')}</p>
                <h2>{displayCampusName(booking.originName, language)}<span aria-hidden="true"> → </span>{displayCampusName(booking.destinationName, language)}</h2>
                <p>{formatDeparture(booking.departure_time, language)}</p>
              </div>
              <span className={`booking-status ${booking.status}`}>{t(`status.${booking.status}`)}</span>
              <div className="booking-card-actions">
                <Link className="button secondary" to={`/schedules/${booking.schedule_id}`}>{t('bookings.details')}</Link>
                {booking.status !== 'cancelled' && (
                  <button className="button cancel-button" type="button" disabled={cancelingId === booking.id}
                    onClick={() => handleCancel(booking)}>
                    {cancelingId === booking.id ? t('bookings.cancelling') : t('bookings.cancel')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {errorKey && state === 'success' && <p className="form-error" role="alert">{t(errorKey)}</p>}
    </section>
  );
}

export default MyBookingsPage;
