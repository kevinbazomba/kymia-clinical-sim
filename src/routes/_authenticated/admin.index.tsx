import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminStats } from "@/lib/admin.functions";
import { Loader2, Users, BadgeCheck, Ban, ClockAlert, Activity, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

interface Stats {
  total_users?: number;
  active_subs?: number;
  expired_subs?: number;
  suspended_subs?: number;
  total_consultations?: number;
  completed_consultations?: number;
  by_specialty?: Record<string, number>;
  top_users?: Array<{ id: string; display_name: string; total_score: number; consultations_count: number }>;
}

function AdminDashboard() {
  const fn = useServerFn(adminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fn(),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const s = (data ?? {}) as Stats;
  const cards = [
    { label: "Utilisateurs", value: s.total_users ?? 0, icon: <Users className="h-4 w-4" /> },
    { label: "Abonnements actifs", value: s.active_subs ?? 0, icon: <BadgeCheck className="h-4 w-4 text-emerald-400" /> },
    { label: "Abonnements expirés", value: s.expired_subs ?? 0, icon: <ClockAlert className="h-4 w-4 text-amber-400" /> },
    { label: "Suspendus", value: s.suspended_subs ?? 0, icon: <Ban className="h-4 w-4 text-red-400" /> },
    { label: "Consultations totales", value: s.total_consultations ?? 0, icon: <Activity className="h-4 w-4 text-primary" /> },
    { label: "Consultations terminées", value: s.completed_consultations ?? 0, icon: <Activity className="h-4 w-4 text-primary" /> },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
              {c.icon}{c.label}
            </div>
            <p className="mt-3 font-serif text-3xl text-white">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="font-serif text-lg text-white">Répartition par spécialité</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(s.by_specialty ?? {}).length === 0 && (
              <p className="text-sm text-slate-400">Aucune consultation encore.</p>
            )}
            {Object.entries(s.by_specialty ?? {})
              .sort((a, b) => b[1] - a[1])
              .map(([spec, count]) => {
                const total = Object.values(s.by_specialty ?? {}).reduce((a, b) => a + b, 0);
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={spec}>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="capitalize">{spec.replace(/_/g, " ")}</span>
                      <span>{count} · {pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg text-white">
            <Trophy className="h-4 w-4 text-amber-400" /> Utilisateurs les plus actifs
          </h2>
          <div className="mt-3 space-y-2">
            {(s.top_users ?? []).length === 0 && (
              <p className="text-sm text-slate-400">Aucune activité encore.</p>
            )}
            {(s.top_users ?? []).map((u, i) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-slate-200">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-xs">{i + 1}</span>
                  {u.display_name || "—"}
                </span>
                <span className="text-xs text-slate-400">{u.consultations_count} consult. · {u.total_score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
