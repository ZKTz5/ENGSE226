import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../i18n/translations.js';

const LANGUAGE_KEY = 'rmutl-shuttle-language';
const LanguageContext = createContext(null);

export function getInitialLanguage(storage) {
  try {
    return storage?.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'th';
  } catch {
    return 'th';
  }
}

export function nextLanguage(current) {
  return current === 'th' ? 'en' : 'th';
}

export function persistLanguage(language, storage) {
  try { storage?.setItem(LANGUAGE_KEY, language); } catch { /* storage is optional */ }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => getInitialLanguage(globalThis.localStorage));

  useEffect(() => {
    document.documentElement.lang = language;
    persistLanguage(language, globalThis.localStorage);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage((current) => nextLanguage(current)),
    t: (key, values) => translate(language, key, values),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
