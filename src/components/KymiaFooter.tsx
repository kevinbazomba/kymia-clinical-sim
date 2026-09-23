import { Link } from "@tanstack/react-router";
import { Activity, CircleHelp, ExternalLink, Mail, Music2, Phone, ShieldCheck, Youtube } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const legalLinks = [
  ["Mentions légales", "mentions-legales"], ["Conditions générales d’utilisation (CGU)", "cgu"],
  ["Politique de confidentialité", "politique-confidentialite"], ["Politique de cookies", "politique-cookies"],
  ["Politique de remboursement", "politique-remboursement"],
] as const;

const resourceLinks = [
  ["Centre d’aide", "centre-aide"], ["Salle de garde", "/salle-de-garde"],
  ["Ressources pédagogiques", "ressources-pedagogiques"], ["Support utilisateur", "support-utilisateur"],
] as const;

function InternalFooterLink({ label, target }: { label: string; target: string }) {
  const href = target.startsWith("/") ? target : `/legal/${target}`;
  return <a href={href} className="text-sm text-muted-foreground transition hover:text-primary">{label}</a>;
}

export function KymiaFooter() {
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  return (
    <footer className="mt-auto border-t bg-card/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <section>
            <Link to="/" className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground"><Activity className="h-5 w-5" /></span>Kymia
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Une expérience d’apprentissage clinique pensée pour progresser avec méthode et confiance.</p>
            <div className="mt-4 space-y-2 text-sm">
              <InternalFooterLink label="À propos de Kymia" target="a-propos" />
              <InternalFooterLink label="Notre mission" target="notre-mission" />
              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Contact / Assistance</p>
              <a href="mailto:kymialab@gmail.com" className="flex items-center gap-2 text-muted-foreground transition hover:text-primary"><Mail className="h-4 w-4" />kymialab@gmail.com</a>
              <a href="tel:+243990918446" className="flex items-center gap-2 text-muted-foreground transition hover:text-primary"><Phone className="h-4 w-4" />+243 990 918 446</a>
              <InternalFooterLink label="FAQ" target="faq" />
            </div>
          </section>

          <FooterColumn title="Informations légales">
            {legalLinks.map(([label, target]) => <InternalFooterLink key={target} label={label} target={target} />)}
            <button type="button" onClick={() => setCookieDialogOpen(true)} className="text-left text-sm text-muted-foreground transition hover:text-primary">Gérer mes préférences de cookies</button>
          </FooterColumn>

          <FooterColumn title="Ressources">
            {resourceLinks.map(([label, target]) => <InternalFooterLink key={target} label={label} target={target} />)}
          </FooterColumn>

          <FooterColumn title="Nous suivre">
            <a href="https://www.tiktok.com/@ceo.de.kymia?_r=1&_t=ZN-99z6ss0PDWg" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"><Music2 className="h-4 w-4" />TikTok <ExternalLink className="h-3 w-3" /></a>
            <a href="https://youtube.com/@draworfitmedia?si=_DnJf4A8MfYc_t3J" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"><Youtube className="h-4 w-4" />YouTube <ExternalLink className="h-3 w-3" /></a>
            <a href="https://draworfit.mychariow.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"><CircleHelp className="h-4 w-4" />Nos produits <ExternalLink className="h-3 w-3" /></a>
          </FooterColumn>
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="max-w-4xl text-xs leading-5 text-muted-foreground">Kymia est une plateforme d’apprentissage et de simulation clinique destinée aux étudiants en médecine et aux jeunes professionnels de santé. Elle ne remplace pas la formation clinique, l’encadrement des enseignants, le stage hospitalier ni l’avis d’un professionnel de santé.</p>
          <p className="mt-4 text-xs text-muted-foreground">© 2026 Kymia — Tous droits réservés.</p>
        </div>
      </div>
      <CookiePreferences open={cookieDialogOpen} onOpenChange={setCookieDialogOpen} />
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-sm font-semibold text-foreground">{title}</h2><div className="mt-4 flex flex-col items-start gap-2.5">{children}</div></section>;
}

function CookiePreferences({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle className="font-serif text-2xl">Préférences de cookies</DialogTitle></DialogHeader><div className="space-y-4 text-sm text-muted-foreground"><p>Les cookies strictement nécessaires au fonctionnement et à la sécurité de Kymia restent actifs. Aucune préférence optionnelle n’est activée depuis cette fenêtre.</p><div className="rounded-xl border bg-secondary/50 p-3"><p className="font-medium text-foreground">Cookies nécessaires</p><p className="mt-1 text-xs">Connexion, sécurité et conservation de vos réglages essentiels.</p></div><p className="text-xs">Les informations détaillées et les futurs choix optionnels pourront être renseignés sur la page Politique de cookies.</p></div><Button className="mt-2 w-full" onClick={() => onOpenChange(false)}>Fermer</Button></DialogContent></Dialog>;
}
