// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createGuardDiscussion, listGuardDiscussions, listGuardSpecialties } from "@/lib/salle-de-garde.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Flame, Lock, MessageCircle, Plus, Search, Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/salle-de-garde/$specialty")({ component: GuardSpecialty });
const labels: Record<string, string> = { question: "Question", case: "Cas clinique", discussion: "Discussion", debate: "Débat scientifique", revision: "Révision" };

function GuardSpecialty() {
  const { specialty } = Route.useParams(); const qc = useQueryClient(); const navigate = useNavigate();
  const list = useServerFn(listGuardDiscussions); const specialtiesFn = useServerFn(listGuardSpecialties); const create = useServerFn(createGuardDiscussion);
  const [search, setSearch] = useState(""); const [type, setType] = useState<string>(""); const [unanswered, setUnanswered] = useState(false); const [open, setOpen] = useState(false);
  const { data: specialties } = useQuery({ queryKey: ["guard-specialties"], queryFn: () => specialtiesFn() });
  const { data: discussions, isLoading } = useQuery({ queryKey: ["guard-discussions", specialty, search, type, unanswered], queryFn: () => list({ data: { specialty_id: specialty, search, type: type || undefined, unanswered } }) });
  const createMut = useMutation({ mutationFn: (data: { title: string; content: string; type: "question" | "case" | "discussion" | "debate" | "revision" }) => create({ data: { specialty_id: specialty, ...data } }), onSuccess: ({ id }) => { qc.invalidateQueries({ queryKey: ["guard-discussions", specialty] }); navigate({ to: "/salle-de-garde/discussion/$id", params: { id } }); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Publication impossible") });
  const name = specialties?.find((s) => s.id === specialty)?.name ?? "Salle de garde";
  return <div className="space-y-6">
    <section className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)] md:flex md:items-end md:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Salle de garde</p><h1 className="mt-2 font-serif text-4xl">🩺 {name}</h1><p className="mt-2 text-sm text-muted-foreground">Questions, cas cliniques et débats scientifiques autour de cette spécialité.</p></div>
      <Button className="mt-5 md:mt-0" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle discussion</Button>
    </section>
    <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs">Ne partagez aucune donnée permettant d’identifier un patient réel : nom, dossier, coordonnées ou photographie identifiable.</p>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher dans cette spécialité" /></div><select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Toutes</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}s</option>)}</select><Button variant={unanswered ? "default" : "outline"} onClick={() => setUnanswered((v) => !v)}>Sans réponse</Button></div>
    <div className="space-y-3">{isLoading ? <p className="py-12 text-center text-muted-foreground">Chargement des discussions…</p> : discussions?.length ? discussions.map((d) => <Link key={d.id} to="/salle-de-garde/discussion/$id" params={{ id: d.id }} className="block rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary/40"><div className="flex gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{d.is_pinned && <Badge>📌 Importante</Badge>}<Badge variant="secondary">{labels[d.type]}</Badge>{d.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}</div><h2 className="mt-2 font-serif text-xl">{d.is_pinned && "🔥 "}{d.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.content}</p><p className="mt-3 text-xs text-muted-foreground">{d.author?.name} — {d.author?.profession} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</p><div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span><MessageCircle className="mr-1 inline h-3.5 w-3.5" />{d.replies_count} réponse{d.replies_count > 1 ? "s" : ""}</span><span><Eye className="mr-1 inline h-3.5 w-3.5" />{d.views_count} vue{d.views_count > 1 ? "s" : ""}</span>{d.replies_count >= 5 && <span className="text-primary"><Flame className="mr-1 inline h-3.5 w-3.5" />Active</span>}</div></div></div></Link>) : <div className="rounded-2xl border border-dashed p-10 text-center"><Stethoscope className="mx-auto h-7 w-7 text-primary" /><h2 className="mt-3 font-serif text-xl">La Salle de garde est encore calme…</h2><p className="mt-2 text-sm text-muted-foreground">Soyez le premier à lancer une discussion dans cette spécialité.</p><Button className="mt-5" onClick={() => setOpen(true)}>Lancer une discussion</Button></div>}</div>
    <NewDiscussionDialog open={open} onOpenChange={setOpen} loading={createMut.isPending} onSubmit={(data) => createMut.mutate(data)} />
  </div>;
}

function NewDiscussionDialog({ open, onOpenChange, loading, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; loading: boolean; onSubmit: (data: { title: string; content: string; type: "question" | "case" | "discussion" | "debate" | "revision" }) => void }) {
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [type, setType] = useState<"question" | "case" | "discussion" | "debate" | "revision">("question");
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="font-serif text-2xl">Nouvelle discussion</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ title, content, type }); }}><div><Label>Titre de la discussion</Label><Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quelle prise en charge devant une hyperkaliémie sévère ?" required minLength={5} /></div><div><Label>Type de discussion</Label><select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label>Votre question / votre discussion</Label><Textarea className="mt-1" value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Présentez votre question sans inclure de donnée identifiante d’un patient réel." required minLength={10} /></div><p className="text-xs text-muted-foreground">⚠️ Cet espace est pédagogique. Ne publiez aucune donnée personnelle de patient réel.</p><Button type="submit" className="w-full" disabled={loading}>{loading ? "Publication…" : "Publier la discussion"}</Button></form></DialogContent></Dialog>;
}
