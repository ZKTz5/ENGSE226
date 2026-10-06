import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { formatDeparture } from '../components/ScheduleCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createBooking, getSchedule } from '../services/shuttleService.js';

const statusLabel = { active: 'Seats available', full: 'Full', waitlist: 'Waitlist', expired: 'Departed' };

function ScheduleDetailPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    getSchedule(scheduleId).then((item) => {
      if (!ignore) { setSchedule(item); setState('success'); }
    }).catch((reason) => {
      if (!ignore) { setError(reason.message || 'Could not load this shuttle.'); setState('error'); }
    });
    return () => { ignore = true; };
  }, [scheduleId, reloadKey]);

  async function handleBooking() {
    if (!session) {
      navigate('/login');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    setBookingResult(null);
    try {
      const created = await createBooking(schedule.id);
      setBookingResult(created);
      getSchedule(scheduleId).then(setSchedule).catch(() => {});
    } catch (reason) {
      setBookingError(reason.message || 'Could not place this booking.');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <section data-testid="page-schedule-detail">
      <Link className="back-link" to="/schedules">← All schedules</Link>
      {state === 'loading' && <LoadingState message="Loading shuttle details…" />}
      {state === 'error' && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && schedule && (
        <article className="detail-hero">
          <p className="eyebrow dark">SHUTTLE {String(schedule.id).padStart(3, '0')}</p>
          <h1>{schedule.originName}<span aria-hidden="true"> → </span>{schedule.destinationName}</h1>
          <p className="detail-departure">{formatDeparture(schedule.departure_time)}</p>
          <div className="detail-facts">
            <div><span>Departure</span><strong>{formatDeparture(schedule.departure_time)}</strong></div>
            <div><span>Capacity</span><strong>{schedule.capacity} passengers</strong></div>
            <div><span>Confirmed</span><strong>{schedule.confirmedCount}</strong></div>
            <div><span>Available seats</span><strong>{schedule.availableSeats}</strong></div>
          </div>
          <p className={`detail-status ${schedule.status}`} role="status">{statusLabel[schedule.status] ?? schedule.status}</p>
          {schedule.status === 'expired' && <p className="muted-copy">This shuttle has already departed and cannot be booked.</p>}
          {schedule.status === 'full' && <p className="muted-copy">This shuttle is full. You can join the waitlist.</p>}
          {bookingResult && (
            <div className={`booking-outcome ${bookingResult.status}`} role="status">
              {bookingResult.status === 'waitlisted'
                ? 'You are on the waitlist. We will promote the first waiting passenger when a seat opens.'
                : 'Your shuttle seat is confirmed.'}
              {' '}<Link to="/bookings">View My Bookings</Link>
            </div>
          )}
          {bookingError && <p className="form-error" role="alert">{bookingError}</p>}
          {schedule.status !== 'expired' && (
            session ? (
              <button className="button primary booking-action" type="button" onClick={handleBooking} disabled={bookingLoading}>
                {bookingLoading ? 'Submitting…' : schedule.status === 'full' || schedule.status === 'waitlist' ? 'Join waitlist' : 'Book this shuttle'}
              </button>
            ) : (
              <Link className="button primary inline booking-action" to="/login">Sign in to book</Link>
            )
          )}
          <Link className="button primary inline" to="/schedules">Back to schedules</Link>
        </article>
      )}
    </section>
  );
}

export default ScheduleDetailPage;
