import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getGuardDiscussion } from "@/lib/salle-de-garde.functions";

export const Route = createFileRoute("/_authenticated/salle-de-garde/discussion/$id")({ component: LegacyDiscussionRedirect });

function LegacyDiscussionRedirect() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getGuardDiscussion);
  const { data, isError } = useQuery({ queryKey: ["guard-discussion", id], queryFn: () => get({ data: { id } }) });

  useEffect(() => {
    if (data?.discussion) {
      navigate({ to: "/salle-de-garde/$specialty", params: { specialty: data.discussion.specialty_id }, replace: true });
    }
  }, [data, navigate]);

  return <p className="py-16 text-center text-muted-foreground">{isError ? "Message introuvable." : "Ouverture du groupe…"}</p>;
}
