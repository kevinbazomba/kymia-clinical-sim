/**
 * Centralised i18n for Kymia.
 *
 * Translations live in JSON files under src/locales/<lang>/<namespace>.json.
 * Adding a new language = add a folder + register it in LOCALES below.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import frCommon from "@/locales/fr/common.json";
import frLanding from "@/locales/fr/landing.json";
import frAuth from "@/locales/fr/auth.json";
import frHome from "@/locales/fr/home.json";
import frConsultation from "@/locales/fr/consultation.json";
import frJury from "@/locales/fr/jury.json";
import frProfile from "@/locales/fr/profile.json";
import frAdmin from "@/locales/fr/admin.json";
import frSubscription from "@/locales/fr/subscription.json";

import enCommon from "@/locales/en/common.json";
import enLanding from "@/locales/en/landing.json";
import enAuth from "@/locales/en/auth.json";
import enHome from "@/locales/en/home.json";
import enConsultation from "@/locales/en/consultation.json";
import enJury from "@/locales/en/jury.json";
import enProfile from "@/locales/en/profile.json";
import enAdmin from "@/locales/en/admin.json";
import enSubscription from "@/locales/en/subscription.json";

export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];
export const LANG_LABELS: Record<Lang, string> = { fr: "🇫🇷 Français", en: "🇬🇧 English" };

type Dict = Record<string, unknown>;

const LOCALES: Record<Lang, Dict> = {
  fr: {
    common: frCommon,
    landing: frLanding,
    auth: frAuth,
    home: frHome,
    consultation: frConsultation,
    jury: frJury,
    profile: frProfile,
    admin: frAdmin,
    subscription: frSubscription,
  },
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    home: enHome,
    consultation: enConsultation,
    jury: enJury,
    profile: enProfile,
    admin: enAdmin,
    subscription: enSubscription,
  },
};

export const LANG_STORAGE_KEY = "kymia.lang";
export const LANG_PROMPT_KEY = "kymia.lang.prompted";

function lookup(dict: Dict, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Dict)) return (acc as Dict)[part];
    return undefined;
  }, dict);
}

function interpolate(value: string, vars?: Record<string, string | number>) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export type TFunction = {
  (key: string, vars?: Record<string, string | number>): string;
  /** Returns an array value from the dictionary (e.g. bullet lists). */
  list: (key: string) => string[];
};

export function makeT(lang: Lang): TFunction {
  const t = ((key: string, vars?: Record<string, string | number>) => {
    const raw = lookup(LOCALES[lang], key) ?? lookup(LOCALES.fr, key);
    if (typeof raw === "string") return interpolate(raw, vars);
    if (typeof raw === "number") return String(raw);
    return key;
  }) as TFunction;
  t.list = (key: string) => {
    const raw = lookup(LOCALES[lang], key) ?? lookup(LOCALES.fr, key);
    return Array.isArray(raw) ? (raw as unknown[]).map(String) : [];
  };
  return t;
}

/** Reads the persisted preference outside of React (error boundaries, PDF export…). */
export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  return stored === "en" ? "en" : "fr";
}

export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const l of langs) {
    const code = l.toLowerCase().slice(0, 2);
    if (code === "fr") return "fr";
    if (code === "en") return "en";
  }
  return "fr";
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang, opts?: { persist?: boolean }) => void;
  t: TFunction;
  /** Language reported by the browser/device on first visit. */
  browserLang: Lang;
  hydrated: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [browserLang, setBrowserLang] = useState<Lang>("fr");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    const detected = detectBrowserLang();
    setBrowserLang(detected);
    if (stored === "fr" || stored === "en") setLangState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang, opts?: { persist?: boolean }) => {
    setLangState(next);
    if (opts?.persist !== false && typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: makeT(lang), browserLang, hydrated }),
    [lang, setLang, browserLang, hydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: "fr", setLang: () => {}, t: makeT("fr"), browserLang: "fr", hydrated: false };
  return ctx;
}

/** Shortcut: only the translate function. */
export function useT(): TFunction {
  return useI18n().t;
}
