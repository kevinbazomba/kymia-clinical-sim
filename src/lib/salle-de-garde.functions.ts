// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const discussionTypes = ["question", "case", "discussion", "debate", "revision"] as const;
const reactionTypes = ["useful", "relevant", "interesting"] as const;
const reportReasons = ["dangerous_information", "inappropriate", "misinformation", "harassment", "spam", "other"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function authorMap(rows: any[]) {
  return Object.fromEntries(rows.map((p) => [p.id, {
    name: p.display_name || "Membre Kymia", profession: p.profession || p.level || "Membre Kymia",
  }]));
}

export const listGuardSpecialties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const [{ data: specialties, error }, { data: discussions }, { data: replies }] = await Promise.all([
      context.supabase.from("guard_specialties").select("id, name, description, icon, sort_order").eq("is_active", true).order("sort_order"),
      context.supabase.from("guard_discussions").select("id, specialty_id, author_id").eq("is_hidden", false),
      context.supabase.from("guard_replies").select("discussion_id, author_id").eq("is_hidden", false),
    ]);
    if (error) throw new Error(error.message);
    const discussionIds = new Map((discussions ?? []).map((d) => [d.id, d.specialty_id]));
    return (specialties ?? []).map((s) => {
      const categoryDiscussions = (discussions ?? []).filter((d) => d.specialty_id === s.id);
      const participants = new Set(categoryDiscussions.map((d) => d.author_id));
      for (const reply of replies ?? []) if (discussionIds.get(reply.discussion_id) === s.id) participants.add(reply.author_id);
      return { ...s, discussions_count: categoryDiscussions.length, participants_count: participants.size };
    });
  });

export const listGuardDiscussions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    specialty_id: z.string().min(2).max(80), search: z.string().max(120).optional().default(""),
    type: z.enum(discussionTypes).optional(), unanswered: z.boolean().optional().default(false),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    let query = context.supabase.from("guard_discussions").select("id, specialty_id, author_id, title, content, type, views_count, is_pinned, is_locked, created_at").eq("specialty_id", data.specialty_id).eq("is_hidden", false).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    if (data.type) query = query.eq("type", data.type);
    if (data.search.trim()) query = query.or(`title.ilike.%${data.search.trim()}%,content.ilike.%${data.search.trim()}%`);
    const { data: discussions, error } = await query;
    if (error) throw new Error(error.message);
    const ids = (discussions ?? []).map((d) => d.id);
    const authorIds = [...new Set((discussions ?? []).map((d) => d.author_id))];
    const [{ data: profiles }, { data: replies }, { data: reactions }] = await Promise.all([
      authorIds.length ? context.supabase.from("profiles").select("id, display_name, profession, level").in("id", authorIds) : Promise.resolve({ data: [] }),
      ids.length ? context.supabase.from("guard_replies").select("discussion_id").in("discussion_id", ids).eq("is_hidden", false) : Promise.resolve({ data: [] }),
      ids.length ? context.supabase.from("guard_reactions").select("discussion_id").in("discussion_id", ids) : Promise.resolve({ data: [] }),
    ]);
    const authors = authorMap(profiles ?? []);
    return (discussions ?? []).map((d) => ({ ...d, author: authors[d.author_id],
      replies_count: (replies ?? []).filter((r) => r.discussion_id === d.id).length,
      reactions_count: (reactions ?? []).filter((r) => r.discussion_id === d.id).length,
    })).filter((d) => !data.unanswered || d.replies_count === 0);
  });

