export type SpecialtyId =
  | "medecine_interne"
  | "chirurgie"
  | "pediatrie"
  | "gynecologie"
  | "psychiatrie"
  | "urgences";

export interface Specialty {
  id: SpecialtyId;
  label: string;
  description: string;
  label_en: string;
  description_en: string;
  icon: string; // lucide icon name
  accent: string; // tailwind color class
}

export const SPECIALTIES: Specialty[] = [
  {
    id: "medecine_interne",
    label: "Médecine interne",
    description: "Cas complexes, pathologies systémiques, raisonnement clinique global.",
    label_en: "Internal medicine",
    description_en: "Complex cases, systemic diseases, global clinical reasoning.",
    icon: "Stethoscope",
    accent: "from-primary to-primary-glow",
  },
  {
    id: "chirurgie",
    label: "Chirurgie",
    description: "Urgences abdominales, traumatologie, indications opératoires.",
    label_en: "Surgery",
    description_en: "Abdominal emergencies, trauma, surgical indications.",
    icon: "Scissors",
    accent: "from-primary-glow to-accent",
  },
  {
    id: "pediatrie",
    label: "Pédiatrie",
    description: "Nourrissons et enfants : adaptez votre interrogatoire aux parents.",
    label_en: "Pediatrics",
    description_en: "Infants and children: adapt your history-taking to the parents.",
    icon: "Baby",
    accent: "from-gold to-warning",
  },
  {
    id: "gynecologie",
    label: "Gynécologie & obstétrique",
    description: "Pathologies gynéco, suivi de grossesse, urgences obstétricales.",
    label_en: "Gynecology & obstetrics",
    description_en: "Gynecological conditions, pregnancy follow-up, obstetric emergencies.",
    icon: "HeartPulse",
    accent: "from-primary to-accent",
  },
  {
    id: "psychiatrie",
    label: "Psychiatrie",
    description: "Entretien semi-structuré, sémiologie psychiatrique, conduite à tenir.",
    label_en: "Psychiatry",
    description_en: "Semi-structured interview, psychiatric semiology, management plan.",
    icon: "Brain",
    accent: "from-primary-glow to-primary",
  },
  {
    id: "urgences",
    label: "Médecine d'urgence",
    description: "Tri rapide, détresses vitales, prises de décision sous pression.",
    label_en: "Emergency medicine",
    description_en: "Rapid triage, life-threatening emergencies, decisions under pressure.",
    icon: "Siren",
    accent: "from-destructive to-warning",
  },
];

export function getSpecialty(id: string): Specialty | undefined {
  return SPECIALTIES.find((s) => s.id === id);
}

export function specialtyLabel(id: string, lang: "fr" | "en" = "fr"): string {
  const s = getSpecialty(id);
  if (!s) return id;
  return lang === "en" ? s.label_en : s.label;
}

export function specialtyDescription(id: string, lang: "fr" | "en" = "fr"): string {
  const s = getSpecialty(id);
  if (!s) return "";
  return lang === "en" ? s.description_en : s.description;
}

