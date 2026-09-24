import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Loader2, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, User, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n, makeT, getStoredLang, type TFunction } from "@/lib/i18n";
import { COUNTRIES, searchCountries } from "@/lib/countries";

const authSearch = z.object({
  mode: z.enum(["signin", "signup", "reset"]).catch("signin"),
  redirect: z.string().optional(),
});

const headT = makeT(getStoredLang());

export const Route = createFileRoute("/auth")({
  validateSearch: authSearch,
  head: () => ({
    meta: [
      { title: headT("auth.head.signinTitle") },
      { name: "description", content: headT("auth.head.signinDescription") },
    ],
  }),
  component: AuthPage,
});

// Full world country list (with dial codes) lives in src/lib/countries.ts
const COUNTRY_CODES = COUNTRIES;

function useProfessions(t: TFunction) {
  return [
    t("auth.professions.student"),
    t("auth.professions.intern"),
    t("auth.professions.generalist"),
    t("auth.professions.specialist"),
    t("auth.professions.nurse"),
  ];
}

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();

  const safeRedirect = (r?: string) => (r && r.startsWith("/") ? r : null);
  const goAfterAuth = () => {
    const r = safeRedirect(redirect);
    if (r && r !== "/home") window.location.href = r;
    else navigate({ to: "/home" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, redirect]);

  const setMode = (m: "signin" | "signup" | "reset") =>
    navigate({ to: "/auth", search: { mode: m, redirect } });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-[image:var(--gradient-primary)] p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-2xl font-semibold">Kymia</span>
        </Link>
        <SideCopy />
        <div className="text-xs opacity-70">
          <AuthT k="side.copyright" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                <Activity className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-2xl font-semibold">Kymia</span>
            </Link>
            <LanguageSwitch className="ml-auto" />
          </div>

          {mode === "signup" ? (
            <SignupWizard onDone={goAfterAuth} onSwitchSignin={() => setMode("signin")} />
          ) : mode === "reset" ? (
            <ResetForm onBack={() => setMode("signin")} />
          ) : (
            <SigninForm
              onDone={goAfterAuth}
              onSwitchSignup={() => setMode("signup")}
              onReset={() => setMode("reset")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AuthT({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(`auth.${k}`)}</>;
}

function SideCopy() {
  const { t } = useI18n();
  return (
    <div className="max-w-md">
      <p className="font-serif text-3xl leading-snug">{t("auth.side.quote")}</p>
      <p className="mt-4 text-sm opacity-80">{t("auth.side.tagline")}</p>
    </div>
  );
}

/* ---------------- Social buttons ---------------- */

function SocialButtons() {
  const { t } = useI18n();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  async function handle(provider: "google" | "apple") {
    setLoading(provider);
    try {
      // Authentication accounts live in Supabase. Keeping OAuth on the same
      // provider avoids a Lovable callback URL that is not served by kymia.site.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error(t("auth.social.error"));
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.social.error"));
    } finally {
      setLoading(null);
    }
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => handle("google")}
        disabled={loading !== null}
      >
        {loading === "google" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        {t("auth.social.google")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => handle("apple")}
        disabled={loading !== null}
      >
        {loading === "apple" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <AppleIcon className="mr-2 h-4 w-4" />
        )}
        {t("auth.social.apple")}
      </Button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t("auth.social.or")}</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.36 12.6c0-2.55 2.09-3.78 2.19-3.84-1.19-1.74-3.05-1.98-3.71-2-1.58-.16-3.08.93-3.88.93-.8 0-2.03-.9-3.34-.88-1.72.03-3.31 1-4.19 2.54-1.79 3.1-.46 7.7 1.28 10.22.85 1.23 1.87 2.61 3.19 2.56 1.28-.05 1.76-.83 3.31-.83s1.98.83 3.33.8c1.38-.02 2.25-1.25 3.09-2.49.98-1.42 1.38-2.8 1.4-2.87-.03-.01-2.69-1.03-2.71-4.14zM13.9 4.9c.71-.86 1.19-2.05 1.06-3.24-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.09 3.14 1.14.09 2.31-.58 3.03-1.44z"/>
    </svg>
  );
}

/* ---------------- Sign-in ---------------- */

function SigninForm({ onDone, onSwitchSignup, onReset }: { onDone: () => void; onSwitchSignup: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t("auth.signin.welcome"));
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("auth.signin.unknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-3xl text-foreground">{t("auth.signin.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.signin.subtitle")}</p>

      <div className="mt-6">
        <SocialButtons />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("auth.signin.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@hopital.fr" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.signin.password")}</Label>
          <div className="relative mt-1">
            <Input id="password" type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
            <button type="button" aria-label={showPassword ? t("auth.signin.hidePassword") : t("auth.signin.showPassword")} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.signin.submit")}
        </Button>
      </form>

      <div className="mt-6 flex justify-between text-xs text-muted-foreground">
        <button onClick={onSwitchSignup} className="hover:text-foreground">{t("auth.signin.noAccount")}</button>
        <button onClick={onReset} className="hover:text-foreground">{t("auth.signin.forgotPassword")}</button>
      </div>
    </div>
  );
}

/* ---------------- Reset ---------------- */

function ResetForm({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
      });
      if (error) throw error;
      // Deliberately use the same response for all addresses: this prevents
      // attackers from discovering which email addresses have an account.
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.reset.unknownError"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-3xl text-foreground">{t("auth.reset.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.reset.subtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">{t("auth.reset.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.reset.submit")}
        </Button>
      </form>
      {sent && <p role="status" className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{t("auth.reset.sent")}</p>}
      <div className="mt-6 text-xs text-muted-foreground">
        <button onClick={onBack} className="hover:text-foreground">{t("auth.reset.back")}</button>
      </div>
    </div>
  );
}

/* ---------------- Signup Wizard ---------------- */

function passwordStrength(p: string, t: TFunction): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) && p.length >= 10) s++;
  if (s >= 4) return { score: 3, label: t("auth.passwordStrength.strong"), color: "bg-emerald-500" };
  if (s === 3) return { score: 2, label: t("auth.passwordStrength.medium"), color: "bg-amber-500" };
  if (s >= 1) return { score: 1, label: t("auth.passwordStrength.weak"), color: "bg-orange-500" };
  return { score: 0, label: t("auth.passwordStrength.veryWeak"), color: "bg-red-500" };
}

