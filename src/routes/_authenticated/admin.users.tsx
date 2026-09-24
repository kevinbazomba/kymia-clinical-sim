import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListUsers, adminUpsertSubscription, adminExtendSubscriptions, adminSubscriptionHistory, adminSuspendSubscription, adminDeleteUser, adminSetUserSuspended,
} from "@/lib/admin.functions";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Search, Trash2, Ban, BadgeCheck, Plus, Download, FileText, ShieldOff, ShieldCheck, CalendarPlus, History,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

interface Row {
  id: string;
  email: string;
  display_name: string | null;
  country: string | null;
  whatsapp: string | null;
  profession: string | null;
  total_score: number;
  consultations_count: number;
  free_trial_used: number;
  is_suspended: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  sub_status: string | null;
  sub_plan: string | null;
  sub_expires_at: string | null;
}

type Filter =
  | "all"
  | "consult_0" | "consult_1" | "consult_trial_exhausted" | "consult_gt_2"
  | "sub_active" | "sub_suspended" | "user_free" | "user_suspended";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "consult_0", label: "0 consultation" },
  { id: "consult_1", label: "1 consultation" },
  { id: "consult_trial_exhausted", label: "2 gratuites (quota atteint)" },
  { id: "consult_gt_2", label: "Plus de 2" },
  { id: "sub_active", label: "Abonnement actif" },
  { id: "sub_suspended", label: "Abonnement suspendu" },
  { id: "user_free", label: "Utilisateurs gratuits" },
  { id: "user_suspended", label: "Compte suspendu" },
];

