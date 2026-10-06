import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { formatDeparture } from '../components/ScheduleCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cancelBooking, getMyBookings } from '../services/shuttleService.js';

const statusLabel = { confirmed: 'Confirmed', waitlisted: 'Waitlisted', cancelled: 'Cancelled' };

function MyBookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelingId, setCancelingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadBookings = useCallback(() => {
    let ignore = false;
    setState('loading');
    setError('');
    getMyBookings().then((items) => {
      if (!ignore) { setBookings(items); setState('success'); }
    }).catch((reason) => {
      if (!ignore) { setError(reason.message || 'Could not load your bookings.'); setState('error'); }
    });
    return () => { ignore = true; };
  }, []);

  useEffect(() => loadBookings(), [loadBookings, reloadKey]);

  async function handleCancel(booking) {
    setCancelingId(booking.id);
    setError('');
    setNotice('');
    try {
      const result = await cancelBooking(booking.id);
      setNotice(result.promotedId
        ? 'Booking cancelled. The next passenger on the waitlist was promoted.'
        : booking.status === 'waitlisted'
          ? 'Your waitlist entry was cancelled.'
          : 'Your booking was cancelled.');
      setBookings(await getMyBookings());
    } catch (reason) {
      setError(reason.message || 'Could not cancel this booking.');
    } finally {
      setCancelingId(null);
    }
  }

  if (!session) {
    return (
      <section className="page-section" data-testid="page-my-bookings">
        <div className="page-heading"><div><p className="eyebrow dark">YOUR TRIPS</p><h1>My Bookings</h1></div></div>
        <EmptyState title="Sign in to see your bookings" message="Your RMUTL account keeps your shuttle bookings together."
          action={<Link className="button primary inline" to="/login">Sign in</Link>} />
      </section>
    );
  }

  return (
    <section className="page-section" data-testid="page-my-bookings">
      <div className="page-heading"><div><p className="eyebrow dark">YOUR TRIPS</p><h1>My Bookings</h1><p>Review your confirmed seats and waitlist entries.</p></div></div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {state === 'loading' && <LoadingState message="Loading your bookings…" />}
      {state === 'error' && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && bookings.length === 0 && (
        <EmptyState title="No bookings yet" message="Find a shuttle and reserve your seat when you are ready."
          action={<Link className="button primary inline" to="/schedules">Find a shuttle</Link>} />
      )}
      {state === 'success' && bookings.length > 0 && (
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-main">
                <p className="eyebrow dark">BOOKING {String(booking.id).padStart(4, '0')}</p>
                <h2>{booking.originName}<span aria-hidden="true"> → </span>{booking.destinationName}</h2>
                <p>{formatDeparture(booking.departure_time)}</p>
              </div>
              <span className={`booking-status ${booking.status}`}>{statusLabel[booking.status] ?? booking.status}</span>
              <div className="booking-card-actions">
                <Link className="button secondary" to={`/schedules/${booking.schedule_id}`}>Schedule details</Link>
                {booking.status !== 'cancelled' && (
                  <button className="button cancel-button" type="button" disabled={cancelingId === booking.id}
                    onClick={() => handleCancel(booking)}>
                    {cancelingId === booking.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {error && state === 'success' && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export default MyBookingsPage;
