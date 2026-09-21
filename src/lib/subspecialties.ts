export interface Subspecialty {
  id: string;
  label: string;
  description: string;
  label_en: string;
  description_en: string;
  icon: string;
}

// Sub-specialties available for Médecine interne
export const INTERNAL_SUBSPECIALTIES: Subspecialty[] = [
  { id: "cardiologie", label: "Cardiologie", description: "Pathologies cardiovasculaires : IDM, insuffisance cardiaque, arythmies…", label_en: "Cardiology", description_en: "Cardiovascular diseases: MI, heart failure, arrhythmias…", icon: "HeartPulse" },
  { id: "pneumologie", label: "Pneumologie", description: "Pathologies respiratoires : asthme, BPCO, pneumonies, embolies…", label_en: "Pulmonology", description_en: "Respiratory diseases: asthma, COPD, pneumonia, embolism…", icon: "Wind" },
  { id: "nephrologie", label: "Néphrologie", description: "Reins et voies urinaires : IRA, IRC, glomérulopathies…", label_en: "Nephrology", description_en: "Kidneys and urinary tract: AKI, CKD, glomerulopathies…", icon: "Droplets" },
  { id: "gastroenterologie", label: "Gastro-entérologie", description: "Tube digestif : douleurs abdominales, MICI, hémorragies…", label_en: "Gastroenterology", description_en: "Digestive tract: abdominal pain, IBD, bleeding…", icon: "Utensils" },
  { id: "hepatologie", label: "Hépatologie", description: "Foie et voies biliaires : cirrhose, hépatites, cholestases…", label_en: "Hepatology", description_en: "Liver and biliary tract: cirrhosis, hepatitis, cholestasis…", icon: "Leaf" },
  { id: "hematologie", label: "Hématologie", description: "Sang et moelle : anémies, leucémies, coagulopathies…", label_en: "Hematology", description_en: "Blood and bone marrow: anemia, leukemia, coagulopathies…", icon: "TestTube" },
  { id: "endocrinologie", label: "Endocrinologie", description: "Hormones : diabète, thyroïde, surrénales, hypophyse…", label_en: "Endocrinology", description_en: "Hormones: diabetes, thyroid, adrenal glands, pituitary…", icon: "Activity" },
  { id: "infectiologie", label: "Maladies infectieuses & parasitaires", description: "Bactéries, virus, parasites : sepsis, VIH, tuberculose, paludisme…", label_en: "Infectious & parasitic diseases", description_en: "Bacteria, viruses, parasites: sepsis, HIV, tuberculosis, malaria…", icon: "Bug" },
  { id: "rhumatologie", label: "Rhumatologie", description: "Articulations et os : PR, spondylarthropathies, arthroses…", label_en: "Rheumatology", description_en: "Joints and bones: RA, spondyloarthropathies, osteoarthritis…", icon: "Bone" },
  { id: "neurologie", label: "Neurologie", description: "Système nerveux : AVC, épilepsie, SEP, syndromes démentiels…", label_en: "Neurology", description_en: "Nervous system: stroke, epilepsy, MS, dementia syndromes…", icon: "Brain" },
  { id: "immunologie", label: "Immunologie & maladies systémiques", description: "Lupus, vascularites, connectivites, déficits immunitaires…", label_en: "Immunology & systemic diseases", description_en: "Lupus, vasculitis, connective tissue diseases, immune deficiencies…", icon: "ShieldCheck" },
  { id: "oncologie", label: "Oncologie médicale", description: "Cancers solides et hématologiques, urgences oncologiques…", label_en: "Medical oncology", description_en: "Solid and hematologic cancers, oncologic emergencies…", icon: "Ribbon" },
];

export function getSubspecialty(id: string): Subspecialty | undefined {
  return INTERNAL_SUBSPECIALTIES.find((s) => s.id === id);
}

export function subspecialtyLabel(id: string, lang: "fr" | "en" = "fr"): string {
  const s = getSubspecialty(id);
  if (!s) return id;
  return lang === "en" ? s.label_en : s.label;
}

export function subspecialtyDescription(id: string, lang: "fr" | "en" = "fr"): string {
  const s = getSubspecialty(id);
  if (!s) return "";
  return lang === "en" ? s.description_en : s.description;
}
