import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import RequestSubmissionTicket from '../components/RequestSubmissionTicket.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName, formatDeparture } from '../i18n/translations.js';
import { createVehicleRequest, getLocations } from '../services/vehicleRequestService.js';
import { EMPTY_VEHICLE_REQUEST, serializeVehicleRequestDraft, validateVehicleRequestDraft } from '../utils/vehicleRequestForm.js';

function NewRequestPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const reviewHeadingRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [draft, setDraft] = useState({ ...EMPTY_VEHICLE_REQUEST });
  const [errors, setErrors] = useState({});
  const [pageState, setPageState] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [formError, setFormError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let ignore = false;
    getLocations().then((items) => {
      if (!ignore) { setLocations(items); setPageState('ready'); }
    }).catch((error) => {
      if (!ignore) { setFormError(apiErrorKey(error)); setPageState('error'); }
    });
    return () => { ignore = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (reviewing) reviewHeadingRef.current?.focus({ preventScroll: true });
  }, [reviewing]);

  function update(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name === 'departureDate' || name === 'departureTime' ? 'departure' : name === 'returnDate' || name === 'returnTime' ? 'returnAt' : name]: undefined }));
    setFormError('');
  }

  function review(event) {
    event.preventDefault();
    const nextErrors = validateVehicleRequestDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setReviewing(true);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      const response = await createVehicleRequest(serializeVehicleRequestDraft(draft));
      setCreated(response);
      setReviewing(false);
    } catch (error) {
      setFormError(apiErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return <section className="page-section"><EmptyState title={t('request.signInTitle')} message={t('request.signInText')} action={<Link className="button primary inline" to="/login">{t('nav.login')}</Link>} /></section>;
  if (pageState === 'loading') return <LoadingState message={t('common.loadingLocations')} />;
  if (pageState === 'error') return <ErrorState message={t(formError)} onRetry={() => { setPageState('loading'); setReloadKey((value) => value + 1); }} />;
  if (created) return <section className="page-section"><RequestSubmissionTicket request={created} /></section>;

  const departure = draft.departureDate && draft.departureTime ? new Date(`${draft.departureDate}T${draft.departureTime}`) : null;
  const returnAt = draft.returnDate && draft.returnTime ? new Date(`${draft.returnDate}T${draft.returnTime}`) : null;
  const showFieldError = (key) => errors[key] ? <small className="field-error" id={`${key}-error`}>{t(errors[key])}</small> : null;

  return (
    <section className="page-section" data-testid="page-new-request">
      <header className="page-heading"><div><p className="eyebrow dark">{t('request.eyebrow')}</p><h1>{t('request.newTitle')}</h1><p>{t('request.intro')}</p></div></header>
      {formError && <p className="form-error" role="alert">{t(formError)}</p>}
      {!reviewing ? (
        <form className="request-form panel" onSubmit={review} noValidate>
          <fieldset className="field-group"><legend>{t('request.tripType')}</legend>
            <label className="radio-label"><input type="radio" name="tripType" value="ONE_WAY" checked={draft.tripType === 'ONE_WAY'} onChange={update} /> {t('request.trip.ONE_WAY')}</label>
            <label className="radio-label"><input type="radio" name="tripType" value="ROUND_TRIP" checked={draft.tripType === 'ROUND_TRIP'} onChange={update} /> {t('request.trip.ROUND_TRIP')}</label>
            {showFieldError('tripType')}
          </fieldset>
          <div className="search-fields">
            <label className="field" htmlFor="origin"><span>{t('request.origin')}</span>
              <select id="origin" name="origin" value={draft.origin} onChange={update} required aria-invalid={Boolean(errors.origin)}>
                <option value="">{t('request.chooseLocation')}</option>
                {locations.map((location) => <option key={location.value} value={location.value}>{displayCampusName(location.name, language)}{location.isHomeBase ? ` · ${t('request.homeBase')}` : ''}</option>)}
              </select>{showFieldError('origin')}
            </label>
            <label className="field" htmlFor="destination"><span>{t('request.destination')}</span>
              <select id="destination" name="destination" value={draft.destination} onChange={update} required aria-invalid={Boolean(errors.destination)}>
                <option value="">{t('request.chooseLocation')}</option>
                {locations.map((location) => <option key={location.value} value={location.value}>{displayCampusName(location.name, language)}</option>)}
              </select>{showFieldError('destination')}
            </label>
            <label className="field" htmlFor="departureDate"><span>{t('request.departureDate')}</span><input id="departureDate" name="departureDate" type="date" value={draft.departureDate} onChange={update} required aria-invalid={Boolean(errors.departure)} aria-describedby={errors.departure ? 'departure-error' : undefined} /></label>
            <label className="field" htmlFor="departureTime"><span>{t('request.departureTime')}</span><input id="departureTime" name="departureTime" type="time" value={draft.departureTime} onChange={update} required aria-invalid={Boolean(errors.departure)} aria-describedby={errors.departure ? 'departure-error' : undefined} />{errors.departure && <small className="field-error" id="departure-error">{t(errors.departure)}</small>}</label>
            <label className="field" htmlFor="returnDate"><span>{draft.tripType === 'ROUND_TRIP' ? t('request.returnDate') : t('request.serviceEndDate')}</span><input id="returnDate" name="returnDate" type="date" value={draft.returnDate} onChange={update} required={draft.tripType === 'ROUND_TRIP'} aria-invalid={Boolean(errors.returnAt)} aria-describedby={errors.returnAt ? 'returnAt-error' : undefined} /></label>
            <label className="field" htmlFor="returnTime"><span>{draft.tripType === 'ROUND_TRIP' ? t('request.returnTime') : t('request.serviceEndTime')}</span><input id="returnTime" name="returnTime" type="time" value={draft.returnTime} onChange={update} required={draft.tripType === 'ROUND_TRIP'} aria-invalid={Boolean(errors.returnAt)} aria-describedby={errors.returnAt ? 'returnAt-error' : undefined} />{errors.returnAt && <small className="field-error" id="returnAt-error">{t(errors.returnAt)}</small>}</label>
            <label className="field" htmlFor="passengerCount"><span>{t('request.passengerCount')}</span><input id="passengerCount" name="passengerCount" type="number" min="1" step="1" value={draft.passengerCount} onChange={update} required aria-invalid={Boolean(errors.passengerCount)} />{showFieldError('passengerCount')}</label>
            <label className="field" htmlFor="purpose"><span>{t('request.purpose')}</span><input id="purpose" name="purpose" maxLength="500" value={draft.purpose} onChange={update} required aria-invalid={Boolean(errors.purpose)} />{showFieldError('purpose')}</label>
            <label className="field field-wide" htmlFor="note"><span>{t('request.note')}</span><textarea id="note" name="note" rows="3" maxLength="2000" value={draft.note} onChange={update} aria-invalid={Boolean(errors.note)} />{showFieldError('note')}</label>
          </div>
          <p className="pending-explainer" role="note">{t('request.pendingExplanation')}</p>
          <button className="button primary" type="submit">{t('request.reviewAction')}</button>
        </form>
      ) : (
        <section className="request-review panel" aria-labelledby="review-title">
          <h2 id="review-title" ref={reviewHeadingRef} tabIndex={-1}>{t('request.reviewTitle')}</h2>
          <p>{t('request.reviewHelp')}</p>
          <dl className="request-facts">
            <div><dt>{t('request.tripType')}</dt><dd>{t(`request.trip.${draft.tripType}`)}</dd></div>
            <div><dt>{t('request.origin')}</dt><dd>{displayCampusName(draft.origin, language)}</dd></div>
            <div><dt>{t('request.destination')}</dt><dd>{displayCampusName(draft.destination, language)}</dd></div>
            <div><dt>{t('request.departure')}</dt><dd>{formatDeparture(departure, language)}</dd></div>
            {returnAt && <div><dt>{t('request.returnAt')}</dt><dd>{formatDeparture(returnAt, language)}</dd></div>}
            <div><dt>{t('request.passengerCount')}</dt><dd>{draft.passengerCount}</dd></div>
            <div><dt>{t('request.purpose')}</dt><dd>{draft.purpose}</dd></div>
            {draft.note && <div><dt>{t('request.note')}</dt><dd>{draft.note}</dd></div>}
          </dl>
          <p className="pending-explainer">{t('request.pendingExplanation')}</p>
          <div className="ticket-actions">
            <button className="button secondary" type="button" onClick={() => setReviewing(false)} disabled={submitting}>{t('request.editAction')}</button>
            <button className="button primary" type="button" onClick={submit} disabled={submitting}>{submitting ? t('request.submitting') : t('request.submitAction')}</button>
          </div>
        </section>
      )}
    </section>
  );
}

export default NewRequestPage;
