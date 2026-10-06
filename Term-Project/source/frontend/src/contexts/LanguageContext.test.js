import { describe, expect, test } from 'vitest';
import { getInitialLanguage, nextLanguage, persistLanguage } from './LanguageContext.jsx';

function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('language preference persistence', () => {
  test('first visit defaults to Thai', () => {
    expect(getInitialLanguage(storageMock())).toBe('th');
    expect(getInitialLanguage(null)).toBe('th');
  });

  test('selected English preference survives a fresh provider initialization', () => {
    const storage = storageMock();
    expect(nextLanguage('th')).toBe('en');
    persistLanguage('en', storage);
    expect(getInitialLanguage(storage)).toBe('en');
    expect(nextLanguage('en')).toBe('th');
  });
});