export const EXAM_CATEGORIES = {
  physical: {
    label: "Examen physique",
    label_en: "Physical exam",
    items: [
      "Inspection générale",
      "Constantes vitales (TA, FC, FR, T°, SpO2)",
      "Palpation abdominale",
      "Percussion",
      "Auscultation cardiaque",
      "Auscultation pulmonaire",
      "Examen neurologique",
      "Examen cardiovasculaire complet",
      "Examen ORL",
      "Examen ostéo-articulaire",
      "Examen cutané",
      "Examen gynécologique",
      "Touchers pelviens",
    ],
    items_en: [
      "General inspection",
      "Vital signs (BP, HR, RR, Temp, SpO2)",
      "Abdominal palpation",
      "Percussion",
      "Cardiac auscultation",
      "Pulmonary auscultation",
      "Neurological exam",
      "Full cardiovascular exam",
      "ENT exam",
      "Musculoskeletal exam",
      "Skin exam",
      "Gynecological exam",
      "Pelvic exams",
    ],
  },
  biology: {
    label: "Examens biologiques",
    label_en: "Lab tests",
    items: [
      "NFS",
      "CRP",
      "VS",
      "Ionogramme sanguin",
      "Urée / Créatinine",
      "ASAT / ALAT / GGT / PAL",
      "Bilirubine totale et conjuguée",
      "Glycémie",
      "Lipase",
      "Troponine HS",
      "BNP",
      "TP / TCA / INR",
      "Gaz du sang artériel",
      "Lactates",
      "ECBU",
      "Hémocultures",
      "Bandelette urinaire",
      "ßhCG",
      "TSH",
      "HbA1c",
      "Ponction lombaire (analyse du LCR)",
      "Bilan lipidique",
      "Ferritine / Bilan martial",
    ],
    items_en: [
      "CBC",
      "CRP",
      "ESR",
      "Blood electrolytes",
      "Urea / Creatinine",
      "AST / ALT / GGT / ALP",
      "Total and conjugated bilirubin",
      "Blood glucose",
      "Lipase",
      "High-sensitivity troponin",
      "BNP",
      "PT / aPTT / INR",
      "Arterial blood gas",
      "Lactate",
      "Urine culture",
      "Blood cultures",
      "Urine dipstick",
      "ßhCG",
      "TSH",
      "HbA1c",
      "Lumbar puncture (CSF analysis)",
      "Lipid panel",
      "Ferritin / Iron studies",
    ],
  },
  imaging: {
    label: "Imagerie et explorations",
    label_en: "Imaging and other tests",
    items: [
      "ECG 12 dérivations",
      "Radiographie thoracique",
      "Radiographie ASP",
      "Échographie abdominale",
      "Échographie cardiaque (ETT)",
      "Échographie pelvienne / obstétricale",
      "Doppler veineux des membres inférieurs",
      "Scanner cérébral",
      "Scanner thoracique",
      "Scanner abdomino-pelvien",
      "IRM cérébrale",
      "IRM médullaire",
      "Endoscopie digestive haute",
      "Coloscopie",
      "Fibroscopie bronchique",
      "Électromyogramme (EMG)",
      "Électroencéphalogramme (EEG)",
      "Épreuves fonctionnelles respiratoires (EFR)",
      "ECG d'effort",
    ],
    items_en: [
      "12-lead ECG",
      "Chest X-ray",
      "Abdominal X-ray",
      "Abdominal ultrasound",
      "Echocardiogram (TTE)",
      "Pelvic / obstetric ultrasound",
      "Lower limb venous Doppler",
      "Brain CT scan",
      "Chest CT scan",
      "Abdominopelvic CT scan",
      "Brain MRI",
      "Spinal MRI",
      "Upper GI endoscopy",
      "Colonoscopy",
      "Bronchoscopy",
      "Electromyogram (EMG)",
      "Electroencephalogram (EEG)",
      "Pulmonary function tests (PFT)",
      "Exercise ECG",
    ],
  },
} as const;

export type ExamCategoryId = keyof typeof EXAM_CATEGORIES;

export function examCategoryLabel(cat: ExamCategoryId, lang: "fr" | "en" = "fr"): string {
  const c = EXAM_CATEGORIES[cat];
  return lang === "en" ? c.label_en : c.label;
}

/** Returns the item name in the target language, falling back to the given name (French key) if not found. */
export function examPresetLabel(cat: ExamCategoryId, name: string, lang: "fr" | "en" = "fr"): string {
  if (lang !== "en") return name;
  const c = EXAM_CATEGORIES[cat];
  const idx = (c.items as readonly string[]).indexOf(name);
  if (idx === -1) return name;
  return (c.items_en as readonly string[])[idx] ?? name;
}
