import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { displayCampusName, formatDeparture } from '../i18n/translations.js';

function BookingTicket({ booking, schedule }) {
  const ticketRef = useRef(null);
  const previousFocus = useRef(null);
  const { language, t } = useLanguage();
  const waiting = booking.status === 'waitlisted';

  useEffect(() => {
    previousFocus.current = document.activeElement;
    ticketRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
    };
  }, []);

  const originName = schedule?.origin_id === booking.origin_id ? schedule.originName : String(booking.origin_id);
  const destinationName = schedule?.destination_id === booking.destination_id
    ? schedule.destinationName : String(booking.destination_id);
  const reference = booking.booking_reference ?? booking.reference ?? booking.id;

  return (
    <section
      ref={ticketRef}
      className={`booking-ticket ${waiting ? 'waitlisted' : 'confirmed'}`}
      data-testid="booking-ticket"
      aria-labelledby="booking-ticket-title"
      aria-live="polite"
      tabIndex={-1}
    >
      <div className="ticket-main">
        <p className="eyebrow dark">{t('ticket.resultLabel')}</p>
        <h2 id="booking-ticket-title">{waiting ? t('ticket.waitlistStatus') : t('ticket.confirmedStatus')}</h2>
        <p className="ticket-route">
          {displayCampusName(originName, language)} <span aria-hidden="true">→</span> {displayCampusName(destinationName, language)}
        </p>
        <dl className="ticket-facts">
          <div><dt>{t('common.departure')}</dt><dd>{formatDeparture(booking.departure_time, language)}</dd></div>
          <div><dt>{t('common.bookingRef')}</dt><dd>{reference}</dd></div>
          <div><dt>{t('ticket.status')}</dt><dd>{t(`status.${booking.status}`)}</dd></div>
        </dl>
        {waiting && <p className="ticket-waitlist-help">{t('ticket.waitlistHelp')}</p>}
        <div className="ticket-actions">
          <Link className="button primary" to="/bookings">{t('common.openBookings')}</Link>
          <Link className="button secondary" to="/schedules">{t('common.returnSchedules')}</Link>
        </div>
      </div>
      <div className={`ticket-stamp ${waiting ? 'waitlist-stamp' : 'confirmed-stamp'}`} aria-label={waiting ? t('ticket.waitlist') : t('ticket.confirmed')}>
        {waiting ? t('ticket.waitlist') : t('ticket.confirmed')}
      </div>
    </section>
  );
}

export default BookingTicket;
