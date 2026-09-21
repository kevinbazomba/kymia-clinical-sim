import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createConsultation } from "@/lib/consultation.functions";
import { SPECIALTIES, specialtyLabel, specialtyDescription } from "@/lib/specialties";
import { useState } from "react";
import { Loader2, Stethoscope, Scissors, Baby, HeartPulse, Brain, Siren, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CycleDialog } from "./subspecialties.$specialty";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

const ICONS = { Stethoscope, Scissors, Baby, HeartPulse, Brain, Siren };
const WHATSAPP_URL = "https://wa.me/243990918446";

export const Route = createFileRoute("/_authenticated/specialties")({
  head: () => {
    const t = makeT(getStoredLang());
    return { meta: [{ title: `${t("consultation.specialties.title")} — Kymia` }] };
  },
  component: SpecialtiesPage,
});

function SpecialtiesPage() {
  const { t, lang } = useI18n();
  const create = useServerFn(createConsultation);
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<null | "suspended" | "account_suspended">(null);
  const [pickCycleFor, setPickCycleFor] = useState<string | null>(null);

  async function start(specialty: string, cycle: "premier" | "second") {
    setLoadingId(specialty);
    try {
      const { id } = await create({ data: { specialty, cycle } });
      navigate({ to: "/consultation/$id", params: { id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("consultation.errors.generic");
      if (msg.includes("FREE_TRIAL_EXHAUSTED") || msg.includes("SUBSCRIPTION_EXPIRED")) {
        navigate({ to: "/premium" }); return;
      }
      if (msg.includes("SUBSCRIPTION_SUSPENDED")) { setBlocked("suspended"); setLoadingId(null); return; }
      if (msg.includes("ACCOUNT_SUSPENDED")) { setBlocked("account_suspended"); setLoadingId(null); return; }
      if (msg.includes("429")) toast.error(t("consultation.errors.tooManyRequests"));
      else if (msg.includes("402")) toast.error(t("consultation.errors.aiCreditsExhausted"));
      else toast.error(msg);
      setLoadingId(null);
    }
  }

  function handleClick(specialty: string) {
    if (specialty === "medecine_interne") {
      navigate({ to: "/subspecialties/$specialty", params: { specialty } });
      return;
    }
    setPickCycleFor(specialty);
  }

  return (
    <>
      <Dialog open={blocked !== null} onOpenChange={(v) => !v && setBlocked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {blocked === "account_suspended" ? t("consultation.subscription.accountSuspended.title") : t("consultation.subscription.suspended.title")}
            </DialogTitle>
          </DialogHeader>
          {blocked === "account_suspended" ? (
            <p className="text-sm text-muted-foreground">
              {t("consultation.subscription.accountSuspended.body")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("consultation.subscription.suspended.body")}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlocked(null)}>{t("consultation.subscription.later")}</Button>
            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(t("consultation.subscription.reactivateMessage"))}`} target="_blank" rel="noopener noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700">{t("consultation.subscription.subscribeCta")}</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      <CycleDialog
        open={!!pickCycleFor}
        onClose={() => setPickCycleFor(null)}
        onChoose={(cycle) => { const s = pickCycleFor!; setPickCycleFor(null); start(s, cycle); }}
      />

      <div className="space-y-8">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("consultation.specialties.eyebrow")}</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">{t("consultation.specialties.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("consultation.specialties.subtitle")}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS];
            const isLoading = loadingId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleClick(s.id)}
                disabled={loadingId !== null}
                className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.accent}`} />
                <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${s.accent} text-primary-foreground shadow-[var(--shadow-soft)]`}>
                  {Icon ? <Icon className="h-6 w-6" /> : null}
                </div>
                <h3 className="mt-4 font-serif text-xl text-foreground">{specialtyLabel(s.id, lang)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{specialtyDescription(s.id, lang)}</p>
                <div className="mt-5 flex items-center text-sm font-medium text-primary">
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("consultation.specialties.aiPreparing")}</>
                  ) : s.id === "medecine_interne" ? (
                    <>{t("consultation.specialties.seeSubspecialties")}</>
                  ) : (
                    <>{t("consultation.specialties.start")}</>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
