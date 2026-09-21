/**
 * Banque de pathologies KYMIA — orientée réalités épidémiologiques africaines.
 * weight = importance clinique / fréquence réelle (1 = rare mais formatrice, 5 = incontournable).
 * Le moteur de sélection combine ce poids avec l'historique de l'utilisateur et l'usage global.
 */
export interface PathologyEntry {
  key: string;
  label: string;
  weight: number;
  /** familles sémiologiques — sert à repérer les cas "sensiblement similaires" (dyspnée, fièvre…) */
  families: string[];
}

type Bank = Record<string, PathologyEntry[]>;

const p = (key: string, label: string, weight: number, families: string[]): PathologyEntry => ({
  key, label, weight, families,
});

/** Médecine interne — par sous-spécialité (ids de src/lib/subspecialties.ts) */
export const INTERNE_BANK: Bank = {
  cardiologie: [
    p("cardiopathie_hypertensive", "Cardiopathie hypertensive", 5, ["dyspnee", "hta"]),
    p("insuffisance_cardiaque", "Insuffisance cardiaque congestive", 5, ["dyspnee", "oedemes"]),
    p("cardiomyopathie_dilatee", "Cardiomyopathie dilatée (dont péripartum)", 4, ["dyspnee", "oedemes"]),
    p("valvulopathie_rhumatismale", "Valvulopathie post-rhumatismale (RAA)", 5, ["dyspnee", "souffle"]),
    p("endocardite_infectieuse", "Endocardite infectieuse", 3, ["fievre", "souffle"]),
    p("pericardite_tuberculeuse", "Péricardite (souvent tuberculeuse)", 4, ["douleur_thoracique", "dyspnee"]),
    p("myocardite", "Myocardite aiguë", 2, ["douleur_thoracique", "dyspnee"]),
    p("syndrome_coronarien_aigu", "Syndrome coronarien aigu / IDM", 4, ["douleur_thoracique"]),
    p("trouble_du_rythme", "Trouble du rythme (FA, flutter, BAV)", 4, ["palpitations", "syncope"]),
    p("cardiopathie_congenitale", "Cardiopathie congénitale révélée tardivement", 2, ["dyspnee", "cyanose"]),
    p("coeur_pulmonaire_chronique", "Cœur pulmonaire chronique", 3, ["dyspnee", "oedemes"]),
    p("maladie_thromboembolique", "Maladie thromboembolique veineuse / embolie pulmonaire", 4, ["dyspnee", "douleur_thoracique"]),
    p("hta_maligne", "HTA maligne et retentissement viscéral", 4, ["hta", "cephalees"]),
    p("fibrose_endomyocardique", "Fibrose endomyocardique", 1, ["dyspnee", "oedemes"]),
    p("cardiopathie_anemique", "Cardiopathie de l'anémie chronique (drépanocytose, carence)", 3, ["dyspnee", "asthenie"]),
  ],
  pneumologie: [
    p("tuberculose_pulmonaire", "Tuberculose pulmonaire", 5, ["toux", "fievre", "amaigrissement"]),
    p("pneumonie_communautaire", "Pneumonie aiguë communautaire", 5, ["fievre", "toux", "dyspnee"]),
    p("asthme", "Asthme (exacerbation)", 4, ["dyspnee", "sifflement"]),
    p("bpco", "BPCO et exacerbation (biomasse, tabac)", 4, ["dyspnee", "toux"]),
    p("pleuresie", "Pleurésie sérofibrineuse / empyème", 4, ["douleur_thoracique", "fievre", "dyspnee"]),
    p("dilatation_bronches", "Dilatation des bronches post-tuberculeuse", 3, ["toux", "hemoptysie"]),
    p("aspergillome", "Aspergillome sur séquelle tuberculeuse", 2, ["hemoptysie"]),
    p("pneumocystose", "Pneumocystose pulmonaire (VIH)", 3, ["dyspnee", "fievre"]),
    p("cancer_bronchique", "Cancer bronchopulmonaire", 3, ["toux", "amaigrissement", "hemoptysie"]),
    p("pneumothorax", "Pneumothorax spontané", 3, ["douleur_thoracique", "dyspnee"]),
    p("oedeme_pulmonaire", "Œdème aigu pulmonaire", 4, ["dyspnee"]),
    p("sarcoidose", "Sarcoïdose", 1, ["dyspnee", "toux"]),
    p("pneumoconiose", "Pneumoconiose (mines, carrières)", 2, ["dyspnee", "toux"]),
  ],
  nephrologie: [
    p("gn_aigue_post_infectieuse", "Glomérulonéphrite aiguë post-infectieuse", 4, ["oedemes", "hematurie"]),
    p("syndrome_nephrotique", "Syndrome néphrotique", 4, ["oedemes", "proteinurie"]),
    p("irc_hypertensive", "Insuffisance rénale chronique (HTA, diabète)", 5, ["asthenie", "oedemes"]),
    p("ira_fonctionnelle", "Insuffisance rénale aiguë fonctionnelle (déshydratation, paludisme)", 5, ["oligurie", "fievre"]),
    p("nephropathie_vih", "Néphropathie associée au VIH", 3, ["oedemes", "proteinurie"]),
    p("pyelonephrite", "Pyélonéphrite aiguë", 4, ["fievre", "douleur_lombaire"]),
    p("lithiase_urinaire", "Lithiase urinaire et colique néphrétique", 4, ["douleur_lombaire", "hematurie"]),
    p("nephrotoxicite", "Néphrotoxicité (AINS, aminosides, plantes)", 4, ["oligurie"]),
    p("nephropathie_drepanocytaire", "Néphropathie drépanocytaire", 3, ["hematurie", "proteinurie"]),
    p("schistosomiase_urinaire", "Bilharziose urinaire", 3, ["hematurie"]),
    p("hyperkaliemie", "Troubles hydro-électrolytiques sévères", 3, ["asthenie", "palpitations"]),
  ],
  gastroenterologie: [
    p("ulcere_gastroduodenal", "Ulcère gastroduodénal (H. pylori)", 5, ["douleur_abdominale"]),
    p("amibiase_intestinale", "Amibiase intestinale", 4, ["diarrhee", "douleur_abdominale"]),
    p("fievre_typhoide", "Fièvre typhoïde digestive", 4, ["fievre", "douleur_abdominale", "diarrhee"]),
    p("parasitose_intestinale", "Helminthiases intestinales (ascaridiose, ankylostomose)", 4, ["douleur_abdominale", "anemie"]),
    p("diarrhee_chronique_vih", "Diarrhée chronique du VIH", 3, ["diarrhee", "amaigrissement"]),
    p("hemorragie_digestive", "Hémorragie digestive haute", 4, ["hematemese", "anemie"]),
    p("mici", "MICI (Crohn, RCH)", 2, ["diarrhee", "douleur_abdominale"]),
    p("cancer_gastrique", "Cancer gastrique ou colorectal", 3, ["amaigrissement", "douleur_abdominale"]),
    p("pancreatite_aigue", "Pancréatite aiguë", 3, ["douleur_abdominale", "vomissements"]),
    p("colopathie_fonctionnelle", "Trouble fonctionnel intestinal", 2, ["douleur_abdominale"]),
    p("cholera", "Choléra / diarrhée aiguë épidémique", 3, ["diarrhee", "deshydratation"]),
  ],
  hepatologie: [
    p("hepatite_b_chronique", "Hépatite B chronique", 5, ["ictere", "asthenie"]),
    p("hepatite_c", "Hépatite C", 3, ["asthenie", "ictere"]),
    p("cirrhose", "Cirrhose et ses complications", 5, ["ascite", "ictere"]),
    p("carcinome_hepatocellulaire", "Carcinome hépatocellulaire", 4, ["douleur_abdominale", "amaigrissement"]),
    p("abces_amibien_foie", "Abcès amibien du foie", 4, ["fievre", "douleur_abdominale"]),
    p("hepatite_medicamenteuse", "Hépatite toxique (antituberculeux, plantes)", 4, ["ictere"]),
    p("hepatite_virale_aigue", "Hépatite virale aiguë A/E", 3, ["ictere", "fievre"]),
    p("lithiase_biliaire", "Lithiase biliaire / angiocholite", 4, ["ictere", "fievre", "douleur_abdominale"]),
    p("bilharziose_hepatosplenique", "Bilharziose hépatosplénique", 3, ["ascite", "splenomegalie"]),
    p("steatose_metabolique", "Stéatose hépatique métabolique", 2, ["asthenie"]),
  ],
  hematologie: [
    p("drepanocytose", "Drépanocytose et crises vaso-occlusives", 5, ["douleur", "anemie"]),
    p("anemie_ferriprive", "Anémie ferriprive (parasitoses, carence)", 5, ["anemie", "asthenie"]),
    p("anemie_paludisme", "Anémie hémolytique du paludisme", 5, ["fievre", "anemie"]),
    p("leucemie_aigue", "Leucémie aiguë", 3, ["fievre", "anemie", "saignement"]),
    p("lymphome_burkitt", "Lymphome (dont Burkitt)", 3, ["adenopathies", "masse"]),
    p("myelome", "Myélome multiple", 2, ["douleur_osseuse", "anemie"]),
    p("purpura_thrombopenique", "Purpura thrombopénique", 3, ["saignement"]),
    p("cid", "CIVD (sepsis, obstétrique)", 2, ["saignement", "choc"]),
    p("anemie_megaloblastique", "Anémie mégaloblastique", 3, ["anemie", "asthenie"]),
    p("g6pd", "Déficit en G6PD et hémolyse médicamenteuse", 3, ["ictere", "anemie"]),
  ],
  endocrinologie: [
    p("diabete_type2", "Diabète de type 2 et complications", 5, ["polyurie", "asthenie"]),
    p("acidocetose", "Acidocétose diabétique", 4, ["vomissements", "dyspnee"]),
    p("coma_hyperosmolaire", "Coma hyperosmolaire", 3, ["confusion", "deshydratation"]),
    p("pied_diabetique", "Pied diabétique infecté", 4, ["plaie", "fievre"]),
    p("goitre_carence_iode", "Goitre / carence iodée", 4, ["masse_cervicale"]),
    p("hyperthyroidie", "Hyperthyroïdie (Basedow)", 3, ["palpitations", "amaigrissement"]),
    p("hypothyroidie", "Hypothyroïdie", 3, ["asthenie", "prise_poids"]),
    p("insuffisance_surrenale", "Insuffisance surrénale (dont tuberculeuse)", 2, ["asthenie", "hypotension"]),
    p("diabete_type1", "Diabète de type 1 révélé chez l'adolescent", 3, ["polyurie", "amaigrissement"]),
    p("hypoglycemie", "Hypoglycémie sévère (quinine, sulfamides)", 3, ["confusion", "sueurs"]),
  ],
  infectiologie: [
    p("paludisme_grave", "Paludisme grave à P. falciparum", 5, ["fievre", "confusion", "anemie"]),
    p("paludisme_simple", "Paludisme simple", 5, ["fievre"]),
    p("tuberculose_extrapulmonaire", "Tuberculose extrapulmonaire (ganglionnaire, péritonéale, mal de Pott)", 5, ["fievre", "amaigrissement"]),
    p("vih_infections_opportunistes", "VIH au stade sida avec infection opportuniste", 5, ["fievre", "amaigrissement"]),
    p("cryptococcose", "Méningite à cryptocoque", 3, ["cephalees", "fievre"]),
    p("fievre_typhoide_inf", "Fièvre typhoïde et complications", 4, ["fievre", "douleur_abdominale"]),
    p("meningite_bacterienne", "Méningite bactérienne (ceinture méningitique)", 4, ["fievre", "cephalees"]),
    p("tetanos", "Tétanos", 3, ["contractures"]),
    p("rage", "Rage / exposition à morsure", 1, ["fievre", "agitation"]),
    p("fievre_hemorragique", "Fièvre hémorragique virale (Ebola, Marburg) — contexte épidémique", 2, ["fievre", "saignement"]),
    p("schistosomiase", "Bilharziose", 3, ["hematurie", "douleur_abdominale"]),
    p("trypanosomiase", "Trypanosomiase humaine africaine", 2, ["fievre", "somnolence"]),
    p("leishmaniose", "Leishmaniose viscérale", 1, ["fievre", "splenomegalie"]),
    p("sepsis_bacterien", "Sepsis à point de départ urinaire ou cutané", 4, ["fievre", "choc"]),
    p("covid_grippe", "Infection respiratoire virale épidémique", 3, ["fievre", "toux"]),
    p("hepatite_e_grossesse", "Hépatite E chez la femme enceinte", 2, ["ictere", "fievre"]),
  ],
  rhumatologie: [
    p("raa", "Rhumatisme articulaire aigu", 4, ["fievre", "arthralgies"]),
    p("arthrite_septique", "Arthrite septique", 4, ["fievre", "arthralgies"]),
    p("lombalgie_pott", "Mal de Pott / spondylodiscite", 4, ["douleur_dorsale", "fievre"]),
    p("polyarthrite_rhumatoide", "Polyarthrite rhumatoïde", 3, ["arthralgies"]),
    p("goutte", "Goutte", 3, ["arthralgies"]),
    p("arthrose", "Arthrose (gonarthrose, coxarthrose)", 4, ["arthralgies"]),
    p("drepanocytose_osteo", "Ostéonécrose / ostéomyélite drépanocytaire", 3, ["douleur_osseuse", "fievre"]),
    p("spondylarthrite", "Spondyloarthrite", 2, ["douleur_dorsale"]),
    p("rhumatisme_psoriasique", "Rhumatisme psoriasique", 1, ["arthralgies"]),
    p("osteomalacie", "Ostéomalacie / carence en vitamine D", 2, ["douleur_osseuse"]),
  ],
  neurologie: [
    p("avc_ischemique", "AVC ischémique", 5, ["deficit_moteur"]),
    p("avc_hemorragique", "AVC hémorragique sur HTA", 5, ["deficit_moteur", "cephalees"]),
    p("epilepsie", "Épilepsie et état de mal", 4, ["convulsions"]),
    p("neuropaludisme", "Neuropaludisme", 4, ["fievre", "coma"]),
    p("meningo_encephalite", "Méningo-encéphalite (dont herpétique, tuberculeuse)", 4, ["fievre", "confusion"]),
    p("neuropathie_peripherique", "Polyneuropathie (diabète, INH, VIH, alcool)", 4, ["paresthesies"]),
    p("compression_medullaire", "Compression médullaire (Pott, tumeur)", 3, ["deficit_moteur", "douleur_dorsale"]),
    p("cephalees_primaires", "Migraine et céphalées primaires", 3, ["cephalees"]),
    p("parkinson", "Maladie de Parkinson", 2, ["tremblement"]),
    p("guillain_barre", "Syndrome de Guillain-Barré", 2, ["deficit_moteur"]),
    p("demence", "Syndrome démentiel", 2, ["troubles_memoire"]),
    p("neurocysticercose", "Neurocysticercose", 2, ["convulsions"]),
  ],
  immunologie: [
    p("lupus", "Lupus érythémateux systémique", 3, ["arthralgies", "fievre", "eruption"]),
    p("sclerodermie", "Sclérodermie systémique", 1, ["raynaud", "dyspnee"]),
    p("vascularite", "Vascularite systémique", 2, ["fievre", "purpura"]),
    p("sarcoidose_syst", "Sarcoïdose systémique", 1, ["dyspnee", "adenopathies"]),
    p("syndrome_sec", "Syndrome de Gougerot-Sjögren", 1, ["secheresse", "arthralgies"]),
    p("deficit_immunitaire", "Déficit immunitaire secondaire", 2, ["infections_repetees"]),
    p("myosite", "Myopathie inflammatoire", 1, ["faiblesse_musculaire"]),
    p("still", "Maladie de Still de l'adulte", 1, ["fievre", "arthralgies"]),
  ],
  oncologie: [
    p("cancer_col_uterus", "Cancer du col de l'utérus", 5, ["saignement", "douleur_pelvienne"]),
    p("cancer_sein", "Cancer du sein", 5, ["masse"]),
    p("cancer_prostate", "Cancer de la prostate", 4, ["troubles_mictionnels"]),
    p("kaposi", "Sarcome de Kaposi (VIH)", 3, ["lesions_cutanees"]),
    p("cancer_foie", "Carcinome hépatocellulaire sur hépatite B", 4, ["douleur_abdominale", "amaigrissement"]),
    p("lymphome_onco", "Lymphome hodgkinien / non hodgkinien", 3, ["adenopathies", "fievre"]),
    p("cancer_estomac_onco", "Cancer digestif", 3, ["amaigrissement", "douleur_abdominale"]),
    p("retinoblastome", "Rétinoblastome de l'enfant", 2, ["masse", "leucocorie"]),
    p("urgence_oncologique", "Urgence oncologique (compression, hypercalcémie)", 2, ["douleur", "confusion"]),
  ],
};

