# Modernisation UX/UI de Kymia

Objectif : améliorer l'accueil, l'inscription et les états de chargement — sans toucher aux fonctionnalités existantes (consultations, Jury, historique, admin, classement, PWA, MCP).

## 1. Section "Mode d'emploi" sur la page d'accueil

Ajout dans `src/routes/_authenticated/home.tsx` d'un bloc pédagogique clair et illustré, placé sous la présentation, avant le classement.

Contenu (6 cartes numérotées, icônes Lucide) :
1. Lancer une consultation — choisir une spécialité puis un cas généré par Kymia Motcho.
2. Interroger et examiner — dialoguer librement avec le patient, demander examen physique / bilans / imagerie.
3. Mettre en pause / Reprendre — bouton Pause : la consultation est sauvegardée et reprise à l'identique depuis l'historique.
4. Poser le diagnostic — remplir la fiche (principal, différentiels, arguments, conduite à tenir).
5. Consulter la correction et l'historique — rapport détaillé, cours de référence, export PDF, disponible dans "Historique".
6. Participer au Jury Kymia — épreuve hebdomadaire chronométrée (Ven 00:00 → Dim 23:59, Kinshasa).

Design : grille responsive (1/2/3 colonnes), cartes semi-transparentes avec `--gradient-primary`, texte court, ton pédagogique.

## 2. Inscription multi-étapes

Refonte de la branche `mode === "signup"` dans `src/routes/auth.tsx` (extraite en composant `SignupWizard`). Le mode `signin` et `reset` restent inchangés.

Étapes (indicateur de progression en haut : "Étape X sur 5") :
1. **Bienvenue** — présentation courte + bouton "Commencer mon inscription".
2. **Informations personnelles** — Nom, Prénom, Profession (select existant), Pays (select drapeau + nom, réutilise `COUNTRY_CODES`).
3. **Coordonnées** — Email + WhatsApp. L'indicatif est **auto-sélectionné** depuis le pays choisi à l'étape 2 (mais modifiable).
4. **Sécurité** — Mot de passe + confirmation, toggle 👁, indicateur de force (faible/moyen/fort — règles : longueur, casse, chiffre, symbole).
5. **Validation** — récap lecture seule + bouton "Créer mon compte" → animation de succès (check animé, `scale-in` + `fade-in`) → redirection.

Persistance : nouveaux champs `first_name`, `last_name`, `country` déjà partiellement présents sur `profiles` (à vérifier ; migration légère si `first_name`/`last_name` manquent). `display_name` = `Prénom Nom`. Aucun changement au flux Supabase `signUp`.

Validation : zod par étape, boutons Précédent/Suivant, désactivés tant que le formulaire n'est pas valide.

## 3. Auth Google et Apple

Sur `auth.tsx` (signin ET signup wizard étape 1) : deux boutons "Continuer avec Google" / "Continuer avec Apple" au-dessus du formulaire, avec séparateur "ou".

Implémentation : appel de `payments`-style tool `supabase--configure_social_auth` avec `providers: ["google", "apple"]` (Lovable Cloud managed — pas de credentials à demander). Utilisation du module `@/integrations/lovable/index` généré (`lovable.auth.signInWithOAuth`). Le nom/prénom sont récupérés depuis les métadonnées OAuth et copiés dans `profiles` par un `onAuthStateChange` (upsert idempotent) — pas de doublon car Supabase Auth unifie sur l'email.

`redirect_uri: window.location.origin` (le préview iframe est géré par le SDK).

## 4. Skeleton Loaders

Création de `src/components/skeletons/` avec composants dédiés reproduisant la structure réelle :
- `HomeSkeleton`, `ConsultationCaseSkeleton`, `ExamResultsSkeleton`, `HistorySkeleton`, `LeaderboardSkeleton`, `JurySkeleton`, `ProfileSkeleton`, `ReportSkeleton`, `PdfSkeleton`.

Base : shadcn `Skeleton` (déjà présent) + `animate-pulse`. Transition contenu réel : wrapper `<div className="animate-fade-in">`.

Remplacement des `<Loader2 />` de chargement principal dans :
- `home.tsx`, `consultation.$id.tsx`, `ExamResultsPanel.tsx`, `history.tsx`, `jury.tsx`, `jury-history.tsx`, `profile.tsx`, `report.$id.tsx`, `premium.tsx` (leaderboard).

Les spinners restent uniquement pour les actions bouton (submit).

## Détails techniques

- Migration DB (si besoin) : `ALTER TABLE profiles ADD COLUMN first_name text, last_name text` (idempotent avec `IF NOT EXISTS`).
- Aucune modification de `consultation.functions.ts`, `jury.functions.ts`, `access.functions.ts`, routes admin, MCP.
- Google/Apple activés via `supabase--configure_social_auth` — Apple utilise les credentials managés Lovable Cloud (BYOC non demandé).
- Responsive : grilles Tailwind `sm:grid-cols-2 lg:grid-cols-3`, wizard `max-w-md` mobile-first.

## Livraison en une passe
1. Migration DB (colonnes profil).
2. Activation OAuth Google + Apple.
3. Skeletons + intégration.
4. Wizard inscription + section mode d'emploi accueil.
5. Vérification typecheck + parcours préview.
