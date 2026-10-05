import { describe, expect, test } from 'vitest';
import { apiErrorKey, displayCampusName, formatDeparture, translate } from './translations.js';
import { getInitialLanguage, nextLanguage } from '../contexts/LanguageContext.jsx';

describe('translation helpers', () => {
  test('uses Thai first and safely reads saved language', () => {
    expect(getInitialLanguage({ getItem: () => null })).toBe('th');
    expect(getInitialLanguage({ getItem: () => 'en' })).toBe('en');
    expect(getInitialLanguage({ getItem: () => 'xx' })).toBe('th');
    expect(getInitialLanguage({ getItem: () => { throw new Error('storage unavailable'); } })).toBe('th');
  });
  test('switches languages without a reload and safely falls back for missing keys', () => {
    expect(nextLanguage('th')).toBe('en');
    expect(nextLanguage('en')).toBe('th');
    expect(translate('th', 'request.status.PENDING')).toBe('รอตรวจสอบ');
    expect(translate('en', 'request.status.PENDING')).toBe('Pending');
    expect(translate('th', 'missing.key')).toBe('missing.key');
  });
  test('localizes service locations, request errors, and date values', () => {
    expect(displayCampusName('Jed Yod', 'th')).toBe('เจ็ดยอด');
    expect(displayCampusName('Doi Saket', 'en')).toBe('Doi Saket');
    expect(apiErrorKey({ code: 'invalid_email_domain' })).toBe('login.invalidDomain');
    expect(apiErrorKey({ code: 'vehicle_assignment_overlap' })).toBe('api.vehicleOverlap');
    expect(formatDeparture(new Date('2026-10-07T10:30:00.000Z'), 'th')).not.toBe('');
  });
});
