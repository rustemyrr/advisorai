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

  // The server renders lang="en" because the choice lives in localStorage and
  // it cannot be read there. Once the page is interactive, the real language is
  // known, so the attribute is corrected here -- that is what a screen reader
  // reads the page with. Crawlers still see "en"; giving them the right value
  // needs per-language URLs, which is a bigger change than one attribute.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
