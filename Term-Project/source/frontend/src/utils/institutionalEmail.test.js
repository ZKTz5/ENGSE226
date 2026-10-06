import { describe, expect, test } from 'vitest';
import { isInstitutionalEmail } from './institutionalEmail.js';

describe('isInstitutionalEmail', () => {
  test('accepts the exact live RMUTL domain case-insensitively', () => {
    expect(isInstitutionalEmail('student@live.rmutl.ac.th')).toBe(true);
    expect(isInstitutionalEmail('STUDENT@LIVE.RMUTL.AC.TH')).toBe(true);
    expect(isInstitutionalEmail(' student@live.rmutl.ac.th ')).toBe(true);
  });

  test.each([
    'student@rmutl.ac.th',
    'student@sub.live.rmutl.ac.th',
    'student@live.rmutl.ac.th.example',
    'student@@live.rmutl.ac.th',
  ])('rejects a non-exact address: %s', (email) => {
    expect(isInstitutionalEmail(email)).toBe(false);
  });
});
