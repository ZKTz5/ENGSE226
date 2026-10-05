import { describe, expect, test } from 'vitest';
import { validateLoginInput, validateScheduleFilters } from '../../src/validators/shuttleValidator.js';

describe('validateLoginInput', () => {
  test('accepts a well-formed login payload', () => {
    expect(validateLoginInput({ email: 'student@live.rmutl.ac.th', password: 'secret' })).toEqual([]);
  });

  test('reports missing or malformed login fields', () => {
    expect(validateLoginInput({ email: 'student@live.rmutl.ac.th' })).toContain('กรุณาระบุรหัสผ่าน');
    expect(validateLoginInput({ email: 'invalid', password: '' })).toHaveLength(2);
    expect(validateLoginInput(null)).toEqual(['ต้องส่งอีเมลและรหัสผ่าน']);
  });
});

describe('validateScheduleFilters', () => {
  test('accepts valid optional filters and normalizes campus ids', () => {
    expect(validateScheduleFilters({ originId: '1', destinationId: '2', date: '2026-10-06' }))
      .toEqual({ errors: [], filters: { originId: 1, destinationId: 2, date: '2026-10-06' } });
    expect(validateScheduleFilters({})).toEqual({ errors: [], filters: {} });
  });

  test.each([
    { originId: '0' }, { originId: '2.1' }, { destinationId: 'nope' },
    { date: '2026-02-30' }, { date: '06-10-2026' },
    { originId: '2', destinationId: '2' },
  ])('rejects invalid filter values: %j', (query) => {
    expect(validateScheduleFilters(query).errors.length).toBeGreaterThan(0);
  });
});
