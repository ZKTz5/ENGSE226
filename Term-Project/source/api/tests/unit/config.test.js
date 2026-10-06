import { describe, expect, test } from 'vitest';
import { resolveJwtSecret } from '../../src/config.js';

describe('resolveJwtSecret', () => {
  test('requires an explicit secret in production', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' }))
      .toThrow('JWT_SECRET must be set to a strong secret in production.');
    expect(() => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '  ' })).toThrow(/JWT_SECRET/);
  });

  test('uses the configured secret in production', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'random-production-value' }))
      .toBe('random-production-value');
  });

  test('keeps the development fallback outside production', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'test' })).toBe('dev-only-secret-do-not-use-in-production');
  });
});