/** Autres spécialités (clé "_" = pas de sous-spécialité imposée) */
export const SPECIALTY_BANK: Bank = {
  chirurgie: [
    p("appendicite", "Appendicite aiguë et complications", 5, ["douleur_abdominale", "fievre"]),
    p("occlusion_intestinale", "Occlusion intestinale (bride, volvulus, hernie étranglée)", 5, ["douleur_abdominale", "vomissements"]),
    p("hernie_etranglee", "Hernie inguinale étranglée", 4, ["douleur_abdominale", "masse"]),
    p("peritonite", "Péritonite (perforation typhique, ulcéreuse)", 5, ["douleur_abdominale", "fievre"]),
    p("traumatisme_abdominal", "Traumatisme abdominal fermé (AVP)", 4, ["traumatisme", "choc"]),
    p("traumatisme_cranien", "Traumatisme crânien", 4, ["traumatisme", "confusion"]),
    p("fracture_ouverte", "Fracture ouverte des membres", 4, ["traumatisme", "douleur"]),
    p("brulures", "Brûlures étendues", 3, ["plaie", "choc"]),
    p("abces_parties_molles", "Abcès et infections des parties molles", 4, ["fievre", "plaie"]),
    p("goitre_chirurgical", "Goitre compressif à opérer", 3, ["masse_cervicale"]),
    p("cancer_sein_chir", "Nodule du sein / cancer du sein", 4, ["masse"]),
    p("hemorroides_fistule", "Pathologie proctologique (hémorroïdes, fistule anale)", 3, ["douleur", "saignement"]),
    p("retention_urine", "Rétention aiguë d'urine (HBP, sténose urétrale)", 4, ["troubles_mictionnels"]),
    p("torsion_testicule", "Torsion du testicule", 3, ["douleur"]),
    p("plaie_par_arme", "Plaie pénétrante (arme blanche, arme à feu)", 3, ["traumatisme", "choc"]),
    p("pied_diabetique_chir", "Pied diabétique chirurgical", 4, ["plaie", "fievre"]),
    p("ulcere_de_buruli", "Ulcère de Buruli / ulcère chronique de jambe", 2, ["plaie"]),
  ],
  pediatrie: [
    p("paludisme_enfant", "Paludisme grave de l'enfant", 5, ["fievre", "convulsions", "anemie"]),
    p("pneumonie_enfant", "Pneumonie de l'enfant", 5, ["fievre", "dyspnee", "toux"]),
    p("diarrhee_deshydratation", "Diarrhée aiguë avec déshydratation", 5, ["diarrhee", "deshydratation"]),
    p("malnutrition_aigue", "Malnutrition aiguë sévère (kwashiorkor, marasme)", 5, ["amaigrissement", "oedemes"]),
    p("rougeole", "Rougeole et complications", 4, ["fievre", "eruption"]),
    p("drepanocytose_enfant", "Drépanocytose : crise, séquestration, syndrome pieds-mains", 5, ["douleur", "anemie"]),
    p("meningite_enfant", "Méningite du nourrisson", 4, ["fievre", "convulsions"]),
    p("infection_neonatale", "Infection néonatale précoce", 4, ["fievre", "hypotonie"]),
    p("ictere_neonatal", "Ictère néonatal", 4, ["ictere"]),
    p("asthme_enfant", "Asthme du grand enfant", 3, ["dyspnee", "sifflement"]),
    p("bronchiolite", "Bronchiolite du nourrisson", 4, ["dyspnee", "toux"]),
    p("tuberculose_enfant", "Tuberculose de l'enfant", 4, ["fievre", "amaigrissement", "toux"]),
    p("vih_pediatrique", "VIH pédiatrique (transmission mère-enfant)", 3, ["amaigrissement", "infections_repetees"]),
    p("convulsions_febriles", "Convulsions fébriles simples", 3, ["fievre", "convulsions"]),
    p("cardiopathie_congenitale_enfant", "Cardiopathie congénitale", 3, ["dyspnee", "cyanose"]),
    p("syndrome_nephrotique_enfant", "Syndrome néphrotique de l'enfant", 3, ["oedemes"]),
    p("intoxication_enfant", "Intoxication accidentelle (pétrole, médicaments, plantes)", 3, ["vomissements", "confusion"]),
    p("verminose_enfant", "Parasitoses intestinales et anémie", 4, ["douleur_abdominale", "anemie"]),
  ],
  gynecologie: [
    p("pre_eclampsie", "Pré-éclampsie / éclampsie", 5, ["hta", "cephalees", "convulsions"]),
    p("hemorragie_post_partum", "Hémorragie du post-partum", 5, ["saignement", "choc"]),
    p("gross_extra_uterine", "Grossesse extra-utérine rompue", 5, ["douleur_pelvienne", "choc"]),
    p("avortement_complique", "Avortement spontané ou provoqué compliqué", 4, ["saignement", "fievre"]),
    p("paludisme_grossesse", "Paludisme et grossesse", 5, ["fievre", "anemie"]),
    p("infection_genitale_haute", "Infection génitale haute / salpingite", 4, ["douleur_pelvienne", "fievre"]),
    p("dystocie", "Dystocie et travail prolongé", 4, ["travail"]),
    p("placenta_praevia", "Placenta prævia / hématome rétroplacentaire", 4, ["saignement"]),
    p("fibrome_uterin", "Fibrome utérin symptomatique", 4, ["saignement", "masse"]),
    p("cancer_col", "Cancer du col utérin", 4, ["saignement"]),
    p("infertilite", "Infertilité du couple (séquelles infectieuses)", 3, ["infertilite"]),
    p("fistule_obstetricale", "Fistule vésico-vaginale obstétricale", 2, ["incontinence"]),
    p("anemie_grossesse", "Anémie sévère de la grossesse", 4, ["anemie", "asthenie"]),
    p("ist", "Infection sexuellement transmissible (écoulement, ulcération)", 4, ["ecoulement"]),
    p("menopause_troubles", "Troubles du cycle et ménopause", 2, ["saignement"]),
    p("rupture_uterine", "Rupture utérine", 3, ["douleur_pelvienne", "choc"]),
  ],
  psychiatrie: [
    p("depression", "Épisode dépressif caractérisé", 5, ["tristesse", "asthenie"]),
    p("bouffee_delirante", "Bouffée délirante aiguë", 4, ["delire", "agitation"]),
    p("schizophrenie", "Schizophrénie", 4, ["delire", "hallucinations"]),
    p("trouble_bipolaire", "Trouble bipolaire — accès maniaque", 4, ["agitation", "insomnie"]),
    p("trouble_anxieux", "Trouble anxieux généralisé / attaque de panique", 4, ["anxiete", "palpitations"]),
    p("psychose_organique", "Confusion / psychose d'origine organique (paludisme, VIH, corticoïdes)", 4, ["confusion", "delire"]),
    p("addiction_alcool", "Trouble de l'usage d'alcool et sevrage", 4, ["agitation", "tremblement"]),
    p("addiction_cannabis", "Usage de cannabis / tramadol et troubles induits", 3, ["delire", "agitation"]),
    p("stress_post_traumatique", "État de stress post-traumatique (conflit, violences)", 4, ["anxiete", "cauchemars"]),
    p("conduite_suicidaire", "Crise suicidaire", 4, ["tristesse", "urgence"]),
    p("trouble_somatoforme", "Trouble somatoforme / plainte somatique inexpliquée", 3, ["douleur", "asthenie"]),
    p("psychose_puerperale", "Psychose du post-partum", 3, ["delire", "agitation"]),
    p("troubles_enfant", "Trouble du comportement de l'enfant / de l'adolescent", 2, ["agitation"]),
    p("demence_psy", "Troubles psycho-comportementaux du sujet âgé", 2, ["troubles_memoire", "agitation"]),
  ],
  urgences: [
    p("choc_septique", "Choc septique", 5, ["fievre", "choc"]),
    p("choc_hemorragique", "Choc hémorragique (AVP, obstétrical)", 5, ["choc", "saignement"]),
    p("paludisme_grave_urg", "Accès pernicieux palustre", 5, ["fievre", "coma"]),
    p("detresse_respiratoire", "Détresse respiratoire aiguë", 5, ["dyspnee"]),
    p("coma_metabolique", "Coma métabolique (hypoglycémie, acidocétose, urémie)", 4, ["coma", "confusion"]),
    p("intoxication_volontaire", "Intoxication volontaire (pesticides, médicaments)", 4, ["vomissements", "coma"]),
    p("polytraumatisme", "Polytraumatisme après accident de la voie publique", 5, ["traumatisme", "choc"]),
    p("morsure_serpent", "Envenimation par morsure de serpent", 4, ["douleur", "saignement"]),
    p("etat_de_mal_convulsif", "État de mal convulsif", 4, ["convulsions"]),
    p("douleur_thoracique_urg", "Douleur thoracique aiguë (SCA, EP, dissection)", 4, ["douleur_thoracique"]),
    p("abdomen_aigu", "Abdomen aigu chirurgical", 5, ["douleur_abdominale"]),
    p("anaphylaxie", "Choc anaphylactique", 3, ["dyspnee", "eruption"]),
    p("noyade_electrocution", "Noyade, électrisation, brûlure grave", 2, ["traumatisme"]),
    p("deshydratation_severe", "Déshydratation sévère (choléra, gastro-entérite)", 4, ["diarrhee", "deshydratation"]),
    p("urgence_hypertensive", "Urgence hypertensive avec souffrance viscérale", 4, ["hta", "cephalees"]),
    p("agitation_urgence", "Agitation aiguë aux urgences", 2, ["agitation"]),
  ],
};

