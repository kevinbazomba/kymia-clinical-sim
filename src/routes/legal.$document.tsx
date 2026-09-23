import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { KymiaFooter } from "@/components/KymiaFooter";

type DocumentContent = { title: string; intro: string; sections: Array<{ title: string; body: string }> };

const documents: Record<string, DocumentContent> = {
  "a-propos": { title: "À propos de Kymia", intro: "Kymia est une plateforme d’apprentissage et de simulation clinique conçue pour accompagner les étudiants en médecine et les jeunes professionnels de santé.", sections: [{ title: "Notre approche", body: "La simulation clinique permet de s’entraîner, d’identifier ses lacunes et de consolider son raisonnement dans une démarche pédagogique progressive." }] },
  "notre-mission": { title: "Notre mission", intro: "Aider chaque apprenant à progresser avec méthode, feedback et régularité.", sections: [{ title: "Une progression durable", body: "Kymia encourage le cycle : consulter, comprendre ses erreurs, réviser, puis revenir s’entraîner plus fort." }] },
  faq: { title: "Questions fréquentes", intro: "Retrouvez ici les réponses aux questions courantes concernant Kymia.", sections: [{ title: "Besoin d’aide ?", body: "Pour toute question relative à votre compte ou à votre utilisation de la plateforme, contactez l’assistance à kymialab@gmail.com." }] },
  "centre-aide": { title: "Centre d’aide", intro: "Un espace d’accompagnement pour utiliser Kymia sereinement.", sections: [{ title: "Assistance", body: "Écrivez à kymialab@gmail.com en précisant l’adresse e-mail associée à votre compte et une description de votre demande." }] },
  "ressources-pedagogiques": { title: "Ressources pédagogiques", intro: "Des ressources complémentaires pour approfondir vos révisions.", sections: [{ title: "Apprendre avec méthode", body: "Utilisez vos rapports de correction pour cibler les notions à revoir avant votre prochaine simulation." }] },
  "support-utilisateur": { title: "Support utilisateur", intro: "L’équipe Kymia reste disponible pour vous accompagner.", sections: [{ title: "Nous contacter", body: "E-mail : kymialab@gmail.com — Téléphone / WhatsApp : +243 990 918 446." }] },
  "mentions-legales": editableLegal("Mentions légales", "Cette page est un modèle à compléter avant publication avec l’identité de l’éditeur, son adresse, ses informations d’immatriculation lorsqu’elles s’appliquent, ainsi que les coordonnées du responsable de publication."),
  cgu: editableLegal("Conditions générales d’utilisation", "Les conditions d’utilisation complètes doivent être définies et validées par le responsable de Kymia avant publication. Elles préciseront notamment les règles d’accès et d’usage de la plateforme."),
  "politique-confidentialite": editableLegal("Politique de confidentialité", "Cette politique doit être complétée avec les informations exactes sur les données traitées, leurs finalités, durées de conservation, destinataires et modalités d’exercice des droits."),
  "politique-cookies": editableLegal("Politique de cookies", "Cette page doit documenter les cookies effectivement utilisés par Kymia et les choix disponibles. Les cookies nécessaires au fonctionnement peuvent rester actifs."),
  "politique-remboursement": editableLegal("Politique de remboursement", "Cette politique doit être complétée avec les conditions commerciales et de remboursement applicables aux offres Kymia avant publication."),
};

function editableLegal(title: string, intro: string): DocumentContent {
  return { title, intro, sections: [{ title: "Informations à compléter", body: "Ce contenu est volontairement présenté comme un modèle éditable : aucune adresse, immatriculation, représentant légal ou condition commerciale n’a été inventé. Complétez et faites valider ces informations avant publication définitive." }, { title: "Contact", body: "Pour toute question, vous pouvez contacter Kymia à l’adresse kymialab@gmail.com ou au +243 990 918 446." }] };
}

export const Route = createFileRoute("/legal/$document")({ component: LegalDocumentPage });

function LegalDocumentPage() {
  const { document } = Route.useParams();
  const content = documents[document] ?? documents["mentions-legales"];
  return <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-secondary/40"><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16"><Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" />Retour à Kymia</Link><article className="mt-6 rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></div><h1 className="mt-5 font-serif text-3xl text-foreground sm:text-4xl">{content.title}</h1><p className="mt-4 leading-7 text-muted-foreground">{content.intro}</p><div className="mt-8 space-y-7">{content.sections.map((section) => <section key={section.title}><h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><FileText className="h-4 w-4 text-primary" />{section.title}</h2><p className="mt-2 leading-7 text-muted-foreground">{section.body}</p></section>)}</div></article></main><KymiaFooter /></div>;
}
