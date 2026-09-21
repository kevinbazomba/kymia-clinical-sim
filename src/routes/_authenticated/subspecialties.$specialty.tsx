import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createConsultation } from "@/lib/consultation.functions";
import { INTERNAL_SUBSPECIALTIES, subspecialtyLabel, subspecialtyDescription } from "@/lib/subspecialties";
import { getSpecialty, specialtyLabel } from "@/lib/specialties";
import { useState, type ComponentType } from "react";
import {
  Loader2, AlertTriangle, HeartPulse, Wind, Droplets, Utensils, Leaf, TestTube,
  Activity, Bug, Bone, Brain, ShieldCheck, Ribbon, GraduationCap, Award,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  HeartPulse, Wind, Droplets, Utensils, Leaf, TestTube, Activity, Bug, Bone, Brain, ShieldCheck, Ribbon,
};
const WHATSAPP_URL = "https://wa.me/243990918446";

export const Route = createFileRoute("/_authenticated/subspecialties/$specialty")({
  head: () => {
    const t = makeT(getStoredLang());
    return { meta: [{ title: `${t("consultation.subspecialties.title")} — Kymia` }] };
  },
  component: SubspecialtiesPage,
});

function SubspecialtiesPage() {
  const { t, lang } = useI18n();
  const { specialty } = Route.useParams();
  const navigate = useNavigate();
  const create = useServerFn(createConsultation);
  const [pending, setPending] = useState<string | null>(null);
  const [pickCycle, setPickCycle] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const spec = getSpecialty(specialty);

  if (specialty !== "medecine_interne") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t("consultation.subspecialties.noSubspecialties")}</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/specialties" })}>{t("consultation.subspecialties.backToSpecialties")}</Button>
      </div>
    );
  }

  async function launch(subId: string, cycle: "premier" | "second") {
    setPending(subId);
    try {
      const { id } = await create({ data: { specialty, subspecialty: subId, cycle } });
      navigate({ to: "/consultation/$id", params: { id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("consultation.errors.generic");
      if (msg.includes("FREE_TRIAL_EXHAUSTED") || msg.includes("SUBSCRIPTION_EXPIRED")) {
        navigate({ to: "/premium" }); return;
      }
      if (msg.includes("SUBSCRIPTION_INACTIVE")) { setBlocked(true); setPending(null); return; }
      if (msg.includes("429")) toast.error(t("consultation.errors.tooManyRequestsShort"));
      else if (msg.includes("402")) toast.error(t("consultation.errors.aiCreditsExhaustedShort"));
      else toast.error(msg);
      setPending(null);
    }
  }

  return (
    <>
      <Dialog open={blocked} onOpenChange={setBlocked}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />{t("consultation.subscription.inactive.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("consultation.subscription.inactive.body")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlocked(false)}>{t("consultation.subscription.later")}</Button>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700">{t("consultation.subscription.contactAdmin")}</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CycleDialog
        open={!!pickCycle}
        onClose={() => setPickCycle(null)}
        onChoose={(c) => { const sub = pickCycle!; setPickCycle(null); launch(sub, c); }}
      />

      <div className="space-y-8">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">{spec ? specialtyLabel(spec.id, lang) : t("consultation.subspecialties.defaultSpecialtyLabel")}</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">{t("consultation.subspecialties.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("consultation.subspecialties.subtitle")}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTERNAL_SUBSPECIALTIES.map((s) => {
            const Icon = ICONS[s.icon];
            const isPending = pending === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setPickCycle(s.id)}
                disabled={pending !== null}
                className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-glow" />
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
                  {Icon ? <Icon className="h-6 w-6" /> : null}
                </div>
                <h3 className="mt-4 font-serif text-xl text-foreground">{subspecialtyLabel(s.id, lang)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{subspecialtyDescription(s.id, lang)}</p>
                <div className="mt-5 flex items-center text-sm font-medium text-primary">
                  {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("consultation.subspecialties.aiPreparingCase")}</>) : t("consultation.subspecialties.choose")}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate({ to: "/specialties" })}>← {t("consultation.subspecialties.backToSpecialties")}</Button>
        </div>
      </div>
    </>
  );
}

export function CycleDialog({
  open, onClose, onChoose,
}: { open: boolean; onClose: () => void; onChoose: (c: "premier" | "second") => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t("consultation.cycleDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onChoose("premier")}
            className="group rounded-2xl border-2 border-transparent bg-secondary/40 p-5 text-left transition hover:border-primary hover:shadow-[var(--shadow-card)]"
          >
            <GraduationCap className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-serif text-lg">{t("consultation.cycleDialog.premier.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("consultation.cycleDialog.premier.description", { mentor: "Dr Mekah" })}
            </p>
          </button>
          <button
            onClick={() => onChoose("second")}
            className="group rounded-2xl border-2 border-transparent bg-secondary/40 p-5 text-left transition hover:border-primary hover:shadow-[var(--shadow-card)]"
          >
            <Award className="h-8 w-8 text-gold" />
            <h3 className="mt-3 font-serif text-lg">{t("consultation.cycleDialog.second.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("consultation.cycleDialog.second.description")}
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