export function getBank(specialty: string, subspecialty?: string | null): PathologyEntry[] {
  if (specialty === "medecine_interne") {
    const key = (subspecialty ?? "").toLowerCase();
    if (INTERNE_BANK[key]) return INTERNE_BANK[key];
    return Object.values(INTERNE_BANK).flat();
  }
  return SPECIALTY_BANK[specialty] ?? Object.values(SPECIALTY_BANK).flat();
}

/** Angles de présentation — évite le « même tableau » pour une même pathologie */
export const PRESENTATION_ANGLES = [
  "forme typique d'installation progressive",
  "forme aiguë / décompensation brutale",
  "forme trompeuse à symptomatologie atypique",
  "révélée par une complication",
  "découverte fortuite lors d'un autre motif de consultation",
  "forme paucisymptomatique chez un patient consultant tardivement",
  "forme associée à une comorbidité qui brouille le tableau",
  "récidive ou rechute après traitement incomplet",
  "forme sévère d'emblée avec retentissement général",
  "présentation dominée par un signe isolé inhabituel",
];

export const AGE_BANDS = [
  { key: "nouveau_ne", label: "nouveau-né (0-28 jours)", min: 0, max: 0 },
  { key: "nourrisson", label: "nourrisson (1-23 mois)", min: 1, max: 1 },
  { key: "enfant", label: "enfant (2-11 ans)", min: 2, max: 11 },
  { key: "adolescent", label: "adolescent (12-17 ans)", min: 12, max: 17 },
  { key: "adulte_jeune", label: "adulte jeune (18-34 ans)", min: 18, max: 34 },
  { key: "adulte", label: "adulte (35-59 ans)", min: 35, max: 59 },
  { key: "age", label: "personne âgée (60-90 ans)", min: 60, max: 90 },
];

/** Éléments de contexte africain — à n'utiliser que lorsqu'ils sont cliniquement pertinents */
export const AFRICAN_CONTEXTS = [
  "consultation tardive après plusieurs semaines d'évolution",
  "automédication préalable (antipaludiques, antibiotiques de rue)",
  "recours initial à la médecine traditionnelle",
  "plateau technique limité : peu d'examens disponibles rapidement",
  "difficultés financières limitant la réalisation des examens",
  "long trajet depuis une zone rurale avant d'arriver à l'hôpital",
  "contexte épidémiologique local particulier (zone d'endémie palustre, épidémie en cours)",
  "traitement antérieur mal conduit ou interrompu faute de moyens",
  "patient déjà suivi dans un centre de santé périphérique avec dossier incomplet",
  "contexte de promiscuité et de mauvaises conditions d'hygiène",
  "aucune particularité contextuelle notable (patient consultant rapidement, milieu urbain)",
  "aucune particularité contextuelle notable (suivi régulier, bon accès aux soins)",
];

export const DIFFICULTIES = ["facile", "intermédiaire", "difficile"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
