import { describe, expect, test } from 'vitest';
import { EMPTY_VEHICLE_REQUEST, serializeVehicleRequestDraft, validateVehicleRequestDraft } from './vehicleRequestForm.js';

const now = new Date('2026-10-06T08:00:00.000Z');
const valid = {
  ...EMPTY_VEHICLE_REQUEST,
  origin: 'Jed Yod', destination: 'Doi Saket', departureDate: '2026-10-07', departureTime: '10:00',
  passengerCount: '3', purpose: 'Academic field work',
};

describe('vehicle request form', () => {
  test('accepts one-way request and serializes request times for API', () => {
    expect(validateVehicleRequestDraft(valid, now)).toEqual({});
    expect(serializeVehicleRequestDraft(valid)).toMatchObject({
      origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY', passengerCount: 3,
      purpose: 'Academic field work', returnAt: null,
    });
  });

  test('requires round-trip return date/time after departure', () => {
    const roundTrip = { ...valid, tripType: 'ROUND_TRIP' };
    expect(validateVehicleRequestDraft(roundTrip, now).returnAt).toBe('request.validation.returnRequired');
    expect(validateVehicleRequestDraft({ ...roundTrip, returnDate: '2026-10-07', returnTime: '09:00' }, now).returnAt)
      .toBe('request.validation.returnAfterDeparture');
    expect(validateVehicleRequestDraft({ ...roundTrip, returnDate: '2026-10-07', returnTime: '13:00' }, now)).toEqual({});
  });

  test('validates locations, future departure, positive integer passengers, and purpose', () => {
    expect(validateVehicleRequestDraft({ ...valid, origin: 'Chiang Mai' }, now).origin).toBe('request.validation.location');
    expect(validateVehicleRequestDraft({ ...valid, destination: 'Jed Yod' }, now).destination).toBe('request.validation.sameLocation');
    expect(validateVehicleRequestDraft({ ...valid, departureDate: '2026-10-05' }, now).departure).toBe('request.validation.departureFuture');
    expect(validateVehicleRequestDraft({ ...valid, passengerCount: '0' }, now).passengerCount).toBe('request.validation.passengers');
    expect(validateVehicleRequestDraft({ ...valid, passengerCount: '1.5' }, now).passengerCount).toBe('request.validation.passengers');
    expect(validateVehicleRequestDraft({ ...valid, purpose: ' ' }, now).purpose).toBe('request.validation.purpose');
  });

  test('marks required form fields before showing the review step', () => {
    const errors = validateVehicleRequestDraft({ ...EMPTY_VEHICLE_REQUEST }, now);
    expect(errors.origin).toBe('request.validation.location');
    expect(errors.destination).toBe('request.validation.location');
    expect(errors.departure).toBe('request.validation.departureRequired');
    expect(errors.purpose).toBe('request.validation.purpose');
  });
});
