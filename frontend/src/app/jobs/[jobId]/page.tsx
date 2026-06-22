"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Briefcase, MapPin, Calendar, DollarSign, ArrowLeft, ArrowRight,
  CheckCircle2, Loader2, Sparkles, Building2, Clock,
  Globe, Share2, Bookmark, GraduationCap, Award, FileText
} from "lucide-react";
import { getJob, applyToJob, Job } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (jobId) {
      getJob(Number(jobId), token || undefined)
        .then(setJob)
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [jobId, token]);

  const handleApply = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      alert("Seuls les candidats peuvent postuler !");
      return;
    }
    if (!token || !job) return;

    setIsApplying(true);
    try {
      await applyToJob(job.id, undefined, token);
      setApplied(true);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la candidature");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-black italic">Offre introuvable</h1>
        <Link href="/" className="text-primary font-bold flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour au Job Board
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <div className="glow-mesh" />

      {/* Navigation Header */}
      <nav className="sticky top-0 w-full z-50 border-b border-secondary/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
            <span className="text-xs font-black uppercase tracking-widest text-muted group-hover:text-foreground">Retour</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl border border-secondary/20 hover:bg-secondary/10 text-muted transition-all">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-xl border border-secondary/20 hover:bg-secondary/10 text-muted transition-all">
              <Bookmark className="w-4 h-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Hero Section */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center font-black text-primary text-3xl border border-primary/20">
                  {job.company?.[0] || "R"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary font-black uppercase text-[10px] tracking-widest bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">Marketplace</span>
                    <span className="text-muted/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {job.created_at ? `Posté le ${new Date(job.created_at).toLocaleDateString()}` : "Posté récemment"}
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.9] text-gradient">{job.title}</h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-muted font-medium mb-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/5 rounded-2xl border border-secondary/10">
                  <Building2 className="w-4 h-4 text-primary" /> {job.company}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/5 rounded-2xl border border-secondary/10">
                  <MapPin className="w-4 h-4 text-primary" /> {job.location}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/5 rounded-2xl border border-secondary/10">
                  <Briefcase className="w-4 h-4 text-primary" /> {job.contract_type || "CDI / Temps plein"}
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="glass-panel p-8 md:p-10 rounded-panel relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
              <h2 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" /> Description du Poste
              </h2>
              <div className="prose prose-invert max-w-none text-muted font-medium leading-relaxed whitespace-pre-wrap italic">
                {job.description}
              </div>
            </section>

            {/* Requirements / Skills */}
            <section className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Award className="w-6 h-6 text-primary" /> Compétences & Profil Recherché
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {job.requirements?.map((req, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-secondary/5 border border-secondary/10 rounded-2xl group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black">
                        {req.skill_name?.[0].toUpperCase() || "S"}
                      </div>
                      <div>
                        <p className="font-black text-sm">{req.skill_name || `Skill #${req.skill_id}`}</p>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                          {req.is_mandatory ? "Obligatoire" : "Souhaité"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(l => (
                        <div key={l} className={`w-3 h-1.5 rounded-full ${l <= req.required_level ? "bg-primary" : "bg-secondary/20"}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="glass-panel p-8 rounded-panel sticky top-28 border-primary/20 bg-gradient-to-br from-secondary/40 to-transparent">
              <h3 className="text-lg font-black uppercase tracking-widest text-muted/60 mb-6 border-b border-secondary/10 pb-4">Résumé de l'offre</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Rémunération</p>
                    <p className="font-black text-lg">
                      {job.salary_max ? `${((job.salary_min || 0) / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k €` : (job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k €` : "Salaire N.D")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Formation</p>
                    <p className="font-black text-lg">Bac +{job.min_education_level}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Démarrage</p>
                    <p className="font-black text-lg text-foreground italic">{job.start_date || "Dès que possible"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-secondary/10">
                {applied ? (
                  <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 animate-in zoom-in-95">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Candidature envoyée !</span>
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Postuler maintenant <ArrowRight className="w-4 h-4" /> </>}
                  </button>
                )}
                <p className="text-[9px] text-center text-muted mt-4 font-bold uppercase tracking-widest">Temps de réponse moyen : 48h</p>
              </div>
            </div>

            <div className="p-8 bg-secondary/5 rounded-panel border border-secondary/10 italic">
              <p className="text-xs text-muted leading-relaxed">
                <Sparkles className="w-4 h-4 text-primary mb-2" />
                {job.match_score ? (
                  <>Notre IA de matching estime que votre profil correspond à <span className="text-primary font-black">{Math.round(job.match_score)}%</span> de cette offre.</>
                ) : (
                  <>Connectez-vous pour voir votre score de matching personnalisé.</>
                )}
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function Archive(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-archive"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
  );
}
