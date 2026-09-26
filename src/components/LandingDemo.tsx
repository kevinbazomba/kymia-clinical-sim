import { useEffect, useRef, useState } from "react";
import {
  Activity, BookOpen, Brain, Check, ChevronRight, ClipboardCheck, HeartPulse,
  Pause, Play, Stethoscope, Trophy,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const scenes = [
  { label: "Accueil", duration: 4400 },
  { label: "Choisissez une spécialité", duration: 4200 },
  { label: "Consultation avec patient virtuel", duration: 5200 },
  { label: "Correction pédagogique", duration: 5200 },
  { label: "Rapport détaillé et score", duration: 5200 },
];

export function LandingDemo() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    startedAtRef.current = performance.now();
    const frame = (now: number) => {
      const elapsed = elapsedRef.current + now - startedAtRef.current;
      const nextProgress = Math.min(elapsed / scenes[index].duration, 1);
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        elapsedRef.current = 0;
        setIndex((current) => (current + 1) % scenes.length);
        setProgress(0);
      } else {
        rafRef.current = requestAnimationFrame(frame);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, playing]);

  const rafRef = useRef<number>(0);
  const chooseScene = (next: number) => {
    elapsedRef.current = 0;
    setProgress(0);
    setIndex(next);
  };
  const togglePlayback = () => {
    if (playing) elapsedRef.current += performance.now() - startedAtRef.current;
    else startedAtRef.current = performance.now();
    setPlaying((current) => !current);
  };

  return (
    <section className="landing-demo mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20" aria-label="Démonstration de Kymia">
      <div className="landing-demo-window">
        <div className="landing-demo-topbar">
          <div className="flex items-center gap-2 font-serif text-lg font-bold"><span className="landing-demo-mark"><Activity size={17} /></span>Kymia</div>
          <div className="hidden items-center gap-5 text-xs text-muted-foreground sm:flex"><span>Accueil</span><span>Consulter</span><span>Jury</span><span>Historique</span></div>
          <span className="landing-demo-live"><i /> Démo produit</span>
        </div>

        <div className="landing-demo-content" key={index}>
          {index === 0 && <div className="demo-scene demo-home"><span className="demo-eyebrow">VOTRE ESPACE DE FORMATION</span><h2>Bonjour, <em>Docteur.</em></h2><p>Entraînez-vous à prendre en charge des patients virtuels, dans un cadre pédagogique et bienveillant.</p><div className="demo-action-row"><div className="demo-action primary"><Stethoscope size={18} /> Lancer une consultation <ChevronRight size={16} /></div><div className="demo-action"><Trophy size={18} /> Espace jury <ChevronRight size={16} /></div></div><div className="demo-stat"><Activity size={18} /><span><b>Votre progression</b><small>Vos consultations et rapports au même endroit</small></span><strong>35</strong></div></div>}
          {index === 1 && <div className="demo-scene"><span className="demo-eyebrow">NOUVELLE CONSULTATION</span><h2>Choisissez une spécialité</h2><p>Chaque consultation vous propose un cas unique pour exercer votre raisonnement clinique.</p><div className="demo-cards"><div className="demo-specialty"><span><HeartPulse /></span><b>Médecine interne</b><small>Cas complexes et raisonnement clinique global</small><ChevronRight /></div><div className="demo-specialty"><span><Stethoscope /></span><b>Chirurgie</b><small>Urgences et indications opératoires</small><ChevronRight /></div><div className="demo-specialty"><span><Brain /></span><b>Gynécologie</b><small>Situations fréquentes et suivi clinique</small><ChevronRight /></div></div></div>}
          {index === 2 && <div className="demo-scene"><span className="demo-eyebrow">CONSULTATION EN COURS</span><h2>Écoutez, explorez, raisonnez.</h2><div className="demo-patient"><div className="demo-avatar">AK</div><div><b>Assoua K. · 26 ans</b><small>Gynécologie &amp; obstétrique</small></div><span className="demo-status">Patiente</span></div><div className="demo-chat"><small>PATIENTE</small><p>« Bonjour Docteur, j’ai eu un petit saignement ce matin et je voulais m’assurer que le bébé allait bien. »</p></div><div className="demo-clinical"><span><Check size={14} /> Examen clinique</span><span>Biologie</span><span>Imagerie</span></div><div className="demo-progress-note"><span className="demo-pulse" /> Consultation simulée en temps réel</div></div>}
          {index === 3 && <div className="demo-scene"><span className="demo-eyebrow">RETOUR PÉDAGOGIQUE</span><h2>Progressez à chaque cas.</h2><p>Un retour structuré met en évidence les étapes utiles de votre démarche clinique.</p><div className="demo-feedback"><div><span className="feedback-icon"><ClipboardCheck size={18} /></span><span><b>Points à approfondir</b><small>Questions et examens complémentaires</small></span><span className="feedback-count">2</span></div><div className="feedback-detail"><span>Antécédents et symptômes associés</span><span>Examens adaptés à la situation</span></div></div><div className="demo-feedback positive"><div><span className="feedback-icon"><Check size={18} /></span><span><b>Votre raisonnement, étape par étape</b><small>Des repères pour progresser</small></span></div></div></div>}
          {index === 4 && <div className="demo-scene demo-report"><span className="demo-eyebrow">BILAN DE CONSULTATION</span><h2>Un rapport clair pour avancer.</h2><div className="demo-score"><div className="score-ring"><span>82<small>/100</small></span></div><div><b>Bonne progression</b><small>Votre rapport pédagogique est prêt.</small></div><BookOpen size={22} /></div><div className="demo-report-list"><span><Check /> Anamnèse structurée</span><span><Check /> Examens pertinents</span><span><Check /> Pistes de réflexion détaillées</span></div><Link to="/auth" search={{ mode: "signup" }}><Button className="mt-5">Commencer gratuitement <ChevronRight /></Button></Link></div>}
        </div>
        <div className="landing-demo-controls"><span className="demo-caption" aria-live="polite">{scenes[index].label}</span><div className="demo-control-bottom"><button type="button" className="demo-play" onClick={togglePlayback} aria-label={playing ? "Mettre en pause" : "Reprendre la démonstration"}>{playing ? <Pause size={14} /> : <Play size={14} />}</button><div className="demo-dots" aria-label="Choisir une scène">{scenes.map((scene, i) => <button type="button" key={scene.label} aria-label={`Afficher : ${scene.label}`} aria-current={index === i ? "step" : undefined} className={index === i ? "active" : ""} onClick={() => chooseScene(i)} />)}</div></div><div className="demo-track" role="progressbar" aria-label="Progression de la démonstration" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div></div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Aperçu illustratif de la plateforme</p>
    </section>
  );
}
