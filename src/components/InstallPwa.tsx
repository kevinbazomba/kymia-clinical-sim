import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

// Chrome/Edge/Android: BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const DISMISSED_KEY = "kymia-install-dismissed-at";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [canInstall, setCanInstall] = useState<boolean>(!!deferredPrompt);
  const [installed, setInstalled] = useState<boolean>(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => { setInstalled(true); setCanInstall(false); deferredPrompt = null; };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const label = compact ? t("subscription.install.buttonLabelCompact") : t("subscription.install.buttonLabelFull");

  async function handle() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") toast.success(t("subscription.install.toastInstalling"));
        deferredPrompt = null;
        setCanInstall(false);
      } catch {
        toast.error(t("subscription.install.toastPromptError"));
      }
      return;
    }
    if (isIOS()) {
      toast.info(t("subscription.install.toastIos"));
      return;
    }
    toast.info(t("subscription.install.toastGeneric"));
  }

  return (
    <Button
      onClick={handle}
      size={compact ? "sm" : "default"}
      variant={canInstall ? "default" : "outline"}
      className={compact ? "h-8" : ""}
    >
      <Download className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    const now = Date.now();
    // Re-ask after 7 days
    if (now - dismissed < 7 * 24 * 3600 * 1000) return;

    const timer = window.setTimeout(() => setOpen(true), 2500);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") toast.success(t("subscription.install.toastInstalling"));
        deferredPrompt = null;
      } catch { /* noop */ }
    } else if (isIOS()) {
      toast.info(t("subscription.install.dialog.iosHint"));
    } else {
      toast.info(t("subscription.install.dialog.genericHint"));
    }
    dismiss();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-md">
            <Smartphone className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">{t("subscription.install.dialog.title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("subscription.install.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="ghost" onClick={dismiss}><X className="mr-1.5 h-4 w-4" />{t("subscription.install.dialog.later")}</Button>
          <Button onClick={install}><Download className="mr-1.5 h-4 w-4" />{t("subscription.install.dialog.install")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
