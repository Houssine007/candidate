"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, UserCircle, Target, Award, Search, Loader2,
  Briefcase, FileText, Plus, Trash2, ChevronRight, ChevronLeft,
  Upload, Github, Globe, Linkedin, Link2, GraduationCap,
  FolderOpen, Shield, BarChart3, Sparkles, MapPin, Wifi,
  ExternalLink, X, Zap
} from "lucide-react";
import {
  getMyProfile, updateCandidateOnboarding, searchSkills, uploadCV
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  title: string;
  description: string;
  url: string;
  skills: string[];
}

interface FormData {
  // Step 0 — CV upload (handled separately)
  // Step 1 — Identity
  first_name: string;
  last_name: string;
  phone: string;
  job_title: string;
  location: string;
  remote_ok: boolean;
  bio: string;
  // Step 2 — Links
  links: { github: string; portfolio: string; linkedin: string; other: string[] };
  // Step 3 — Formation
  formations: string;
  education_level: number;
  // Step 4 — Experience
  experience_detail: string;
  years_of_experience: number;
  // Step 5 — Projects
  projects: Project[];
  // Step 6 — Skills
  skills: { skill_id: number; name: string; level: number; years_experience: number; source?: string }[];
  // Step 7 — Certifications
  certifications: string;
}

const EDUCATION_LEVELS = [
  { value: 0, label: "Sans diplôme" },
  { value: 1, label: "CAP / BEP" },
  { value: 2, label: "Bac" },
  { value: 3, label: "Bac +2 (BTS / DUT)" },
  { value: 4, label: "Bac +3 (Licence)" },
  { value: 5, label: "Bac +5 (Master / Ingénieur)" },
  { value: 6, label: "Bac +6 (MBA)" },
  { value: 7, label: "Doctorat" },
  { value: 8, label: "Habilitation à Diriger" },
];

const STEPS = [
  { id: 0, title: "Démarrage", subtitle: "Upload CV", icon: <Zap className="w-4 h-4" /> },
  { id: 1, title: "Identité", subtitle: "Qui êtes-vous ?", icon: <UserCircle className="w-4 h-4" /> },
  { id: 2, title: "Liens", subtitle: "Présence en ligne", icon: <Link2 className="w-4 h-4" /> },
  { id: 3, title: "Formation", subtitle: "Diplômes", icon: <GraduationCap className="w-4 h-4" /> },
  { id: 4, title: "Expériences", subtitle: "Parcours pro", icon: <Briefcase className="w-4 h-4" /> },
  { id: 5, title: "Projets", subtitle: "Réalisations", icon: <FolderOpen className="w-4 h-4" /> },
  { id: 6, title: "Compétences", subtitle: "Skills ROME", icon: <Award className="w-4 h-4" /> },
  { id: 7, title: "Certifications", subtitle: "Formations continues", icon: <Shield className="w-4 h-4" /> },
  { id: 8, title: "Récap", subtitle: "Score & aperçu", icon: <BarChart3 className="w-4 h-4" /> },
];

const DEFAULT_FORM: FormData = {
  first_name: "", last_name: "", phone: "", job_title: "",
  location: "", remote_ok: false, bio: "",
  links: { github: "", portfolio: "", linkedin: "", other: [] },
  formations: "", education_level: 0,
  experience_detail: "", years_of_experience: 0,
  projects: [],
  skills: [],
  certifications: "",
};

// ─── Completeness score ───────────────────────────────────────────────────────

