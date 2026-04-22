import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { FALLBACK_LOCALE, normalizeLocale, SupportedLocale, translate } from './translations';

const LOCALE_STORAGE_KEY = 'app.locale';

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (nextLocale: SupportedLocale) => Promise<void>;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(FALLBACK_LOCALE);

  useEffect(() => {
    const bootstrapLocale = async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored) {
          setLocaleState(normalizeLocale(stored));
        }
      } catch (error) {
        console.error('Failed to load locale:', error);
      }
    };
    bootstrapLocale();
  }, []);

  const setLocale = async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch (error) {
      console.error('Failed to save locale:', error);
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
