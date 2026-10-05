export const SERVICE_LOCATIONS = Object.freeze(['Jed Yod', 'Doi Saket']);
export const TRIP_TYPES = Object.freeze(['ONE_WAY', 'ROUND_TRIP']);
export const REQUEST_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']);

function parseDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value.trim())) return null;
  const normalized = value.trim();
  const day = normalized.slice(0, 10);
  const calendar = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function validateVehicleRequest(input, now = new Date()) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { errors: ['Request body must be an object'], value: null };
  }

  const origin = typeof input.origin === 'string' ? input.origin.trim() : '';
  const destination = typeof input.destination === 'string' ? input.destination.trim() : '';
  const tripType = input.tripType;
  const departure = parseDateTime(input.departureAt);
  const returnAt = input.returnAt == null || input.returnAt === '' ? null : parseDateTime(input.returnAt);
  const passengerCount = input.passengerCount;
  const purpose = typeof input.purpose === 'string' ? input.purpose.trim() : '';
  const note = input.note == null ? null : (typeof input.note === 'string' ? input.note.trim() : undefined);

  if (!SERVICE_LOCATIONS.includes(origin)) errors.push('origin_invalid');
  if (!SERVICE_LOCATIONS.includes(destination)) errors.push('destination_invalid');
  if (origin && destination && origin === destination) errors.push('same_location');
  if (!TRIP_TYPES.includes(tripType)) errors.push('trip_type_invalid');
  if (!departure) errors.push('departure_invalid');
  else if (departure <= now) errors.push('departure_in_past');
  if (!Number.isSafeInteger(passengerCount) || passengerCount <= 0) errors.push('passenger_count_invalid');
  if (!purpose || purpose.length > 500) errors.push('purpose_required');
  if (note === undefined || (note && note.length > 2000)) errors.push('note_invalid');
  if (tripType === 'ROUND_TRIP' && !returnAt) errors.push('return_required');
  if (input.returnAt != null && input.returnAt !== '' && !returnAt) errors.push('return_invalid');
  if (departure && returnAt && returnAt <= departure) errors.push('return_before_departure');

  if (errors.length) return { errors, value: null };
  return {
    errors,
    value: {
      origin,
      destination,
      tripType,
      departureAt: departure.toISOString(),
      returnAt: returnAt?.toISOString() ?? null,
      passengerCount,
      purpose,
      note,
    },
  };
}

export function validateVehicleInput(input) {
  const errors = [];
  const code = typeof input?.code === 'string' ? input.code.trim() : '';
  const capacity = input?.capacity;
  const homeLocation = input?.homeLocation ?? 'Jed Yod';
  if (!code || code.length > 50) errors.push('vehicle_code_required');
  if (!Number.isSafeInteger(capacity) || capacity <= 0) errors.push('vehicle_capacity_invalid');
  if (homeLocation !== 'Jed Yod') errors.push('vehicle_home_invalid');
  return {
    errors,
    value: errors.length ? null : { code, capacity, homeLocation },
  };
}

export function validateRejectionReason(input) {
  const reason = typeof input?.rejectionReason === 'string' ? input.rejectionReason.trim() : '';
  return reason.length > 0 && reason.length <= 1000
    ? { errors: [], value: reason }
    : { errors: ['rejection_reason_required'], value: null };
}
