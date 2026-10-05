import { describe, expect, test } from 'vitest';
import { apiErrorKey, displayCampusName, formatDeparture, translate } from './translations.js';
import { getInitialLanguage, nextLanguage } from '../contexts/LanguageContext.jsx';

describe('translation helpers', () => {
  test('uses Thai as the first-visit default and safely reads a saved language', () => {
    expect(getInitialLanguage({ getItem: () => null })).toBe('th');
    expect(getInitialLanguage({ getItem: () => 'en' })).toBe('en');
    expect(getInitialLanguage({ getItem: () => 'xx' })).toBe('th');
    expect(getInitialLanguage({ getItem: () => { throw new Error('storage unavailable'); } })).toBe('th');
  });

  test('switcher toggles both supported languages without a page reload', () => {
    expect(nextLanguage('th')).toBe('en');
    expect(nextLanguage('en')).toBe('th');
  });

  test('falls back to English and then to the key for missing translations', () => {
    expect(translate('th', 'nav.home')).toBe('หน้าหลัก');
    expect(translate('th', 'login.title')).toBe('เข้าสู่ระบบ');
    expect(translate('th', 'missing.key')).toBe('missing.key');
  });

  test('localizes campus names, API errors, and dates', () => {
    expect(displayCampusName('Jed Yod', 'th')).toBe('เจ็ดยอด');
    expect(displayCampusName('Doi Saket', 'en')).toBe('Doi Saket');
    expect(apiErrorKey({ code: 'invalid_email_domain' })).toBe('login.invalidDomain');
    expect(formatDeparture('2026-10-07 10:30:00', 'th')).not.toBe('2026-10-07 10:30:00');
    expect(formatDeparture('2026-10-07 10:30:00', 'en')).not.toBe('2026-10-07 10:30:00');
  });
});
