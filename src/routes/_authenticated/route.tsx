import { createFileRoute, redirect, Outlet, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Home, History, User as UserIcon, LogOut, PlayCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
