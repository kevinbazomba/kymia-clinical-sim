import { useState } from "react";
import { GraduationCap, Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const REVISION_RESOURCE_URL = "https://draworfit.mychariow.com/prd_58zuymo2";

export function PedagogicalCoachDialog({
  open,
  onContinue,
  onDisableReminder,
}: {
  open: boolean;
  onContinue: () => void | Promise<void>;
  onDisableReminder: () => Promise<void>;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);

  async function savePreference() {
    if (dontRemind) {
      try {
        await onDisableReminder();
      } catch {
        toast.error("Impossible d’enregistrer cette préférence. Réessaie plus tard.");
      }
    }
  }

  async function continueConsultation() {
    await savePreference();
    await onContinue();
  }

  async function openRevision() {
    await savePreference();
    setReviewOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) void continueConsultation(); }}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl border-primary/20 bg-card p-0 shadow-[var(--shadow-elegant)]">
          <div className="relative overflow-hidden p-5 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-28 bg-[image:var(--gradient-hero)] opacity-70" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"><Stethoscope className="h-7 w-7" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Docteur Kymia</p><DialogTitle className="mt-1 font-serif text-2xl">Un moment pour mieux progresser</DialogTitle></div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                <p className="font-medium text-foreground">Bravo pour ton engagement ! 👏</p>
                <p>L’objectif de Kymia n’est pas de multiplier les consultations, mais de progresser après chacune d’elles.</p>
                <p>Une consultation est utile lorsqu’elle t’aide à identifier tes lacunes, comprendre tes erreurs et revenir mieux préparé.</p>
                <p>Prends quelques minutes pour réviser les notions qui te posent problème, puis reviens mettre tes connaissances à l’épreuve.</p>
                <p className="rounded-xl bg-secondary/70 p-3 text-center font-medium text-foreground">Consulter → comprendre ses erreurs → réviser → revenir plus fort. 🩺📚</p>
              </div>
              <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox checked={dontRemind} onCheckedChange={(checked) => setDontRemind(checked === true)} />
                Ne plus me rappeler
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-11 border-primary/30" onClick={() => void openRevision()}><GraduationCap className="mr-2 h-4 w-4" />Aller réviser</Button>
                <Button className="h-11" onClick={() => void continueConsultation()}>Poursuivre la consultation <Sparkles className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="flex h-[88vh] max-w-5xl flex-col rounded-2xl p-4 sm:p-6">
          <DialogHeader><DialogTitle className="font-serif text-xl">Révision avec le Docteur Kymia</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Votre ressource s’ouvre ici ; fermez ce panneau pour revenir à Kymia.</p>
          <iframe title="Ressource de révision Kymia" src={REVISION_RESOURCE_URL} className="min-h-0 w-full flex-1 rounded-xl border bg-white" />
        </DialogContent>
      </Dialog>
    </>
  );
}
