"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { type Lang, translations, type Translations } from "./i18n";

const STORAGE_KEY = "advisorai_lang";

type LanguageContextValue = {
  lang: Lang;
  t: Translations;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  t: translations.en as Translations,
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "ru") setLang(stored);
    } catch {}
  }, []);

  function toggle() {
    setLang((prev) => {
      const next: Lang = prev === "en" ? "ru" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
