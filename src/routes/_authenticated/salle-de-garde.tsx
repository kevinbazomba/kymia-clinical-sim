import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGuardSpecialties } from "@/lib/salle-de-garde.functions";
import { Baby, Brain, HeartPulse, MessageCircle, Scissors, Siren, Stethoscope, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/salle-de-garde")({ component: GuardHome });

const icons: Record<string, typeof Stethoscope> = { HeartPulse, Scissors, Baby, Brain, Siren, Stethoscope };

function GuardHome() {
  const getSpecialties = useServerFn(listGuardSpecialties);
  const { data, isLoading } = useQuery({ queryKey: ["guard-specialties"], queryFn: () => getSpecialties() });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-violet-500/10 p-7 shadow-[var(--shadow-card)] md:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground"><Stethoscope className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Communauté Kymia</p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Salle de garde</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">Discutez. Questionnez. Argumentez. Apprenez.</p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-foreground/85">Bienvenue dans la Salle de garde 🩺 Un espace pour questionner, discuter, argumenter et apprendre ensemble. Une question ? Un cas clinique ? Une controverse scientifique ? Lancez la discussion.</p>
      </section>

      <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-foreground/80">⚠️ Les discussions de la Salle de garde ont une vocation pédagogique et scientifique. Elles ne remplacent pas l’avis d’un professionnel prenant en charge un patient réel.</p>

      <section>
        <div className="mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><h2 className="font-serif text-2xl">Choisissez une spécialité</h2></div>
        {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-secondary" />)}</div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((specialty) => {
              const Icon = icons[specialty.icon] ?? Stethoscope;
              return <Link key={specialty.id} to="/salle-de-garde/$specialty" params={{ specialty: specialty.id }} className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-serif text-xl">{specialty.name}</h3><p className="mt-1 min-h-10 text-xs text-muted-foreground">{specialty.description}</p>
                <div className="mt-5 flex gap-4 text-xs text-muted-foreground"><span><MessageCircle className="mr-1 inline h-3.5 w-3.5" />{specialty.discussions_count} discussion{specialty.discussions_count > 1 ? "s" : ""}</span><span><Users className="mr-1 inline h-3.5 w-3.5" />{specialty.participants_count} participant{specialty.participants_count > 1 ? "s" : ""}</span></div>
              </Link>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
