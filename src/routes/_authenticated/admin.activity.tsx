import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Activity, Loader2, MessageCircle, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminActivityUsers,
  adminSendUserMessage,
  adminSetUserRating,
} from "@/lib/admin-activity.functions";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: AdminActivity,
});

type ActivityUser = Awaited<ReturnType<typeof adminActivityUsers>>[number];
type Rating = "nul" | "moyen" | "excellent";
const ratingLabels: Record<Rating, { label: string; emoji: string; style: string }> = {
  nul: { label: "Nul", emoji: "😕", style: "text-rose-300" },
  moyen: { label: "Moyen", emoji: "😐", style: "text-amber-300" },
  excellent: { label: "Excellent", emoji: "🌟", style: "text-emerald-300" },
};

function AdminActivity() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminActivityUsers);
  const ratingFn = useServerFn(adminSetUserRating);
  const sendFn = useServerFn(adminSendUserMessage);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [target, setTarget] = useState<ActivityUser | null>(null);
  const [message, setMessage] = useState("");
  const usersQuery = useQuery({
    queryKey: ["admin-activity-users", appliedSearch],
    queryFn: () => listFn({ data: { search: appliedSearch } }),
    refetchInterval: 30_000,
  });
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const totals = useMemo(
    () =>
      users.reduce(
        (acc, user) => ({
          online: acc.online + Number(user.is_online),
          last24h: acc.last24h + user.consultations_24h,
          last30d: acc.last30d + user.consultations_30d,
        }),
        { online: 0, last24h: 0, last30d: 0 },
      ),
    [users],
  );

  const ratingMutation = useMutation({
    mutationFn: ({ user_id, rating }: { user_id: string; rating: Rating | null }) =>
      ratingFn({ data: { user_id, rating } }),
    onSuccess: () => {
      toast.success("Évaluation enregistrée");
      qc.invalidateQueries({ queryKey: ["admin-activity-users"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Impossible d’enregistrer l’évaluation.",
      ),
  });
  const messageMutation = useMutation({
    mutationFn: () =>
      target
        ? sendFn({ data: { user_id: target.id, message: message.trim() } })
        : Promise.reject(new Error("Utilisateur introuvable")),
    onSuccess: () => {
      toast.success("Message envoyé dans les notifications de l’utilisateur.");
      setTarget(null);
      setMessage("");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé."),
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Suivi des comptes actifs et gratuits
        </p>
        <h1 className="mt-1 font-serif text-3xl text-white">Activité des utilisateurs</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Consultez leur présence et leur volume d’entraînement. « En ligne » signifie que
          l’application a signalé une activité au cours des deux dernières minutes.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Comptes actifs / gratuits"
          value={users.length}
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          title="En ligne maintenant"
          value={totals.online}
          icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />}
        />
        <SummaryCard
          title="Consultations · 24 h / 30 j"
          value={`${totals.last24h} / ${totals.last30d}`}
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Chercher par nom ou e-mail"
            className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button type="submit">Rechercher</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearch("");
            setAppliedSearch("");
          }}
        >
          Effacer
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="border-b border-slate-800 bg-slate-900 text-left text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-3 py-3">Présence</th>
              <th className="px-3 py-3 text-center">24 h</th>
              <th className="px-3 py-3 text-center">30 jours</th>
              <th className="px-3 py-3 text-center">Terminées · 30 j</th>
              <th className="px-3 py-3 text-center">Moyenne · 30 j</th>
              <th className="px-3 py-3">Évaluation</th>
              <th className="px-3 py-3 text-right">Message</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!usersQuery.isLoading && users.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Aucun compte avec un abonnement actif ou gratuit.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-100">{user.display_name || "Utilisateur"}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {user.sub_status === "free" ? "Accès offert" : "Premium"}
                    {user.sub_expires_at
                      ? ` · expire le ${new Date(user.sub_expires_at).toLocaleDateString("fr-FR")}`
                      : ""}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs ${user.is_online ? "text-emerald-300" : "text-slate-400"}`}
                  >
                    <i
                      className={`h-2 w-2 rounded-full ${user.is_online ? "bg-emerald-400" : "bg-slate-600"}`}
                    />
                    {user.is_online ? "En ligne" : "Hors ligne"}
                  </span>
                  <p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">
                    {user.last_seen_at
                      ? `Vu ${new Date(user.last_seen_at).toLocaleString("fr-FR")}`
                      : "Jamais connecté dans l’app"}
                  </p>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-white">
                  {user.consultations_24h}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-white">
                  {user.consultations_30d}
                  <span className="block text-[10px] font-normal text-slate-500">
                    {user.consultations_total} au total
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-slate-200">{user.completed_30d}</td>
                <td className="px-3 py-3 text-center text-slate-200">
                  {user.average_score_30d == null ? "—" : `${user.average_score_30d}/100`}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {user.rating && (
                      <span aria-hidden="true" className="text-lg">
                        {ratingLabels[user.rating as Rating]?.emoji}
                      </span>
                    )}
                    <select
                      aria-label={`Évaluation de ${user.display_name || user.email}`}
                      value={user.rating ?? ""}
                      disabled={ratingMutation.isPending}
                      onChange={(event) =>
                        ratingMutation.mutate({
                          user_id: user.id,
                          rating: (event.target.value || null) as Rating | null,
                        })
                      }
                      className={`h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs ${user.rating ? ratingLabels[user.rating as Rating]?.style : "text-slate-400"}`}
                    >
                      <option value="">À évaluer</option>
                      <option value="nul">Nul</option>
                      <option value="moyen">Moyen</option>
                      <option value="excellent">Excellent</option>
                    </select>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                    onClick={() => {
                      setTarget(user);
                      setMessage("");
                    }}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Écrire
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open && !messageMutation.isPending) setTarget(null);
        }}
      >
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
            <DialogDescription className="text-slate-400">
              Le message apparaîtra dans la cloche de notification de{" "}
              {target?.display_name || target?.email}, signé Dr Kymia Motcho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-user-message" className="text-slate-200">
              Votre message
            </Label>
            <textarea
              id="admin-user-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={3000}
              rows={6}
              placeholder="Rédigez votre message…"
              className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="text-right text-xs text-slate-500">{message.length}/3000</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => messageMutation.mutate()}
              disabled={!message.trim() || messageMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              <Send className="mr-2 h-4 w-4" />
              {messageMutation.isPending ? "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        {title}
      </div>
      <p className="mt-2 font-serif text-3xl text-white">{value}</p>
    </div>
  );
}
