import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

const headT = makeT(getStoredLang());

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: headT("auth.head.resetPasswordTitle") }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setValidRecovery(Boolean(data.session));
        setCheckingLink(false);
      }
    };
    void checkRecoverySession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        setValidRecovery(true);
        setCheckingLink(false);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("auth.resetPasswordPage.tooShort"));
      return;
    }
    if (password !== confirmation) {
      toast.error(t("auth.resetPasswordPage.mismatch"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success(t("auth.resetPasswordPage.success"));
      navigate({ to: "/auth", search: { mode: "signin" } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("auth.resetPasswordPage.error"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingLink) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!validRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-serif text-2xl">{t("auth.resetPasswordPage.invalidTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.resetPasswordPage.invalidDescription")}</p>
          <Button asChild className="w-full"><Link to="/auth" search={{ mode: "reset" }}>{t("auth.resetPasswordPage.requestAgain")}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="font-serif text-2xl">{t("auth.resetPasswordPage.title")}</h1>
        <div>
          <Label htmlFor="pwd">{t("auth.resetPasswordPage.password")}</Label>
          <div className="relative mt-1">
            <Input id="pwd" type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" autoComplete="new-password" />
            <button type="button" aria-label={showPassword ? t("auth.signin.hidePassword") : t("auth.signin.showPassword")} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("auth.resetPasswordPage.passwordHint")}</p>
        </div>
        <div>
          <Label htmlFor="confirmation">{t("auth.resetPasswordPage.confirmation")}</Label>
          <Input id="confirmation" type={showPassword ? "text" : "password"} required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1" autoComplete="new-password" />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("auth.resetPasswordPage.submit")}
        </Button>
      </form>
    </div>
  );
}
