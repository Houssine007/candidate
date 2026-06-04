"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  UserCircle,
  Target,
  Award,
  Search,
  Loader2,
  Briefcase,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Upload
} from "lucide-react";
import {
  getMyProfile,
  updateCandidateOnboarding,
  searchSkills,
  uploadCV
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  { id: 1, title: "Identité", icon: <UserCircle className="w-5 h-5" /> },
  { id: 2, title: "Compétences", icon: <Award className="w-5 h-5" /> },
  { id: 3, title: "Parcours", icon: <Briefcase className="w-5 h-5" /> },
  { id: 4, title: "Finalisation", icon: <Target className="w-5 h-5" /> },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    bio: "",
    experience_detail: "",
    formations: "",
    certifications: "",
    skills: [] as any[],
  });

  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<any[]>([]);
  const { token: storeToken } = useAuthStore();
  const router = useRouter();

  // Load initial profile data
  useEffect(() => {
    async function loadData() {
      if (!storeToken) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getMyProfile(storeToken);
        if (data) {
          setFormData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            phone: data.phone || "",
            bio: data.bio || "",
            experience_detail: data.experience_detail || "",
            formations: data.formations || "",
            certifications: data.certifications || "",
            skills: data.skills || [],
          });
          if (data.onboarding_step && data.onboarding_step > 1) {
            setCurrentStep(Math.min(data.onboarding_step, STEPS.length));
          }
        }
      } catch (error: any) {
        // 404 expected for new users — no profile yet, keep defaults
        console.log("Profil non trouvé, démarrage en mode création.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [storeToken]);

  // Skill Search Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (skillSearch.length > 1) {
        const results = await searchSkills(skillSearch);
        setSkillResults(results);
      } else {
        setSkillResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [skillSearch]);

  const handleNext = async () => {
    setIsSaving(true);
    try {
      const nextStep = currentStep + 1;
      await updateCandidateOnboarding(
        { ...formData, onboarding_step: nextStep },
        storeToken || ""
      );
      if (currentStep < STEPS.length) {
        setCurrentStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/dashboard/candidate");
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    try {
      const updatedProfile = await uploadCV(e.target.files[0], storeToken || "");
      setFormData((prev: any) => ({
        ...prev,
        ...updatedProfile,
        skills: updatedProfile.skills || prev.skills,
      }));
    } catch (err) {
      console.error("Erreur upload:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const addSkill = (skill: any) => {
    if (!formData.skills.find((s: any) => s.skill_id === skill.id)) {
      setFormData((prev: any) => ({
        ...prev,
        skills: [
          ...prev.skills,
          { skill_id: skill.id, name: skill.name, level: 2, years_experience: 1 },
        ],
      }));
    }
    setSkillSearch("");
    setSkillResults([]);
  };

  const removeSkill = (skillId: number) => {
    setFormData((prev: any) => ({
      ...prev,
      skills: prev.skills.filter((s: any) => s.skill_id !== skillId),
    }));
  };

  const updateSkillLevel = (skillId: number, level: number) => {
    setFormData((prev: any) => ({
      ...prev,
      skills: prev.skills.map((s: any) =>
        s.skill_id === skillId ? { ...s, level } : s
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted font-medium animate-pulse text-sm">
          Chargement de votre profil...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-12">
      <div className="glow-mesh" />

      {/* Navbar */}
      <div className="sticky top-0 z-50 border-b border-secondary/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-sm">
              R
            </div>
            <span className="font-extrabold tracking-tighter text-lg">
              RECRUIT<span className="text-primary">PRO</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/candidate")}
              className="text-xs font-bold text-muted hover:text-foreground transition-colors"
            >
              ← Retour au Dashboard
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 relative z-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight mb-3 text-gradient">
            Construisez votre Profil Candidat
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Renseignez vos compétences et votre parcours pour maximiser votre compatibilité avec les offres.
          </p>
        </div>

        {/* Step Progress */}
        <div className="mb-10 flex justify-between items-center max-w-2xl mx-auto relative px-4">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-secondary/20" />
          <div
            className="absolute top-5 left-0 h-[2px] bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-background border-secondary/30 text-muted"
                } ${currentStep === step.id ? "scale-110 ring-4 ring-primary/10" : ""}`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${
                  currentStep >= step.id ? "text-foreground" : "text-muted"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="glass-panel rounded-[2.5rem] overflow-hidden border-secondary/10">
          {/* Card Header */}
          <div className="p-8 md:p-10 border-b border-secondary/10 bg-secondary/5">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="text-primary text-sm font-mono">0{currentStep} /</span>
              {STEPS[currentStep - 1].title}
            </h2>
            <p className="text-muted text-sm mt-1">
              {currentStep === 1 && "Vos informations personnelles de base."}
              {currentStep === 2 && "Ajoutez vos compétences techniques et évaluez votre niveau."}
              {currentStep === 3 && "Décrivez vos expériences et formations."}
              {currentStep === 4 && "Vérifiez et validez votre profil complet."}
            </p>
          </div>

          {/* Card Body */}
          <div className="p-8 md:p-10 min-h-[380px]">
            {/* ─── STEP 1: Identité ─── */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        autoComplete="given-name"
                        placeholder="Jean"
                        className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-3 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        autoComplete="family-name"
                        placeholder="Dupont"
                        className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-3 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      autoComplete="tel"
                      placeholder="+212 6 00 00 00 00"
                      className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-3 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                      Résumé / Bio
                    </label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder="Décrivez brièvement votre profil professionnel..."
                      className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-3 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* CV Upload */}
                <div className="flex flex-col">
                  <div className="h-full border-2 border-dashed border-secondary/30 hover:border-primary/40 hover:bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all group cursor-pointer">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {isUploading ? (
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <h4 className="font-black text-sm mb-2">Importer votre CV (PDF)</h4>
                    <p className="text-xs text-muted mb-6 max-w-[220px]">
                      Notre système extrait automatiquement vos compétences et votre parcours.
                    </p>
                    <input
                      type="file"
                      id="cv-upload"
                      onChange={handleFileUpload}
                      accept=".pdf"
                      className="hidden"
                    />
                    <button
                      onClick={() => document.getElementById("cv-upload")?.click()}
                      disabled={isUploading}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploading ? "Analyse en cours..." : "Choisir un fichier"}
                      {!isUploading && <FileText className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Compétences ─── */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="relative">
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Rechercher une compétence (ex: Python, Excel, Marketing...)"
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-4 pl-12 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />

                  {skillResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-background border border-secondary/20 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {skillResults.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => addSkill(s)}
                          className="p-3 hover:bg-secondary/10 cursor-pointer border-b border-secondary/5 flex justify-between items-center text-sm font-medium transition-all"
                        >
                          <span>{s.name}</span>
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formData.skills.length === 0 ? (
                  <div className="py-12 text-center text-muted">
                    <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">
                      Recherchez et ajoutez vos compétences ci-dessus.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.skills.map((skill: any) => (
                      <div
                        key={skill.skill_id}
                        className="glass-panel p-4 rounded-2xl flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-sm text-foreground mb-2">
                            {skill.name}
                          </p>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4].map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => updateSkillLevel(skill.skill_id, lvl)}
                                className={`w-6 h-1.5 rounded-full transition-all ${
                                  lvl <= skill.level
                                    ? "bg-primary"
                                    : "bg-secondary/20 hover:bg-secondary/40"
                                }`}
                              />
                            ))}
                            <span className="text-[10px] font-bold text-muted uppercase ml-1">
                              Niv. {skill.level}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeSkill(skill.skill_id)}
                          className="p-2 text-muted/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── STEP 3: Parcours ─── */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                    Expériences Professionnelles
                  </label>
                  <textarea
                    rows={5}
                    value={formData.experience_detail}
                    onChange={(e) =>
                      setFormData({ ...formData, experience_detail: e.target.value })
                    }
                    placeholder="Décrivez vos expériences, postes occupés, responsabilités..."
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                    Formations & Diplômes
                  </label>
                  <textarea
                    rows={4}
                    value={formData.formations}
                    onChange={(e) =>
                      setFormData({ ...formData, formations: e.target.value })
                    }
                    placeholder="Ex: Licence Informatique - Université Mohammed V, 2023"
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted ml-1">
                    Certifications (optionnel)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.certifications}
                    onChange={(e) =>
                      setFormData({ ...formData, certifications: e.target.value })
                    }
                    placeholder="Ex: AWS Cloud Practitioner, Google Data Analytics..."
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-2xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 4: Finalisation ─── */}
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4 text-foreground">
                  Profil Prêt !
                </h3>
                <p className="text-muted max-w-sm mb-4 text-sm">
                  Votre profil est synchronisé avec notre catalogue de compétences. Le moteur de matching va analyser votre compatibilité avec les offres disponibles.
                </p>
                <div className="flex gap-3 flex-wrap justify-center mt-4">
                  {formData.skills.slice(0, 5).map((s: any) => (
                    <span
                      key={s.skill_id}
                      className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold"
                    >
                      {s.name}
                    </span>
                  ))}
                  {formData.skills.length > 5 && (
                    <span className="px-4 py-2 bg-secondary/10 text-muted border border-secondary/20 rounded-full text-xs font-bold">
                      +{formData.skills.length - 5} autres
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="p-8 md:p-10 border-t border-secondary/10 bg-secondary/5 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isSaving}
              className="px-6 py-3 border border-secondary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground hover:bg-secondary/10 disabled:opacity-30 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>

            <button
              onClick={handleNext}
              disabled={isSaving}
              className="px-10 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {currentStep === STEPS.length ? "Accéder au Dashboard" : "Suivant"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