export const getGuardDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { data: discussion, error } = await context.supabase.from("guard_discussions").select("*").eq("id", data.id).single();
    if (error || !discussion) throw new Error("Discussion introuvable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("guard_discussions").update({ views_count: (discussion.views_count ?? 0) + 1 } as never).eq("id", data.id);
    const [{ data: replies }, { data: profiles }, { data: reactions }, { data: follower }] = await Promise.all([
      context.supabase.from("guard_replies").select("*").eq("discussion_id", data.id).eq("is_hidden", false).order("created_at"),
      context.supabase.from("profiles").select("id, display_name, profession, level").in("id", [discussion.author_id]),
      context.supabase.from("guard_reactions").select("discussion_id, reply_id, type").eq("discussion_id", data.id),
      context.supabase.from("guard_followers").select("discussion_id").eq("discussion_id", data.id).eq("user_id", context.userId).maybeSingle(),
    ]);
    const replyAuthorIds = [...new Set((replies ?? []).map((r) => r.author_id))];
    const { data: replyProfiles } = replyAuthorIds.length
      ? await context.supabase.from("profiles").select("id, display_name, profession, level").in("id", replyAuthorIds)
      : { data: [] };
    const authors = authorMap([...(profiles ?? []), ...(replyProfiles ?? [])]);
    return { discussion: { ...discussion, views_count: (discussion.views_count ?? 0) + 1, author: authors[discussion.author_id] },
      replies: (replies ?? []).map((r) => ({ ...r, author: authors[r.author_id], reactions: (reactions ?? []).filter((x) => x.reply_id === r.id) })),
      reactions: (reactions ?? []).filter((x) => x.discussion_id === data.id), following: Boolean(follower) };
  });

export const createGuardDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ specialty_id: z.string().min(2).max(80), title: z.string().trim().min(5).max(180), content: z.string().trim().min(10).max(10000), type: z.enum(discussionTypes) }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { data: row, error } = await context.supabase.from("guard_discussions").insert({ ...data, author_id: context.userId } as never).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Publication impossible");
    return { id: row.id as string };
  });

export const replyToGuardDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ discussion_id: z.string().uuid(), content: z.string().trim().min(2).max(8000), parent_reply_id: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { data: discussion, error: discussionError } = await context.supabase.from("guard_discussions").select("author_id, is_locked").eq("id", data.discussion_id).single();
    if (discussionError || !discussion) throw new Error("Discussion introuvable");
    if (discussion.is_locked) throw new Error("DISCUSSION_LOCKED");
    const { data: reply, error } = await context.supabase.from("guard_replies").insert({ ...data, author_id: context.userId } as never).select("id").single();
    if (error || !reply) throw new Error(error?.message ?? "Réponse impossible");
    const recipients = new Set<string>([discussion.author_id]);
    if (data.parent_reply_id) {
      const { data: parent } = await context.supabase.from("guard_replies").select("author_id").eq("id", data.parent_reply_id).maybeSingle();
      if (parent) recipients.add(parent.author_id);
    }
    recipients.delete(context.userId);
    if (recipients.size) await context.supabase.from("guard_notifications").insert([...recipients].map((user_id) => ({ user_id, discussion_id: data.discussion_id, reply_id: reply.id, message: "Nouvelle réponse dans une discussion que vous suivez." })) as never);
    return { id: reply.id as string };
  });

export const toggleGuardFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ discussion_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { data: existing } = await context.supabase.from("guard_followers").select("discussion_id").eq("discussion_id", data.discussion_id).eq("user_id", context.userId).maybeSingle();
    if (existing) { await context.supabase.from("guard_followers").delete().eq("discussion_id", data.discussion_id).eq("user_id", context.userId); return { following: false }; }
    const { error } = await context.supabase.from("guard_followers").insert({ discussion_id: data.discussion_id, user_id: context.userId } as never);
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const reactToGuardContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ discussion_id: z.string().uuid().optional(), reply_id: z.string().uuid().optional(), type: z.enum(reactionTypes) }).refine((d) => Boolean(d.discussion_id) !== Boolean(d.reply_id)).parse(d))
  .handler(async ({ data, context }: any) => {
    const query = context.supabase.from("guard_reactions").select("id").eq("user_id", context.userId).eq("type", data.type);
    const { data: existing } = data.discussion_id ? await query.eq("discussion_id", data.discussion_id).maybeSingle() : await query.eq("reply_id", data.reply_id!).maybeSingle();
    if (existing) { await context.supabase.from("guard_reactions").delete().eq("id", existing.id); return { active: false }; }
    const { error } = await context.supabase.from("guard_reactions").insert({ ...data, user_id: context.userId } as never);
    if (error) throw new Error(error.message);
    return { active: true };
  });

export const reportGuardContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ discussion_id: z.string().uuid().optional(), reply_id: z.string().uuid().optional(), reason: z.enum(reportReasons), description: z.string().max(1000).optional() }).refine((d) => Boolean(d.discussion_id) !== Boolean(d.reply_id)).parse(d))
  .handler(async ({ data, context }: any) => {
    const { error } = await context.supabase.from("guard_reports").insert({ ...data, reporter_id: context.userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
