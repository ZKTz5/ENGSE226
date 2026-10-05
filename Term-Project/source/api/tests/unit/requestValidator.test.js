import { describe, expect, test } from 'vitest';
import { validateRejectionReason, validateVehicleInput, validateVehicleRequest } from '../../src/validators/requestValidator.js';

const now = new Date('2026-10-06T10:00:00.000Z');
const valid = {
  origin: 'Jed Yod', destination: 'Doi Saket', tripType: 'ONE_WAY',
  departureAt: '2026-10-07T10:00:00.000Z', returnAt: null,
  passengerCount: 3, purpose: 'Academic field visit', note: null,
};

describe('vehicle request validation', () => {
  test('accepts a valid one-way request and normalizes datetimes', () => {
    expect(validateVehicleRequest(valid, now)).toEqual({ errors: [], value: { ...valid } });
  });
  test('requires return date/time for round trip and requires it after departure', () => {
    expect(validateVehicleRequest({ ...valid, tripType: 'ROUND_TRIP' }, now).errors).toContain('return_required');
    expect(validateVehicleRequest({ ...valid, tripType: 'ROUND_TRIP', returnAt: '2026-10-07T09:00:00.000Z' }, now).errors)
      .toContain('return_before_departure');
    expect(validateVehicleRequest({ ...valid, tripType: 'ROUND_TRIP', returnAt: '2026-10-07T12:00:00.000Z' }, now).errors).toEqual([]);
  });
  test.each([
    [{ origin: 'Chiang Mai' }, 'origin_invalid'],
    [{ destination: 'Jed Yod' }, 'same_location'],
    [{ departureAt: '2026-10-06T09:59:00Z' }, 'departure_in_past'],
    [{ tripType: 'RETURN' }, 'trip_type_invalid'],
    [{ passengerCount: 0 }, 'passenger_count_invalid'],
    [{ passengerCount: -1 }, 'passenger_count_invalid'],
    [{ passengerCount: 1.5 }, 'passenger_count_invalid'],
    [{ purpose: '' }, 'purpose_required'],
    [{ departureAt: 'not-a-date' }, 'departure_invalid'],
  ])('rejects invalid input %j', (change, expected) => {
    expect(validateVehicleRequest({ ...valid, ...change }, now).errors).toContain(expected);
  });
  test('requires an object payload', () => expect(validateVehicleRequest(null, now).errors).toContain('Request body must be an object'));
  test('reports missing request fields individually', () => {
    const { errors } = validateVehicleRequest({}, now);
    for (const field of ['origin_invalid', 'destination_invalid', 'trip_type_invalid', 'departure_invalid', 'passenger_count_invalid', 'purpose_required']) {
      expect(errors).toContain(field);
    }
  });
});

describe('vehicle administration validation', () => {
  test('defaults home to Jed Yod and validates vehicle data', () => {
    expect(validateVehicleInput({ code: 'VAN-01', capacity: 8 })).toEqual({
      errors: [], value: { code: 'VAN-01', capacity: 8, homeLocation: 'Jed Yod' },
    });
    expect(validateVehicleInput({ code: 'VAN-02', capacity: 4, homeLocation: 'Doi Saket' }).errors).toContain('vehicle_home_invalid');
  });
  test('requires a rejection reason', () => {
    expect(validateRejectionReason({}).errors).toContain('rejection_reason_required');
    expect(validateRejectionReason({ rejectionReason: 'No vehicle available' }).value).toBe('No vehicle available');
  });
});