function AdminUsers() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const upsert = useServerFn(adminUpsertSubscription);
  const extend = useServerFn(adminExtendSubscriptions);
  const historyFn = useServerFn(adminSubscriptionHistory);
  const suspend = useServerFn(adminSuspendSubscription);
  const del = useServerFn(adminDeleteUser);
  const setSuspended = useServerFn(adminSetUserSuspended);

  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-users", applied],
    queryFn: () => list({ data: { search: applied } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const suspendMut = useMutation({
    mutationFn: async (userId: string) => suspend({ data: { user_id: userId } }),
    onSuccess: () => { toast.success("Abonnement suspendu"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const setSuspendedMut = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) =>
      setSuspended({ data: { user_id: id, suspended: val } }),
    onSuccess: (_, v) => { toast.success(v.val ? "Compte suspendu" : "Compte réactivé"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const delMut = useMutation({
    mutationFn: async (userId: string) => del({ data: { user_id: userId, confirm: "DELETE" as const } }),
    onSuccess: () => { toast.success("Utilisateur supprimé"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const allRows = (data ?? []) as Row[];
  const rows = useMemo(() => filterRows(allRows, filter), [allRows, filter]);
  const { data: history = [] } = useQuery({ queryKey: ["subscription-history"], queryFn: () => historyFn({ data: {} }) });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); setApplied(search.trim()); }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou adresse e-mail"
            className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button type="submit">Rechercher</Button>
        <Button type="button" variant="outline" onClick={() => { setSearch(""); setApplied(""); setFilter("all"); refetch(); }} className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
          Réinitialiser
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f.id
                ? "border-primary bg-primary/20 text-primary"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{rows.length} utilisateur{rows.length > 1 ? "s" : ""}</span>
        <Button size="sm" variant="outline" onClick={() => exportCSV(rows)} className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
          <Download className="mr-1 h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportPDF(rows)} className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
          <FileText className="mr-1 h-3.5 w-3.5" /> PDF
        </Button>
        <BulkExtensionDialog
          users={allRows}
          selectedIds={selected}
          onSubmit={async (ids, days, notes) => {
            const result = await extend({ data: { user_ids: ids, days, notes, bulk: true } });
            toast.success(`${result.count} abonnement${result.count > 1 ? "s" : ""} prolongé${result.count > 1 ? "s" : ""}`);
            invalidate(); qc.invalidateQueries({ queryKey: ["subscription-history"] });
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="w-10 px-3 py-3"><input aria-label="Sélectionner tous les utilisateurs filtrés" type="checkbox" checked={rows.length > 0 && rows.every((u) => selected.includes(u.id))} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...rows.map((u) => u.id)])) : selected.filter((id) => !rows.some((u) => u.id === id)))} /></th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Profession</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="px-4 py-3">Dernière connexion</th>
              <th className="px-4 py-3">Abonnement</th>
              <th className="px-4 py-3">Consultations</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || isFetching) && (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            )}
            {!isLoading && !isFetching && rows.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Aucun utilisateur.</td></tr>
            )}
            {rows.map((u) => {
              const active = (u.sub_status === "active" || u.sub_status === "free") && (!u.sub_expires_at || new Date(u.sub_expires_at) > new Date());
              return (
                <tr key={u.id} className="border-b border-slate-800 last:border-0">
                  <td className="px-3 py-3"><input aria-label={`Sélectionner ${u.email}`} type="checkbox" checked={selected.includes(u.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, u.id] : ids.filter((id) => id !== u.id))} /></td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">
                      {u.display_name || "—"}
                      {u.is_suspended && <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">SUSPENDU</span>}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{u.whatsapp || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{u.profession || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.sub_status ? (
                      <div className="space-y-0.5">
                        <SubBadge status={u.sub_status} active={active} />
                        <p className="text-[11px] text-slate-400">
                          {u.sub_plan ?? "standard"} {u.sub_expires_at && `· expire ${new Date(u.sub_expires_at).toLocaleDateString("fr-FR")}`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Gratuit</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {u.consultations_count} · <span className="text-slate-500">essai {u.free_trial_used}/2</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <SubscriptionDialog
                        user={u}
                        onSubmit={async (v) => {
                          await upsert({ data: { user_id: u.id, ...v } });
                          toast.success("Abonnement mis à jour");
                          invalidate();
                        }}
                      />
                      <ExtensionDialog user={u} onSubmit={async (days, notes) => {
                        await extend({ data: { user_ids: [u.id], days, notes, bulk: false } });
                        toast.success("Abonnement prolongé"); invalidate(); qc.invalidateQueries({ queryKey: ["subscription-history"] });
                      }} />
                      {u.sub_status === "active" && (
                        <Button size="sm" variant="ghost" className="text-amber-300 hover:bg-amber-500/10"
                          onClick={() => suspendMut.mutate(u.id)} disabled={suspendMut.isPending} title="Suspendre l'abonnement">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost"
                        className={u.is_suspended ? "text-emerald-300 hover:bg-emerald-500/10" : "text-orange-300 hover:bg-orange-500/10"}
                        onClick={() => setSuspendedMut.mutate({ id: u.id, val: !u.is_suspended })}
                        title={u.is_suspended ? "Réactiver le compte" : "Suspendre le compte (modération)"}
                      >
                        {u.is_suspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      </Button>
                      <DeleteDialog
                        userLabel={u.display_name || u.email}
                        onConfirm={() => delMut.mutate(u.id)}
                        loading={delMut.isPending}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SubscriptionHistory rows={history} users={allRows} />
    </div>
  );
}

function filterRows(rows: Row[], f: Filter): Row[] {
  const isActive = (u: Row) => (u.sub_status === "active" || u.sub_status === "free") && (!u.sub_expires_at || new Date(u.sub_expires_at) > new Date());
  switch (f) {
    case "consult_0": return rows.filter((u) => u.consultations_count === 0);
    case "consult_1": return rows.filter((u) => u.consultations_count === 1);
    case "consult_trial_exhausted": return rows.filter((u) => u.free_trial_used >= 2 && !isActive(u));
    case "consult_gt_2": return rows.filter((u) => u.consultations_count > 2);
    case "sub_active": return rows.filter(isActive);
    case "sub_suspended": return rows.filter((u) => u.sub_status === "suspended");
    case "user_free": return rows.filter((u) => u.sub_status === "free" || !u.sub_status);
    case "user_suspended": return rows.filter((u) => u.is_suspended);
    default: return rows;
  }
}

function exportCSV(rows: Row[]) {
  const headers = ["Nom", "Email", "WhatsApp", "Profession", "Consultations", "Statut"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((u) => [
      u.display_name ?? "",
      u.email,
      u.whatsapp ?? "",
      u.profession ?? "",
      u.consultations_count,
      u.is_suspended ? "Suspendu" : (u.sub_status === "active" ? "Abonné" : "Gratuit"),
    ].map(escape).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `kymia-utilisateurs-${new Date().toISOString().slice(0,10)}.csv`);
}

function exportPDF(rows: Row[]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Utilisateurs Kymia</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f4f4f5}
    .muted{color:#666;font-size:11px;margin-bottom:16px}
  </style></head><body>
  <h1>Utilisateurs Kymia</h1>
  <p class="muted">${rows.length} utilisateur(s) · exporté le ${new Date().toLocaleString("fr-FR")}</p>
  <table><thead><tr>
    <th>Nom</th><th>Email</th><th>WhatsApp</th><th>Profession</th><th>Consultations</th><th>Statut</th>
  </tr></thead><tbody>
  ${rows.map((u) => `<tr>
    <td>${escapeHtml(u.display_name ?? "")}</td>
    <td>${escapeHtml(u.email)}</td>
    <td>${escapeHtml(u.whatsapp ?? "")}</td>
    <td>${escapeHtml(u.profession ?? "")}</td>
    <td>${u.consultations_count}</td>
    <td>${u.is_suspended ? "Suspendu" : (u.sub_status === "active" ? "Abonné" : "Gratuit")}</td>
  </tr>`).join("")}
  </tbody></table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Impossible d'ouvrir la fenêtre d'impression"); return; }
  w.document.write(html); w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

function SubBadge({ status, active }: { status: string; active: boolean }) {
  const cls = active
    ? "bg-emerald-500/15 text-emerald-300"
    : status === "suspended"
      ? "bg-red-500/15 text-red-300"
      : "bg-slate-500/15 text-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <BadgeCheck className="h-3 w-3" />
      {active ? "Actif" : status === "suspended" ? "Suspendu" : "Expiré"}
    </span>
  );
}

function SubscriptionDialog({
  user, onSubmit,
}: {
  user: Row;
  onSubmit: (v: { plan: string; duration_days: number; status: "active" | "suspended" | "expired" | "free"; notes?: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(user.sub_plan ?? "standard");
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<"active" | "suspended" | "expired" | "free">("active");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-emerald-300 hover:bg-emerald-500/10" title="Ajouter/modifier l'abonnement">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonnement — {user.display_name || user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Formule</Label>
            <Input value={plan} onChange={(e) => setPlan(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Durée attribuée (jours)</Label>
              <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(parseInt(e.target.value || "1", 10))} />
            </div>
            <div>
              <Label>Statut</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "suspended" | "expired" | "free")}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
                <option value="expired">Expiré</option>
                <option value="free">Gratuit (offert)</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Notes (optionnel)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              setLoading(true);
              try {
                await onSubmit({ plan, duration_days: days, status, notes: notes || undefined });
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Impossible d'attribuer l'abonnement");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtensionDialog({ user, onSubmit }: { user: Row; onSubmit: (days: number, notes?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false); const [days, setDays] = useState(7); const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="ghost" className="text-sky-300 hover:bg-sky-500/10" title="Ajouter des jours"><CalendarPlus className="h-3.5 w-3.5" /></Button></DialogTrigger><DialogContent>
    <DialogHeader><DialogTitle>Prolonger l’abonnement — {user.display_name || user.email}</DialogTitle></DialogHeader>
    <p className="text-sm text-muted-foreground">Expiration actuelle : {user.sub_expires_at ? new Date(user.sub_expires_at).toLocaleDateString("fr-FR") : "aucune"}. Si l’accès est expiré, les jours partent d’aujourd’hui.</p>
    <div className="space-y-3"><div><Label>Ajouter des jours</Label><Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(parseInt(e.target.value || "1", 10))} /></div><div><Label>Motif / commentaire (optionnel)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div>
    <DialogFooter><Button disabled={loading} onClick={async () => { setLoading(true); try { await onSubmit(days, notes || undefined); setOpen(false); } finally { setLoading(false); } }}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Appliquer la prolongation</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function BulkExtensionDialog({ users, selectedIds, onSubmit }: { users: Row[]; selectedIds: string[]; onSubmit: (ids: string[], days: number, notes?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false); const [scope, setScope] = useState("manual"); const [days, setDays] = useState(7); const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false);
  const ids = scope === "manual" ? selectedIds : users.filter((u) => scope === "free" ? u.sub_status === "free" || !u.sub_status : u.sub_status === scope).map((u) => u.id);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" className="bg-sky-600 text-white hover:bg-sky-700"><CalendarPlus className="mr-1 h-3.5 w-3.5" />Ajouter des jours à un groupe</Button></DialogTrigger><DialogContent>
    <DialogHeader><DialogTitle>Prolongation collective</DialogTitle></DialogHeader>
    <div className="space-y-3"><div><Label>Utilisateurs concernés</Label><select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="manual">Sélection manuelle ({selectedIds.length})</option><option value="free">Tous les utilisateurs Gratuit</option><option value="active">Tous les utilisateurs Premium / actifs</option><option value="suspended">Tous les abonnements suspendus</option><option value="expired">Tous les abonnements expirés</option></select><p className="mt-1 text-xs text-muted-foreground">{ids.length} utilisateur{ids.length !== 1 ? "s" : ""} seront concernés.</p></div><div><Label>Nombre de jours à ajouter</Label><Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(parseInt(e.target.value || "1", 10))} /></div><div><Label>Motif / commentaire (optionnel)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div>
    <DialogFooter><Button disabled={loading || ids.length === 0} onClick={async () => { setLoading(true); try { await onSubmit(ids, days, notes || undefined); setOpen(false); } finally { setLoading(false); } }}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}APPLIQUER LA PROLONGATION</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function SubscriptionHistory({ rows, users }: { rows: Array<{ id: string; user_id: string; administrator_id: string; action: string; days_added: number; previous_expires_at: string | null; new_expires_at: string; comment: string | null; created_at: string }>; users: Row[] }) {
  const labels = new Map(users.map((u) => [u.id, u.display_name || u.email]));
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><h2 className="flex items-center gap-2 font-serif text-xl text-slate-100"><History className="h-5 w-5 text-primary" />Historique des abonnements</h2><div className="mt-3 max-h-80 overflow-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="text-slate-400"><tr><th className="pb-2">Date</th><th className="pb-2">Utilisateur</th><th className="pb-2">Administrateur</th><th className="pb-2">Ajout</th><th className="pb-2">Ancienne expiration</th><th className="pb-2">Nouvelle expiration</th><th className="pb-2">Commentaire</th></tr></thead><tbody>{rows.map((h) => <tr key={h.id} className="border-t border-slate-800 text-slate-300"><td className="py-2">{new Date(h.created_at).toLocaleString("fr-FR")}</td><td>{labels.get(h.user_id) || h.user_id}</td><td>{labels.get(h.administrator_id) || h.administrator_id}</td><td>+{h.days_added} jour{h.days_added !== 1 ? "s" : ""}</td><td>{h.previous_expires_at ? new Date(h.previous_expires_at).toLocaleDateString("fr-FR") : "—"}</td><td>{new Date(h.new_expires_at).toLocaleDateString("fr-FR")}</td><td>{h.comment || "—"}</td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="py-5 text-center text-slate-500">Aucune modification enregistrée.</td></tr>}</tbody></table></div></section>;
}

function DeleteDialog({ userLabel, onConfirm, loading }: { userLabel: string; onConfirm: () => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" title="Supprimer">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer {userLabel} ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cette action est <strong>irréversible</strong>. Tapez <code className="rounded bg-secondary px-1">SUPPRIMER</code> pour confirmer.
        </p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SUPPRIMER" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            variant="destructive"
            disabled={confirm !== "SUPPRIMER" || loading}
            onClick={() => { onConfirm(); setOpen(false); setConfirm(""); }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
