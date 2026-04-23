import React, { createContext, useContext, useMemo } from 'react';
import { FALLBACK_LOCALE, translate } from './translations';

type I18nContextValue = {
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({
      t: (key) => translate(FALLBACK_LOCALE, key),
    }),
    []
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
