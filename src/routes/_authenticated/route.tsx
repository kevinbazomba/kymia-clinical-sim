import { createFileRoute, redirect, Outlet, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Bell, Home, History, User as UserIcon, LogOut, PlayCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/admin.functions";
import { getMyAccess } from "@/lib/access.functions";
import { Button } from "@/components/ui/button";
import { InstallButton, InstallPrompt } from "@/components/InstallPwa";
import { LanguageDetectDialog } from "@/components/LanguageSwitch";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { KymiaFooter } from "@/components/KymiaFooter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getMyAdminMessages, markMyAdminMessageRead } from "@/lib/admin-activity.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { mode: "signin", redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthLayout,
});

// Pages an EXPIRED user is still allowed to browse (must be able to reach /premium and read-only areas)
const EXPIRED_ALLOWED = ["/premium", "/profile", "/history", "/report", "/auth"];

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const checkAdminFn = useServerFn(checkAdmin);
  const accessFn = useServerFn(getMyAccess);
  const adminQ = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: () => checkAdminFn(),
    staleTime: 5 * 60 * 1000,
  });
  const accessQ = useQuery({
    queryKey: ["my-access", user.id],
    queryFn: () => accessFn(),
    staleTime: 30 * 1000,
  });
  const isAdmin = adminQ.data?.isAdmin === true;

  useEffect(() => {
    const updatePresence = async () => {
      if (document.visibilityState !== "visible") return;
      await supabase.from("user_presence").upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
    };
    void updatePresence();
    const timer = window.setInterval(() => { void updatePresence(); }, 45_000);
    document.addEventListener("visibilitychange", updatePresence);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updatePresence);
    };
  }, [user.id]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (!accessQ.data) return;
    if (accessQ.data.status === "expired"
        && !EXPIRED_ALLOWED.some((p) => pathname.startsWith(p))) {
      router.navigate({ to: "/premium", replace: true });
    }
  }, [accessQ.data, pathname, router]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();


  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-secondary/40">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Link to="/home" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-lg font-semibold sm:text-xl">Kymia</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/home" icon={<Home className="h-4 w-4" />}>{t("common.nav.home")}</NavLink>
            <NavLink to="/specialties" icon={<PlayCircle className="h-4 w-4" />}>{t("common.nav.consult")}</NavLink>
            <NavLink to="/salle-de-garde" icon={<Stethoscope className="h-4 w-4" />}>Salle de garde</NavLink>
            <NavLink to="/history" icon={<History className="h-4 w-4" />}>{t("common.nav.history")}</NavLink>
            <NavLink to="/profile" icon={<UserIcon className="h-4 w-4" />}>{t("common.nav.profile")}</NavLink>
            {isAdmin && (
              <Link
                to="/admin"
                className="ml-1 flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4 text-primary" /> {t("common.nav.admin")}
              </Link>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <InstallButton compact />
            <AdminMessageBell />
            <div className="hidden h-8 w-8 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary md:grid">
              {initial}
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label={t("common.nav.signOut")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex items-stretch justify-around gap-0.5 overflow-x-auto border-t bg-background px-1 py-1.5 md:hidden">
          <MobileNavLink to="/home" icon={<Home className="h-4 w-4" />} label={t("common.nav.home")} />
          <MobileNavLink to="/specialties" icon={<PlayCircle className="h-4 w-4" />} label={t("common.nav.consult")} />
          <MobileNavLink to="/salle-de-garde" icon={<Stethoscope className="h-4 w-4" />} label="Salle de garde" />
          <MobileNavLink to="/history" icon={<History className="h-4 w-4" />} label={t("common.nav.history")} />
          <MobileNavLink to="/profile" icon={<UserIcon className="h-4 w-4" />} label={t("common.nav.profile")} />
        </nav>

      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        <Suspense fallback={<GenericPageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <KymiaFooter />
      <InstallPrompt />
      <LanguageDetectDialog />
    </div>
  );
}

function AdminMessageBell() {
  const messagesFn = useServerFn(getMyAdminMessages);
  const markReadFn = useServerFn(markMyAdminMessageRead);
  const qc = useQueryClient();
  const { data: messages = [] } = useQuery({
    queryKey: ["my-admin-messages"],
    queryFn: () => messagesFn(),
    refetchInterval: 30_000,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-admin-messages"] }),
  });
  const unread = messages.filter((message) => !message.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} non lues` : ""}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="border-b px-4 py-3">
          <p className="font-semibold">Messages de Dr Kymia Motcho</p>
          <p className="text-xs text-muted-foreground">{unread ? `${unread} message${unread === 1 ? "" : "s"} non lu${unread === 1 ? "" : "s"}` : "Vos notifications"}</p>
        </div>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
          {messages.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun message pour le moment.</p>}
          {messages.map((message) => (
            <button key={message.id} type="button" onClick={() => !message.read_at && markRead.mutate(message.id)} className={`w-full rounded-lg p-3 text-left transition hover:bg-secondary/70 ${message.read_at ? "" : "bg-primary/5"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold">{message.sender_name}</span>
                {!message.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.message}</p>
              <time className="mt-2 block text-[11px] text-muted-foreground">{new Date(message.created_at).toLocaleString("fr-FR")}</time>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {icon}{children}
    </Link>
  );
}

function MobileNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-medium text-muted-foreground sm:px-2"
      activeProps={{ className: "text-primary" }}
    >
      {icon}<span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function GenericPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
