import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LayoutDashboard, Users, LogOut, ArrowLeft, Shuffle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — Kymia" }] }),
  beforeLoad: async () => {
    // Verify admin role server-side; non-admins get redirected home
    try {
      const res = await checkAdmin();
      if (!res.isAdmin) throw redirect({ to: "/home" });
    } catch (e) {
      // Redirect throws; rethrow. Otherwise deny.
      if (e && typeof e === "object" && "to" in e) throw e;
      throw redirect({ to: "/home" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-8rem)] bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Espace sécurisé</p>
              <h1 className="font-serif text-lg leading-tight">Administration Kymia</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/home">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="mr-1 h-4 w-4" />Retour app
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 text-sm sm:px-4">
          <AdminLink to="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>Tableau de bord</AdminLink>
          <AdminLink to="/admin/users" icon={<Users className="h-4 w-4" />}>Utilisateurs & abonnements</AdminLink>
          <AdminLink to="/admin/diversity" icon={<Shuffle className="h-4 w-4" />}>Diversité des cas</AdminLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

function AdminLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
      activeProps={{ className: "bg-slate-800 text-white" }}
      activeOptions={{ exact: true }}
    >
      {icon}{children}
    </Link>
  );
}
