"use client";

import * as React from "react";
import { useDeferredValue } from "react";
import {
  getStoredLanguage,
  setStoredLanguage,
  loadMessages,
  type Locale,
  type Messages,
  getMessage,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  setLocalePreview: (locale: Locale) => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => getStoredLanguage());
  const [messages, setMessages] = React.useState<Messages>(() =>
    loadMessages(getStoredLanguage())
  );

  const deferredMessages = useDeferredValue(messages);

  const setLocale = React.useCallback((newLocale: Locale) => {
    setStoredLanguage(newLocale);
    setLocaleState(newLocale);
    setMessages(loadMessages(newLocale));
  }, []);

  const setLocalePreview = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setMessages(loadMessages(newLocale));
  }, []);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getMessage(deferredMessages, key, params);
    },
    [deferredMessages]
  );

  const value = React.useMemo(
    () => ({ locale, t, setLocale, setLocalePreview }),
    [locale, t, setLocale, setLocalePreview]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslations must be used within I18nProvider");
  }
  return ctx;
}