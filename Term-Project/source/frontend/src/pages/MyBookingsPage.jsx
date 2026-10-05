import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmCancellationDialog from '../components/ConfirmCancellationDialog.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { cancelBooking, getMyBookings } from '../services/shuttleService.js';

function MyBookingsPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const headingRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [noticeKey, setNoticeKey] = useState('');
  const [cancelingId, setCancelingId] = useState(null);
  const [pendingCancellation, setPendingCancellation] = useState(null);
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
      setBookings((current) => current.map((item) => item.id === booking.id
        ? { ...item, status: 'cancelled' }
        : item));
      setNoticeKey(result.promotedId
        ? 'bookings.promotedNotice'
        : booking.status === 'waitlisted' ? 'bookings.waitlistCancelled' : 'bookings.cancelledNotice');
      setPendingCancellation(null);
      try {
        setBookings(await getMyBookings());
      } catch (reason) {
        setErrorKey(apiErrorKey(reason));
      }
    } catch (reason) {
      setErrorKey(apiErrorKey(reason));
      setPendingCancellation(null);
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
      <div className="page-heading"><div><p className="eyebrow dark">{t('bookings.eyebrow')}</p><h1 ref={headingRef} tabIndex={-1}>{t('bookings.title')}</h1><p>{t('bookings.intro')}</p></div></div>
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
                    onClick={() => setPendingCancellation(booking)}>
                    {cancelingId === booking.id ? t('bookings.cancelling') : t('bookings.cancel')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {errorKey && state === 'success' && <p className="form-error" role="alert">{t(errorKey)}</p>}
      {pendingCancellation && (
        <ConfirmCancellationDialog
          open
          pending={cancelingId === pendingCancellation.id}
          title={t('bookings.cancelConfirmTitle')}
          message={t('bookings.cancelConfirmText')}
          keepLabel={t('bookings.keep')}
          confirmLabel={t('bookings.cancelConfirmAction')}
          pendingLabel={t('bookings.cancelling')}
          restoreFocusTarget={headingRef.current}
          onKeep={() => setPendingCancellation(null)}
          onConfirm={() => handleCancel(pendingCancellation)}
        />
      )}
    </section>
  );
}

export default MyBookingsPage;