function computeScore(f: FormData): number {
  let s = 0;
  if (f.first_name && f.last_name && f.phone) s += 10;
  if (f.bio) s += 5;
  if (f.links?.github || f.links?.portfolio) s += 10;
  if (f.links?.linkedin) s += 5;
  if (f.formations) s += 10;
  if (f.experience_detail || f.years_of_experience > 0) s += 15;
  if ((f.projects?.length ?? 0) >= 1) s += 10;
  if ((f.skills?.length ?? 0) >= 5) s += 15;
  if (f.certifications) s += 5;
  if ((f.skills?.length ?? 0) > 0) s += 10;
  return Math.min(s, 100);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<any[]>([]);
  const [newProject, setNewProject] = useState<Project>({ title: "", description: "", url: "", skills: [] });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const { token } = useAuthStore();
  const router = useRouter();

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    getMyProfile(token).then(data => {
      if (!data) return;
        const d = data as any;
        setFormData(prev => ({
          ...prev,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          bio: data.bio || "",
          experience_detail: data.experience_detail || "",
          formations: data.formations || "",
          certifications: data.certifications || "",
          years_of_experience: data.years_of_experience || 0,
          education_level: data.education_level || 0,
          skills: data.skills || [],
          job_title: d.job_title || "",
          location: d.location || "",
          remote_ok: d.remote_ok ?? false,
          links: {
            github: d.links?.github || "",
            portfolio: d.links?.portfolio || "",
            linkedin: d.links?.linkedin || "",
            other: d.links?.other || [],
  },
  projects: d.projects || [],
}));
      if (data.cv_url || data.cv_text) setCvUploaded(true);
      if (data.onboarding_step && data.onboarding_step > 1) {
        setCurrentStep(Math.min(data.onboarding_step, STEPS.length - 1));
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [token]);

  // ── Skill search debounce ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(async () => {
      if (skillSearch.length > 1) setSkillResults(await searchSkills(skillSearch, token || undefined));
      else setSkillResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [skillSearch]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const set = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }));

  const addSkill = (skill: any, source = "Déclaré") => {
    if (!formData.skills.find(s => s.skill_id === skill.id)) {
      set({ skills: [...formData.skills, { skill_id: skill.id, name: skill.name, level: 2, years_experience: 1, source }] });
    }
    setSkillSearch(""); setSkillResults([]);
  };

  const removeSkill = (id: number) => set({ skills: formData.skills.filter(s => s.skill_id !== id) });
  const updateSkillLevel = (id: number, level: number) =>
    set({ skills: formData.skills.map(s => s.skill_id === id ? { ...s, level } : s) });

  const addProject = () => {
    if (!newProject.title) return;
    set({ projects: [...formData.projects, newProject] });
    setNewProject({ title: "", description: "", url: "", skills: [] });
    setShowProjectForm(false);
  };

  const removeProject = (i: number) => set({ projects: formData.projects.filter((_, j) => j !== i) });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !token) return;
    setIsUploading(true);
    try {
      const updated = await uploadCV(e.target.files[0], token);
      setFormData(prev => ({
        ...prev,
        ...updated,
        skills: updated.skills?.length ? updated.skills : prev.skills,
        first_name: updated.first_name || prev.first_name,
        last_name: updated.last_name || prev.last_name,
        phone: (updated as any).phone || prev.phone,
        bio: updated.bio || prev.bio,
        experience_detail: (updated as any).experience_detail || prev.experience_detail,
        formations: (updated as any).formations || prev.formations,
        certifications: (updated as any).certifications || prev.certifications,
      }));
      setCvUploaded(true);
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  const handleNext = async () => {
    setIsSaving(true);
    try {
      const nextStep = currentStep + 1;
      await updateCandidateOnboarding(
        { ...formData, onboarding_step: nextStep } as any,
        token || ""
      );
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/dashboard/candidate");
      }
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const score = computeScore(formData);
  const scoreBg = score < 40 ? "bg-red-500" : score < 70 ? "bg-amber-500" : "bg-emerald-500";
  const scoreText = score < 40 ? "Profil incomplet — complétez pour postuler" : score < 70 ? "Profil en cours — continuez pour améliorer" : "Profil fort ✓";

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="glow-mesh" />

      {/* Navbar */}
      <div className="sticky top-0 z-50 border-b border-secondary/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-sm">R</div>
            <span className="font-extrabold tracking-tighter text-lg">RECRUIT<span className="text-primary">PRO</span></span>
          </div>
          <div className="flex items-center gap-3">
            {/* Score pill */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-black ${scoreBg}`}>
              <span>{score}% — {scoreText}</span>
            </div>
            <button onClick={() => router.push("/dashboard/candidate")} className="text-xs font-bold text-muted hover:text-foreground transition-colors">← Dashboard</button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Score banner (mobile) */}
      <div className={`${scoreBg} text-white text-[10px] font-black uppercase tracking-widest text-center py-2 md:hidden`}>
        {score}% — {scoreText}
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 relative z-10">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-gradient">Construisez votre Profil</h1>
          <p className="text-muted text-sm max-w-xl mx-auto">Complétez chaque étape pour maximiser votre compatibilité avec les offres.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-1 min-w-max mx-auto justify-center">
            {STEPS.map((step, i) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => done && setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      active ? "bg-primary text-white shadow-lg shadow-primary/30" :
                      done ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                      "bg-secondary/5 text-muted/40 cursor-default"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.icon}
                    <span className="hidden md:inline">{step.title}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`w-4 h-[2px] mx-1 ${currentStep > step.id ? "bg-primary" : "bg-secondary/20"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-[2.5rem] overflow-hidden border-secondary/10">
          {/* Card header */}
          <div className="p-8 border-b border-secondary/10 bg-secondary/5">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-primary font-mono text-xs">0{currentStep + 1} / {STEPS.length}</span>
              <h2 className="text-xl font-black tracking-tight">{STEPS[currentStep].title}</h2>
            </div>
            <p className="text-muted text-sm">{STEPS[currentStep].subtitle}</p>
          </div>

          {/* Card body */}
          <div className="p-8 min-h-[380px]">

            {/* ── STEP 0: CV Upload ────────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-400">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 ${cvUploaded ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                  {isUploading
                    ? <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    : cvUploaded
                    ? <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    : <Upload className="w-10 h-10 text-primary" />
                  }
                </div>
                <h3 className="text-2xl font-black mb-2">{cvUploaded ? "CV analysé !" : "Importez votre CV"}</h3>
                <p className="text-muted text-sm text-center max-w-md mb-6">
                  {cvUploaded
                    ? "Vos informations ont été pré-remplies. Continuez pour valider et compléter."
                    : "Notre IA extrait automatiquement vos compétences, formations et expériences. Gain de temps garanti."}
                </p>
                <input type="file" id="cv-upload" onChange={handleFileUpload} accept=".pdf" className="hidden" />
                <div className="flex gap-4 flex-wrap justify-center">
                  <button
                    onClick={() => document.getElementById("cv-upload")?.click()}
                    disabled={isUploading}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyse en cours...</> : <><FileText className="w-4 h-4" />{cvUploaded ? "Remplacer le CV" : "Choisir un PDF"}</>}
                  </button>
                  <button onClick={handleNext} className="px-8 py-3 border border-secondary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">
                    {cvUploaded ? "Continuer →" : "Passer cette étape →"}
                  </button>
                </div>
                {cvUploaded && (
                  <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Profil pré-rempli — vérifiez les étapes suivantes
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 1: Identité ─────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Prénom" value={formData.first_name} onChange={v => set({ first_name: v })} placeholder="Jean" />
                  <Field label="Nom" value={formData.last_name} onChange={v => set({ last_name: v })} placeholder="Dupont" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Téléphone" value={formData.phone} onChange={v => set({ phone: v })} placeholder="+33 6 00 00 00 00" type="tel" />
                  <Field label="Titre professionnel" value={formData.job_title} onChange={v => set({ job_title: v })} placeholder="Dev Full Stack — 5 ans" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Localisation</label>
                    <input type="text" value={formData.location} onChange={e => set({ location: e.target.value })} placeholder="Paris, France" className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1 flex items-center gap-1"><Wifi className="w-3 h-3" />Télétravail</label>
                    <button
                      onClick={() => set({ remote_ok: !formData.remote_ok })}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-bold w-full ${formData.remote_ok ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/20 text-muted"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 transition-colors ${formData.remote_ok ? "bg-primary border-primary" : "border-secondary/40"}`} />
                      {formData.remote_ok ? "Ouvert au télétravail" : "Présentiel uniquement"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Bio / Pitch <span className="text-muted/40 normal-case">(500 chars max)</span></label>
                  <textarea
                    rows={4} maxLength={500} value={formData.bio}
                    onChange={e => set({ bio: e.target.value })}
                    placeholder="Décrivez votre profil en 2-3 phrases percutantes..."
                    className="input-field w-full resize-none"
                  />
                  <p className="text-[10px] text-muted/40 text-right">{formData.bio.length}/500</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Liens ────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <LinkField icon={<Github className="w-4 h-4" />} label="GitHub / GitLab" value={formData.links.github} onChange={v => set({ links: { ...formData.links, github: v } })} placeholder="https://github.com/username" />
                <LinkField icon={<Globe className="w-4 h-4" />} label="Portfolio / Site perso" value={formData.links.portfolio} onChange={v => set({ links: { ...formData.links, portfolio: v } })} placeholder="https://monsite.dev" />
                <LinkField icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" value={formData.links.linkedin} onChange={v => set({ links: { ...formData.links, linkedin: v } })} placeholder="https://linkedin.com/in/username" />
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-xs text-muted flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Un profil GitHub ou Portfolio actif ajoute <strong className="text-primary">+10%</strong> à votre score de complétude — très apprécié par les recruteurs tech.</span>
                </div>
              </div>
            )}

            {/* ── STEP 3: Formation ────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Niveau d'études</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {EDUCATION_LEVELS.map(lvl => (
                      <button key={lvl.value} onClick={() => set({ education_level: lvl.value })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left ${formData.education_level === lvl.value ? "bg-primary text-white border-primary" : "bg-secondary/5 border-secondary/20 text-muted hover:border-primary/30"}`}>
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Formations & Diplômes</label>
                  <textarea rows={6} value={formData.formations} onChange={e => set({ formations: e.target.value })}
                    placeholder={"Master Informatique — Université Paris-Saclay (2020-2022)\nLicence Mathématiques — Université Lyon 1 (2017-2020)"}
                    className="input-field w-full resize-none font-mono text-sm" />
                  <p className="text-[10px] text-muted/50 ml-1">Une formation par ligne, avec l'établissement et les dates.</p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Expériences ──────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Années d'expérience totales</label>
                  <div className="flex gap-2 flex-wrap">
                    {[0, 1, 2, 3, 5, 7, 10, 15].map(y => (
                      <button key={y} onClick={() => set({ years_of_experience: y })}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${formData.years_of_experience === y ? "bg-primary text-white border-primary" : "bg-secondary/5 border-secondary/20 text-muted hover:border-primary/30"}`}>
                        {y === 0 ? "< 1 an" : `${y} ans`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Détail des expériences</label>
                  <textarea rows={8} value={formData.experience_detail} onChange={e => set({ experience_detail: e.target.value })}
                    placeholder={"Lead Dev Front-End — Startup FinTech (2022 - aujourd'hui)\n- Architecture React / Next.js, design system, CI/CD\n- Management d'une équipe de 3 développeurs\n\nDev Full Stack — Agence XYZ (2020-2022)\n- Applications web Python/Django + Vue.js"}
                    className="input-field w-full resize-none font-mono text-sm" />
                </div>
              </div>
            )}

            {/* ── STEP 5: Projets ──────────────────────────────────────────── */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                {formData.projects.length === 0 && !showProjectForm && (
                  <div className="py-10 text-center border-2 border-dashed border-secondary/20 rounded-3xl">
                    <FolderOpen className="w-10 h-10 text-muted/20 mx-auto mb-3" />
                    <p className="text-sm font-bold text-muted/60 mb-4">Aucun projet ajouté</p>
                    <button onClick={() => setShowProjectForm(true)} className="px-6 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 mx-auto">
                      <Plus className="w-4 h-4" /> Ajouter un projet
                    </button>
                  </div>
                )}

                {formData.projects.map((p, i) => (
                  <div key={i} className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 flex justify-between items-start gap-4 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-sm">{p.title}</p>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>}
                      </div>
                      <p className="text-xs text-muted line-clamp-2">{p.description}</p>
                      {p.skills.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {p.skills.map((s, j) => <span key={j} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">{s}</span>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeProject(i)} className="p-2 text-muted/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {showProjectForm && (
                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl space-y-4">
                    <h4 className="font-black text-sm">Nouveau projet</h4>
                    <Field label="Titre" value={newProject.title} onChange={v => setNewProject(p => ({ ...p, title: v }))} placeholder="Mon SaaS — Application de gestion RH" />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Description</label>
                      <textarea rows={3} value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
                        placeholder="Décrivez les enjeux, votre rôle et les technologies utilisées..."
                        className="input-field w-full resize-none" />
                    </div>
                    <Field label="Lien (GitHub, démo...)" value={newProject.url} onChange={v => setNewProject(p => ({ ...p, url: v }))} placeholder="https://github.com/..." icon={<ExternalLink className="w-4 h-4" />} />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Technologies (séparées par virgule)</label>
                      <input type="text" placeholder="React, Python, PostgreSQL, Docker" className="input-field w-full"
                        onBlur={e => setNewProject(p => ({ ...p, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                        defaultValue={newProject.skills.join(", ")} />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={addProject} className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                      <button onClick={() => setShowProjectForm(false)} className="px-6 py-2 border border-secondary/20 rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {!showProjectForm && formData.projects.length > 0 && (
                  <button onClick={() => setShowProjectForm(true)} className="w-full py-3 border-2 border-dashed border-secondary/20 hover:border-primary/30 rounded-2xl text-xs font-black uppercase tracking-widest text-muted/60 hover:text-primary transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter un projet
                  </button>
                )}
              </div>
            )}

            {/* ── STEP 6: Compétences ──────────────────────────────────────── */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                    placeholder="Rechercher une compétence (Python, React, Gestion de projet...)"
                    className="input-field w-full pl-11" />
                  {skillResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-background border border-secondary/20 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {skillResults.map((s: any) => (
                        <div key={s.id} onClick={() => addSkill(s)} className="p-3 hover:bg-secondary/10 cursor-pointer border-b border-secondary/5 flex justify-between items-center text-sm font-medium">
                          <span>{s.name}</span>
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted font-medium">{formData.skills.length} compétence{formData.skills.length > 1 ? "s" : ""} — {formData.skills.length >= 5 ? <span className="text-emerald-500">✓ Seuil atteint</span> : <span className="text-amber-500">{5 - formData.skills.length} de plus pour +15%</span>}</p>
                </div>

                {formData.skills.length === 0 ? (
                  <div className="py-12 text-center text-muted">
                    <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Recherchez et ajoutez vos compétences ci-dessus.</p>
                    <p className="text-xs text-muted/50 mt-1">Les compétences extraites du CV apparaissent automatiquement.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.skills.map((skill) => (
                      <div key={skill.skill_id} className="glass-panel p-4 rounded-2xl flex items-center justify-between group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-sm">{skill.name}</p>
                            {skill.source && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${skill.source === "Extrait CV" ? "bg-blue-500/10 text-blue-500" : skill.source === "Projet" ? "bg-purple-500/10 text-purple-500" : "bg-secondary/10 text-muted"}`}>
                                {skill.source}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4].map(lvl => (
                              <button key={lvl} onClick={() => updateSkillLevel(skill.skill_id, lvl)}
                                className={`w-7 h-1.5 rounded-full transition-all ${lvl <= skill.level ? "bg-primary" : "bg-secondary/20 hover:bg-secondary/40"}`} />
                            ))}
                            <span className="text-[10px] font-bold text-muted uppercase ml-1">
                              {["", "Débutant", "Intermédiaire", "Avancé", "Expert"][skill.level]}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removeSkill(skill.skill_id)} className="p-2 text-muted/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 7: Certifications ───────────────────────────────────── */}
            {currentStep === 7 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">Certifications & Formations continues</label>
                  <textarea rows={6} value={formData.certifications} onChange={e => set({ certifications: e.target.value })}
                    placeholder={"AWS Certified Solutions Architect — Amazon (2023)\nGoogle Data Analytics Certificate — Coursera (2022)\nTOEIC 950 — ETS (2021)"}
                    className="input-field w-full resize-none font-mono text-sm" />
                  <p className="text-[10px] text-muted/50 ml-1">Une certification par ligne. Format suggéré : Titre — Organisme (Année)</p>
                </div>
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs text-muted flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Les certifications ajoutent <strong className="text-amber-500">+5%</strong> à votre score et peuvent faire la différence lors du matching sur des postes spécialisés.</span>
                </div>
              </div>
            )}

            {/* ── STEP 8: Récap ────────────────────────────────────────────── */}
            {currentStep === 8 && (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                {/* Score visuel */}
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-secondary/10" />
                      <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="10" fill="transparent"
                        className={score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500"}
                        strokeDasharray={376}
                        strokeDashoffset={376 - (376 * score) / 100}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{score}%</span>
                      <span className="text-[9px] font-black uppercase text-muted tracking-widest">Complétude</span>
                    </div>
                  </div>
                  <p className={`mt-3 text-sm font-black ${score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500"}`}>{scoreText}</p>
                  {score < 40 && <p className="text-xs text-muted mt-1 text-center max-w-xs">Votre score est trop bas pour postuler. Complétez les étapes manquantes.</p>}
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Identité complète", done: !!(formData.first_name && formData.last_name && formData.phone), pts: 10 },
                    { label: "Bio renseignée", done: !!formData.bio, pts: 5 },
                    { label: "GitHub ou Portfolio", done: !!(formData.links.github || formData.links.portfolio), pts: 10 },
                    { label: "LinkedIn renseigné", done: !!formData.links.linkedin, pts: 5 },
                    { label: "Formation renseignée", done: !!formData.formations, pts: 10 },
                    { label: "Expérience renseignée", done: !!(formData.experience_detail || formData.years_of_experience > 0), pts: 15 },
                    { label: "Au moins 1 projet", done: formData.projects.length >= 1, pts: 10 },
                    { label: "Au moins 5 compétences", done: formData.skills.length >= 5, pts: 15 },
                    { label: "Certification ajoutée", done: !!formData.certifications, pts: 5 },
                    { label: "CV uploadé / Skills présents", done: cvUploaded || formData.skills.length > 0, pts: 10 },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${item.done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-secondary/5 border-secondary/10"}`}>
                      <div className="flex items-center gap-3">
                        {item.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-secondary/30 shrink-0" />}
                        <span className={`text-xs font-bold ${item.done ? "text-foreground" : "text-muted"}`}>{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-black ${item.done ? "text-emerald-500" : "text-muted/40"}`}>+{item.pts}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card footer */}
          <div className="p-8 border-t border-secondary/10 bg-secondary/5 flex items-center justify-between gap-4">
            <button onClick={() => { if (currentStep > 0) setCurrentStep(currentStep - 1); }}
              disabled={currentStep === 0 || isSaving}
              className="px-6 py-3 border border-secondary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground hover:bg-secondary/10 disabled:opacity-30 transition-all flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>

            {currentStep !== 0 && (
              <button onClick={handleNext} disabled={isSaving}
                className="px-10 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                  {currentStep === STEPS.length - 1 ? "Accéder au Dashboard" : "Suivant"}
                  <ChevronRight className="w-4 h-4" />
                </>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small reusable field ──────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`input-field w-full ${icon ? "pl-11" : ""}`} />
      </div>
    </div>
  );
}

function LinkField({ icon, label, value, onChange, placeholder }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-secondary/5 border border-secondary/10 rounded-2xl hover:border-primary/20 transition-all">
      <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-muted shrink-0">{icon}</div>
      <div className="flex-1 space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</label>
        <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none placeholder:text-muted/30" />
      </div>
      {value && <ExternalLink className="w-4 h-4 text-primary/40 shrink-0" />}
    </div>
  );
}
