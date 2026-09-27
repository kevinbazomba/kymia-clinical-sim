// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createGuardMessage, listGuardMessages, listGuardSpecialties, reactToGuardContent } from "@/lib/salle-de-garde.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Lightbulb, Loader2, MessageCircle, Send, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/salle-de-garde/$specialty")({ component: GuardSpecialty });
const reactions = [
  { type: "useful", label: "Utile", Icon: ThumbsUp },
  { type: "relevant", label: "Pertinent", Icon: Lightbulb },
  { type: "interesting", label: "Intéressant", Icon: Heart },
] as const;

function GuardSpecialty() {
  const { specialty } = Route.useParams();
  const qc = useQueryClient();
  const list = useServerFn(listGuardMessages);
  const specialtiesFn = useServerFn(listGuardSpecialties);
  const send = useServerFn(createGuardMessage);
  const react = useServerFn(reactToGuardContent);
  const [content, setContent] = useState("");
  const { data: specialties } = useQuery({ queryKey: ["guard-specialties"], queryFn: () => specialtiesFn() });
  const queryKey = ["guard-discussions", specialty, "chat"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { specialty_id: specialty } }),
    refetchInterval: 5000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["guard-specialties"] });
  };
  const sendMut = useMutation({
    mutationFn: () => send({ data: { specialty_id: specialty, content } }),
    onSuccess: () => { setContent(""); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Envoi impossible"),
  });
  const reactMut = useMutation({
    mutationFn: ({ id, type }: { id: string; type: typeof reactions[number]["type"] }) => react({ data: { discussion_id: id, type } }),
    onSuccess: refresh,
    onError: () => toast.error("Réaction impossible pour le moment."),
  });
  const name = specialties?.find((s) => s.id === specialty)?.name ?? "Groupe de spécialité";
  const messages = [...(data ?? [])].reverse();

  return <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-4xl flex-col gap-4">
    <Link to="/salle-de-garde" className="inline-flex w-fit items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Tous les services</Link>
    <section className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><MessageCircle className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1"><h1 className="font-serif text-2xl">{name}</h1><p className="text-sm text-muted-foreground">Groupe scientifique · {specialties?.find((s) => s.id === specialty)?.participants_count ?? 0} participants</p></div>
      <Badge variant="secondary">Messages et réactions</Badge>
    </section>
    <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs">Ne partagez aucune donnée permettant d’identifier un patient réel.</p>

    <section className="flex min-h-[45vh] flex-1 flex-col rounded-2xl border bg-secondary/20 p-3 sm:p-5">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {isLoading ? <p className="py-12 text-center text-muted-foreground">Chargement des messages…</p> : messages.length ? messages.map((message) => {
          const counts = Object.fromEntries(reactions.map(({ type }) => [type, message.reactions?.filter((r) => r.type === type).length ?? 0]));
          return <article key={message.id} className="max-w-[92%] rounded-2xl border bg-card p-4 shadow-sm sm:max-w-[85%]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><strong>{message.author?.name ?? "Membre Kymia"}</strong>{message.author?.profession && <span className="text-muted-foreground">{message.author.profession}</span>}<time className="ml-auto text-muted-foreground">{new Date(message.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">{reactions.map(({ type, label, Icon }) => <Button key={type} variant="outline" size="sm" className="h-8 rounded-full px-3" disabled={reactMut.isPending} onClick={() => reactMut.mutate({ id: message.id, type })}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}{counts[type] > 0 && <span className="ml-1">{counts[type]}</span>}</Button>)}</div>
          </article>;
        }) : <div className="grid min-h-[35vh] place-content-center text-center"><MessageCircle className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-3 font-serif text-xl">Le groupe est prêt</h2><p className="mt-1 text-sm text-muted-foreground">Lancez le premier débat scientifique.</p></div>}
      </div>
      <form className="mt-4 flex items-end gap-2 border-t pt-4" onSubmit={(e) => { e.preventDefault(); if (content.trim().length >= 2) sendMut.mutate(); }}>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Écrivez un message au groupe…" rows={2} maxLength={10000} className="max-h-36 min-h-12 resize-y bg-background" disabled={sendMut.isPending} />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full" aria-label="Envoyer le message" disabled={sendMut.isPending || content.trim().length < 2}>{sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </form>
    </section>
  </div>;
}