function SignupWizard({ onDone, onSwitchSignin }: { onDone: () => void; onSwitchSignin: () => void }) {
  const { t } = useI18n();
  const PROFESSIONS = useProfessions(t);
  const TOTAL = 5;
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState(PROFESSIONS[0]);
  const [country, setCountry] = useState(COUNTRY_CODES[0].label);
  const [countryQuery, setCountryQuery] = useState("");
  const filteredCountries = useMemo(() => searchCountries(countryQuery), [countryQuery]);
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState(COUNTRY_CODES[0].code);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-select dial code from country
  useEffect(() => {
    const found = COUNTRY_CODES.find((c) => c.label === country);
    if (found) setDialCode(found.code);
  }, [country]);

  const strength = useMemo(() => passwordStrength(password, t), [password, t]);

  const canStep2 = firstName.trim() && lastName.trim() && profession && country;
  const canStep3 = /^\S+@\S+\.\S+$/.test(email) && phone.trim().length >= 5;
  const canStep4 = password.length >= 8 && password === confirmPassword && strength.score >= 1;

  async function submit() {
    setLoading(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const whatsapp = `${dialCode} ${phone.trim()}`;
      const { data: signUp, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: { display_name: displayName, first_name: firstName, last_name: lastName, whatsapp, profession, country },
        },
      });
      if (error) throw error;
      const uid = signUp.user?.id;
      if (uid) {
        await supabase.from("profiles").update({
          display_name: displayName,
          whatsapp,
          profession,
          country,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          first_name: firstName, last_name: lastName,
        } as any).eq("id", uid);
      }
      setSuccess(true);
      setTimeout(() => {
        toast.success(t("auth.signup.success.toast"));
        onDone();
      }, 1400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.signup.unknownError"));
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 animate-scale-in">
          <CheckCircle2 className="h-12 w-12" strokeWidth={2} />
        </div>
        <p className="mt-6 font-serif text-2xl text-foreground">{t("auth.signup.success.title")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.signup.success.subtitle")}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("auth.signup.stepOf", { step, total: TOTAL })}</span>
          <span>{Math.round((step / TOTAL) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-[image:var(--gradient-primary)] transition-all duration-500" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-foreground">{t("auth.signup.step1.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.signup.step1.description")}
            </p>
            <p className="mt-3 text-sm font-medium text-primary">{t("auth.signup.step1.gift")}</p>
          </div>

          <SocialButtons />

          <Button className="w-full" size="lg" onClick={() => setStep(2)}>
            {t("auth.signup.step1.cta")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("auth.signup.step1.alreadyAccount")} <button onClick={onSwitchSignin} className="text-primary hover:underline">{t("auth.signup.step1.signIn")}</button>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <StepHeader icon={<User className="h-5 w-5" />} title={t("auth.signup.step2.title")} subtitle={t("auth.signup.step2.subtitle")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">{t("auth.signup.step2.firstName")}</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ln">{t("auth.signup.step2.lastName")}</Label>
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="prof">{t("auth.signup.step2.profession")}</Label>
            <select id="prof" value={profession} onChange={(e) => setProfession(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="ctry">{t("auth.signup.step2.country")}</Label>
            <Input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder={t("auth.signup.step2.countrySearch")}
              className="mt-1"
            />
            <select id="ctry" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              {filteredCountries.map((c) => <option key={c.label} value={c.label}>{c.flag} {c.label}</option>)}
            </select>
          </div>
          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} canNext={!!canStep2} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <StepHeader icon={<Mail className="h-5 w-5" />} title={t("auth.signup.step3.title")} subtitle={t("auth.signup.step3.subtitle")} />
          <div>
            <Label htmlFor="email">{t("auth.signup.step3.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wa">{t("auth.signup.step3.whatsapp")}</Label>
            <div className="mt-1 flex gap-2">
              <select value={dialCode} onChange={(e) => setDialCode(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm" aria-label={t("auth.signup.step3.dialCodeLabel")}>
                {COUNTRY_CODES.map((c) => (
                  <option key={c.label} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <Input id="wa" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} placeholder={t("auth.signup.step3.phonePlaceholder")} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("auth.signup.step3.dialCodeHint")}</p>
          </div>
          <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} canNext={canStep3} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <StepHeader icon={<ShieldCheck className="h-5 w-5" />} title={t("auth.signup.step4.title")} subtitle={t("auth.signup.step4.subtitle")} />
          <div>
            <Label htmlFor="pwd">{t("auth.signup.step4.password")}</Label>
            <div className="relative mt-1">
              <Input id="pwd" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className="pr-10" />
              <button type="button" aria-label={showPassword ? t("auth.signin.hidePassword") : t("auth.signin.showPassword")} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-secondary"}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t("auth.passwordStrength.label", { label: strength.label })}</p>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="cpwd">{t("auth.signup.step4.confirmPassword")}</Label>
            <Input id="cpwd" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-destructive">{t("auth.signup.step4.mismatch")}</p>
            )}
          </div>
          <StepNav onBack={() => setStep(3)} onNext={() => setStep(5)} canNext={canStep4} />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <StepHeader icon={<CheckCircle2 className="h-5 w-5" />} title={t("auth.signup.step5.title")} subtitle={t("auth.signup.step5.subtitle")} />
          <dl className="divide-y rounded-2xl border bg-card text-sm">
            <SummaryRow label={t("auth.signup.step5.fullName")} value={`${firstName} ${lastName}`} empty={t("auth.signup.step5.empty")} />
            <SummaryRow label={t("auth.signup.step5.profession")} value={profession} empty={t("auth.signup.step5.empty")} />
            <SummaryRow label={t("auth.signup.step5.country")} value={country} empty={t("auth.signup.step5.empty")} />
            <SummaryRow label={t("auth.signup.step5.email")} value={email} empty={t("auth.signup.step5.empty")} />
            <SummaryRow label={t("auth.signup.step5.whatsapp")} value={`${dialCode} ${phone}`} empty={t("auth.signup.step5.empty")} />
          </dl>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1" disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("auth.signup.nav.previous")}
            </Button>
            <Button onClick={submit} className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.signup.step5.submit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">{icon}</div>
      <div>
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, canNext }: { onBack: () => void; onNext: () => void; canNext: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" onClick={onBack} className="flex-1">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t("auth.signup.nav.previous")}
      </Button>
      <Button onClick={onNext} disabled={!canNext} className="flex-1">
        {t("auth.signup.nav.next")} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function SummaryRow({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground text-right">{value || empty}</dd>
    </div>
  );
}
