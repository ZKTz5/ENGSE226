import { Link } from 'react-router-dom';

export function formatDeparture(value) {
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(parsed);
}

const statusLabel = {
  active: 'Seats available',
  full: 'Full',
  waitlist: 'Waitlist',
  expired: 'Departed',
};

function ScheduleCard({ schedule }) {
  return (
    <article className="schedule-card">
      <div className="schedule-time-block">
        <span className="schedule-date-label">Departure</span>
        <strong>{formatDeparture(schedule.departure_time)}</strong>
      </div>
      <div className="schedule-route">
        <p className="eyebrow dark">ROUTE {String(schedule.id).padStart(3, '0')}</p>
        <h3>{schedule.originName}<span aria-hidden="true"> → </span>{schedule.destinationName}</h3>
        <p>{schedule.confirmedCount} booked · {schedule.availableSeats} seats available</p>
      </div>
      <div className="schedule-card-action">
        <span className={`badge shuttle-badge ${schedule.status}`}>{statusLabel[schedule.status] ?? schedule.status}</span>
        <Link className="button secondary" to={`/schedules/${schedule.id}`}>View details</Link>
      </div>
    </article>
  );
}

export default ScheduleCard;
