import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("auth.resetPasswordPage.success"));
      navigate({ to: "/home" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("auth.resetPasswordPage.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="font-serif text-2xl">{t("auth.resetPasswordPage.title")}</h1>
        <div>
          <Label htmlFor="pwd">{t("auth.resetPasswordPage.password")}</Label>
          <Input id="pwd" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("auth.resetPasswordPage.submit")}
        </Button>
      </form>
    </div>
  );
}
