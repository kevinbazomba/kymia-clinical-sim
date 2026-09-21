import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminCaseDiversity } from "@/lib/admin.functions";
import { SPECIALTIES } from "@/lib/specialties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shuffle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/diversity")({
  head: () => ({
    meta: [
      { title: "Diversité des cas cliniques — Administration Kymia" },
      { name: "description", content: "Suivi de la répartition des pathologies générées par Kymia Motcho." },
    ],
  }),
  component: DiversityPage,
});

function DiversityPage() {
  const fetchDiversity = useServerFn(adminCaseDiversity);
  const [specialty, setSpecialty] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-diversity", specialty],
    queryFn: () => fetchDiversity({ data: { specialty } }),
  });

  const rows = (data ?? []).filter((r) =>
    !search || r.pathology_label.toLowerCase().includes(search.toLowerCase()),
  );

  const specLabel = (id: string) => SPECIALTIES.find((s) => s.id === id)?.label ?? id;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20 text-primary">
          <Shuffle className="h-5 w-5" />
        </div>
        <div className="mr-auto">
          <h2 className="font-serif text-xl">Diversité des cas cliniques</h2>
          <p className="text-xs text-slate-400">Repérez les pathologies surreprésentées sur les 90 derniers jours.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={specialty === "" ? "default" : "outline"}
          onClick={() => setSpecialty("")}
          className={specialty === "" ? "" : "border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"}
        >
          Toutes
        </Button>
        {SPECIALTIES.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={specialty === s.id ? "default" : "outline"}
            onClick={() => setSpecialty(s.id)}
            className={specialty === s.id ? "" : "border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Input
        placeholder="Rechercher une pathologie…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Spécialité</th>
              <th className="px-3 py-2 text-left font-medium">Sous-spécialité</th>
              <th className="px-3 py-2 text-left font-medium">Pathologie</th>
              <th className="px-3 py-2 text-right font-medium">Générée</th>
              <th className="px-3 py-2 text-right font-medium">Fréquence</th>
              <th className="px-3 py-2 text-left font-medium">Dernière apparition</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Aucun cas enregistré pour l'instant.</td></tr>
            ) : rows.map((r) => (
              <tr key={`${r.specialty}-${r.subspecialty}-${r.pathology_key}`} className="border-t border-slate-800">
                <td className="px-3 py-2">{specLabel(r.specialty)}</td>
                <td className="px-3 py-2 text-slate-400">{r.subspecialty || "—"}</td>
                <td className="px-3 py-2">{r.pathology_label}</td>
                <td className="px-3 py-2 text-right font-medium">{r.times_generated}</td>
                <td className={`px-3 py-2 text-right ${r.share >= 15 ? "text-amber-400" : "text-slate-300"}`}>
                  {r.share}%
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {r.last_seen ? new Date(r.last_seen).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
