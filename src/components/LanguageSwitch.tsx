import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyLanguage, setMyLanguage } from "@/lib/language.functions";
import { LANG_PROMPT_KEY, useI18n, type Lang } from "@/lib/i18n";

/**
 * Keeps the local language preference in sync with the stored profile
 * preference. Language is only a preference: no other user data is touched.
 */
export function useLanguagePreference() {
  const { lang, setLang, t } = useI18n();
  const getFn = useServerFn(getMyLanguage);
  const setFn = useServerFn(setMyLanguage);
  const qc = useQueryClient();
  const [synced, setSynced] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // The language server functions require auth: only call them with a session.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const q = useQuery({
    queryKey: ["my-language"],
    queryFn: () => getFn(),
    enabled: signedIn,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // On first load, the profile preference wins over the local default.
  useEffect(() => {
    if (synced || !q.data) return;
    setSynced(true);
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("kymia.lang") : null;
    if (!stored && q.data.language !== lang) setLang(q.data.language);
  }, [q.data, synced, lang, setLang]);

  const mut = useMutation({
    mutationFn: (next: Lang) => setFn({ data: { language: next } }),
    onSuccess: (_r, next) => {
      qc.setQueryData(["my-language"], { language: next });
      toast.success(t("common.language.saved"));
    },
  });

  function changeLanguage(next: Lang) {
    if (next === lang) return;
    setLang(next);
    if (signedIn) mut.mutate(next);
  }

  return { lang, changeLanguage, saving: mut.isPending };
}

/** Compact "🇫🇷 FR | 🇬🇧 EN" switch. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, changeLanguage } = useLanguagePreference();
  const options: Array<{ value: Lang; label: string }> = [
    { value: "fr", label: "🇫🇷 FR" },
    { value: "en", label: "🇬🇧 EN" },
  ];
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border bg-background p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => changeLanguage(o.value)}
          aria-pressed={lang === o.value}
          className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
            lang === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Full settings card used in the Profile page. */
export function LanguageSettings() {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-2 font-serif text-2xl">
        <Globe className="h-5 w-5 text-primary" /> {t("common.language.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("common.language.description")}</p>
      <div className="mt-4">
        <LanguageSwitch />
      </div>
    </section>
  );
}

/** First-visit proposal shown to users whose device is in English. */
export function LanguageDetectDialog() {
  const { t, lang, browserLang, hydrated } = useI18n();
  const { changeLanguage } = useLanguagePreference();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const prompted = window.localStorage.getItem(LANG_PROMPT_KEY);
    const chosen = window.localStorage.getItem("kymia.lang");
    if (!prompted && !chosen && browserLang === "en" && lang === "fr") setOpen(true);
  }, [hydrated, browserLang, lang]);

  function dismiss() {
    window.localStorage.setItem(LANG_PROMPT_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="font-serif text-xl text-foreground">{t("common.language.detect.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.language.detect.description")}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => {
              changeLanguage("en");
              dismiss();
            }}
          >
            {t("common.language.detect.useEnglish")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={dismiss}>
            {t("common.language.detect.continueFrench")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Discreet, dismissible banner on the home page. */
export function LanguageHomeBanner() {
  const { t, lang, hydrated } = useI18n();
  const { changeLanguage } = useLanguagePreference();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    const hidden = window.localStorage.getItem("kymia.lang.banner") === "1";
    const chosen = window.localStorage.getItem("kymia.lang");
    setDismissed(hidden || Boolean(chosen));
  }, [hydrated]);

  if (dismissed) return null;
  const target: Lang = lang === "fr" ? "en" : "fr";

  function hide() {
    window.localStorage.setItem("kymia.lang.banner", "1");
    setDismissed(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-secondary/40 px-4 py-3 text-sm">
      <Globe className="h-4 w-4 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{t("common.language.banner.title")}</p>
        <p className="text-xs text-muted-foreground">{t("common.language.banner.description")}</p>
      </div>
      <Button
        size="sm"
        onClick={() => {
          changeLanguage(target);
          hide();
        }}
      >
        {target === "en" ? t("common.language.switchToEnglish") : t("common.language.switchToFrench")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("common.actions.close")}
        onClick={hide}
        className="min-h-9 min-w-9"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
