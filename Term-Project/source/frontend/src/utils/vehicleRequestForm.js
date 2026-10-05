export const EMPTY_VEHICLE_REQUEST = Object.freeze({
  tripType: 'ONE_WAY', origin: '', destination: '', departureDate: '', departureTime: '',
  returnDate: '', returnTime: '', passengerCount: '1', purpose: '', note: '',
});

export function localDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function validateVehicleRequestDraft(draft, now = new Date()) {
  const errors = {};
  if (!['ONE_WAY', 'ROUND_TRIP'].includes(draft.tripType)) errors.tripType = 'request.validation.tripType';
  if (!['Jed Yod', 'Doi Saket'].includes(draft.origin)) errors.origin = 'request.validation.location';
  if (!['Jed Yod', 'Doi Saket'].includes(draft.destination)) errors.destination = 'request.validation.location';
  if (draft.origin && draft.origin === draft.destination) errors.destination = 'request.validation.sameLocation';
  const departure = localDateTime(draft.departureDate, draft.departureTime);
  if (!draft.departureDate || !draft.departureTime || !departure) errors.departure = 'request.validation.departureRequired';
  else if (departure <= now) errors.departure = 'request.validation.departureFuture';
  const count = Number(draft.passengerCount);
  if (!Number.isSafeInteger(count) || count <= 0) errors.passengerCount = 'request.validation.passengers';
  if (!draft.purpose.trim()) errors.purpose = 'request.validation.purpose';
  const endPartlyEntered = Boolean(draft.returnDate || draft.returnTime);
  const returnAt = localDateTime(draft.returnDate, draft.returnTime);
  if (draft.tripType === 'ROUND_TRIP' && (!draft.returnDate || !draft.returnTime || !returnAt)) {
    errors.returnAt = 'request.validation.returnRequired';
  } else if (endPartlyEntered && (!draft.returnDate || !draft.returnTime || !returnAt)) {
    errors.returnAt = 'request.validation.returnInvalid';
  } else if (returnAt && departure && returnAt <= departure) {
    errors.returnAt = 'request.validation.returnAfterDeparture';
  }
  if (draft.purpose.trim().length > 500) errors.purpose = 'request.validation.purposeLong';
  if (draft.note.length > 2000) errors.note = 'request.validation.noteLong';
  return errors;
}

export function serializeVehicleRequestDraft(draft) {
  const departure = localDateTime(draft.departureDate, draft.departureTime);
  const returnAt = draft.returnDate && draft.returnTime ? localDateTime(draft.returnDate, draft.returnTime) : null;
  return {
    origin: draft.origin,
    destination: draft.destination,
    tripType: draft.tripType,
    departureAt: departure?.toISOString(),
    returnAt: returnAt?.toISOString() ?? null,
    passengerCount: Number(draft.passengerCount),
    purpose: draft.purpose.trim(),
    note: draft.note.trim() || null,
  };
}
