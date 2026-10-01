import { useState } from "react";
import { ArrowLeft, BookOpen, Stethoscope } from "lucide-react";
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
    if (!dontRemind) return;
    try {
      await onDisableReminder();
    } catch {
      toast.error("Impossible d’enregistrer cette préférence. Réessaie plus tard.");
    }
  }

  async function continueConsultation() {
    await savePreference();
    setReviewOpen(false);
    await onContinue();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void continueConsultation(); }}>
      <DialogContent className={`max-h-[92vh] overflow-y-auto rounded-3xl border-primary/20 bg-card p-0 shadow-[var(--shadow-elegant)] ${reviewOpen ? "max-w-5xl" : "max-w-xl"}`}>
        {reviewOpen ? (
          <div className="flex h-[85vh] flex-col p-4 sm:p-6">
            <DialogHeader className="mb-3 flex-row items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Retour au rappel" onClick={() => setReviewOpen(false)}><ArrowLeft className="h-4 w-4" /></Button>
              <DialogTitle className="font-serif text-xl">Livres de Médecine</DialogTitle>
            </DialogHeader>
            <iframe title="Livres de Médecine" src={REVISION_RESOURCE_URL} className="min-h-0 w-full flex-1 rounded-xl border bg-white" />
          </div>
        ) : (
          <div className="relative overflow-hidden p-5 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-28 bg-[image:var(--gradient-hero)] opacity-70" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"><Stethoscope className="h-7 w-7" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Docteur Kymia</p><DialogHeader><DialogTitle className="mt-1 font-serif text-2xl">Un rappel pour mieux progresser</DialogTitle></DialogHeader></div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                <p>La priorité n’est pas de multiplier les consultations, mais de progresser grâce aux révisions avant de revenir.</p>
                <p>Reprends les notions à travailler dans tes corrections et tes livres de médecine, puis reviens mettre tes connaissances à l’épreuve.</p>
              </div>
              <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox checked={dontRemind} onCheckedChange={(checked) => setDontRemind(checked === true)} />
                Ne plus me rappeler
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-11 border-primary/30" onClick={() => setReviewOpen(true)}><BookOpen className="mr-2 h-4 w-4" />Livres de Médecine</Button>
                <Button className="h-11" onClick={() => void continueConsultation()}>Compris</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
