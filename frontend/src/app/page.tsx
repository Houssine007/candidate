"use client"

import * as React from "react"
import Link from "next/link"
import { getLatestJobs, Job } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Briefcase, Zap, Target, LayoutDashboard, LogOut } from "lucide-react"

export default function Home() {
  const [jobs, setJobs] = React.useState<Job[]>([])
  const { user, logout } = useAuthStore()

  React.useEffect(() => {
    const loadJobs = async () => {
      const data = await getLatestJobs(6)
      setJobs(data)
    }
    loadJobs()
  }, [])

  return (
    <div className="min-h-screen selection:bg-primary/30 selection:text-foreground">
      <div className="glow-mesh" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] transition-all duration-300">
        <div className="container mx-auto px-6 py-4">
          <div className="glass-panel px-6 py-3 rounded-2xl flex items-center justify-between shadow-2xl shadow-black/5 dark:shadow-black/20">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-primary rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative w-10 h-10 bg-secondary border border-secondary/20 rounded-lg flex items-center justify-center font-black text-primary text-xl">
                  R
                </div>
              </div>
              <span className="text-xl font-extrabold tracking-tighter text-foreground">
                RECRUIT<span className="text-primary">PRO</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              <a href="#" className="hover:text-primary transition-colors">Solutions</a>
              <a href="#" className="hover:text-primary transition-colors">Entreprises</a>
              <a href="#" className="hover:text-primary transition-colors">Tarifs</a>
              <a href="#" className="hover:text-primary transition-colors">Blog</a>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {!user ? (
                <>
                  <Link href="/login" className="hidden md:block text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors px-2">Log In</Link>
                  <Link href="/login" className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.05] transition-transform active:scale-95">
                    Join Now
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted leading-none">Connecté en tant que</p>
                    <p className="text-[11px] font-bold text-foreground">{user.full_name}</p>
                  </div>
                  <Link
                    href={user.role === "RECRUITER" ? "/dashboard/recruiter" : "/dashboard/candidate"}
                    className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-[1.05] transition-transform"
                  >
                    <LayoutDashboard className="w-3 h-3" /> Dashboard
                  </Link>
                  <button onClick={() => logout()} className="p-3 text-muted/60 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-48 pb-20 px-6">
          <div className="container mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/20 bg-secondary/5 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                HR Tech SaaS de Nouvelle Génération
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 max-w-6xl leading-[0.85] text-gradient">
                Transformez votre<br />Capital Humain.
              </h1>

              <p className="text-muted text-lg md:text-xl max-w-2xl mb-14 font-medium leading-relaxed">
                RecruitPro automatise vos recrutements et la gestion de vos talents pour vous permettre de vous concentrer sur ce qui compte vraiment : <span className="text-foreground italic">l'humain</span>.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg justify-center">
                <Link href="/signup" className="btn-premium bg-primary text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center gap-3">
                  Démarrer Gratuitement <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/signup" className="btn-premium bg-transparent border border-secondary/30 text-foreground hover:bg-secondary/10 flex items-center justify-center">
                  Voir la Démo IA
                </Link>
              </div>

              {/* Trust Section */}
              <div className="mt-32 pt-12 border-t border-secondary/10 w-full">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/40 mb-10">Utilisé par les leaders RH</p>
                <div className="flex flex-wrap justify-center gap-16 opacity-30 grayscale saturate-0 contrast-125">
                  <div className="flex items-center gap-2 font-black text-xl italic drop-shadow-sm">TECHCORP</div>
                  <div className="flex items-center gap-2 font-black text-xl italic drop-shadow-sm">DATAFLOW</div>
                  <div className="flex items-center gap-2 font-black text-xl italic drop-shadow-sm">QUANTUM</div>
                  <div className="flex items-center gap-2 font-black text-xl italic drop-shadow-sm">NEXTGEN</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Jobs Section */}
        <section className="py-24 px-6 bg-secondary/5 dark:bg-transparent">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-8">
              <div className="text-center md:text-left">
                <span className="badge-rh bg-primary/10 text-primary mb-5 inline-block border border-primary/20">Marketplace</span>
                <h2 className="text-5xl font-black tracking-tighter text-foreground">Dernières Opportunités</h2>
              </div>
              <button className="text-[11px] font-black text-primary hover:scale-105 transition-all uppercase tracking-[0.3em] flex items-center gap-2">
                Voir tout le Job Board <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="glass-panel p-8 rounded-[2.5rem] group hover:border-primary/50 transition-all active:scale-[0.98] shadow-2xl shadow-black/[0.03] dark:shadow-black/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all" />

                    <div className="flex justify-between items-start mb-8 relative">
                      <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center font-black text-primary text-2xl border border-secondary/20 transition-all group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:scale-110">
                        {job.company?.[0] || "R"}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg border border-primary/20">
                          CDI / Full-time
                        </span>
                        <span className="text-[9px] font-bold text-muted/60 uppercase tracking-widest">Posté il y a 2j</span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black mb-3 group-hover:text-primary transition-colors line-clamp-1 text-foreground leading-tight">{job.title}</h3>
                    <p className="text-muted text-sm mb-6 flex items-center gap-2 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {job.company}
                      <span className="w-1 h-1 rounded-full bg-muted/30" /> {job.location}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8 relative">
                      <span className="px-3 py-1.5 bg-secondary/10 text-muted text-[10px] font-black uppercase tracking-wider rounded-xl border border-secondary/10 backdrop-blur-sm">
                        {job.min_years_experience}+ ans XP
                      </span>
                      <span className="px-3 py-1.5 bg-secondary/10 text-muted text-[10px] font-black uppercase tracking-wider rounded-xl border border-secondary/10 backdrop-blur-sm">
                        Master / Bac +{job.min_education_level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-secondary/10 pt-8 relative">
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted/40 mb-1">Rémunération</p>
                        <p className="text-sm font-black text-foreground">
                          {job.salary_max ? `${((job.salary_min || 0) / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k €` : (job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k €` : "Salaire N.D")}
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          if (!user) {
                            window.location.href = "/login";
                            return;
                          }
                          if (user.role !== "CANDIDATE") {
                            alert("Seuls les candidats peuvent postuler !");
                            return;
                          }

                          try {
                            const { applyToJob } = await import("@/lib/api");
                            const token = useAuthStore.getState().token;
                            if (token) {
                              await applyToJob(job.id, token);
                              alert("Candidature envoyée avec succès ! 🚀");
                            }
                          } catch (err: any) {
                            alert(err.message || "Erreur lors de la candidature");
                          }
                        }}
                        className="px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all shadow-lg hover:shadow-primary/30"
                      >
                        Postuler
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center glass-panel rounded-[3rem] border-dashed border-2 border-secondary/20">
                  <Briefcase className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                  <p className="text-muted font-black uppercase tracking-[0.3em] text-sm">Chargement du Job Board...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="container mx-auto">
            <div className="text-center mb-20">
              <span className="badge-rh bg-secondary/10 text-muted mb-5 inline-block">Technologie</span>
              <h2 className="text-5xl font-black tracking-tighter mb-6">Le Recrutement du Futur</h2>
              <p className="text-muted max-w-xl mx-auto font-medium">Pourquoi RecruitPro est devenu le standard pour les entreprises modernes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-8 h-auto md:h-[700px]">
              {/* Feature 1 */}
              <div className="md:col-span-2 md:row-span-2 glass-panel p-12 rounded-[3.5rem] flex flex-col justify-end relative overflow-hidden group">
                <div className="absolute top-12 right-12 w-48 h-48 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/30 transition-all duration-700" />
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-primary/20">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-4xl font-black mb-6 tracking-tighter">Matching Intelligent</h3>
                <p className="text-muted leading-relaxed font-medium text-lg">
                  Notre algorithme analyse non seulement les compétences, mais aussi l'expérience et le potentiel de formation pour des matches parfaits à <span className="text-primary font-bold">99.8%</span>.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="md:col-span-2 glass-panel p-12 rounded-[3.5rem] flex items-center justify-between group overflow-hidden">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter mb-3">Productivité Boostée</h3>
                  <p className="text-muted font-medium italic">Automatisez 70% de votre pre-screening.</p>
                </div>
                <div className="hidden sm:flex gap-3">
                  <div className="w-10 h-24 bg-secondary/20 rounded-2xl animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-10 h-32 bg-primary/30 rounded-2xl animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-10 h-20 bg-secondary/20 rounded-2xl animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel p-12 rounded-[3.5rem] flex flex-col justify-center text-center group hover:bg-primary/5 transition-all">
                <div className="text-6xl font-black text-primary mb-3 group-hover:scale-110 transition-transform">x3</div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted">Vitesse d'embauche</p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel p-12 rounded-[3.5rem] flex flex-col items-center justify-center group bg-gradient-to-br from-secondary/80 to-secondary dark:from-[#112239] dark:to-secondary">
                <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden mb-6 border border-white/5">
                  <div className="w-[85%] h-full bg-primary shadow-[0_0_20px_#9fd3c7]" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Croissance des Talents</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-40 px-6">
          <div className="container mx-auto">
            <div className="glass-panel p-20 rounded-[4rem] text-center bg-gradient-to-t from-secondary to-secondary/80 border-primary/20 dark:from-[#0c1c32] dark:to-[#142d4c] relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter text-foreground relative z-10">Rejoignez le futur<br />du recrutement.</h2>
              <Link
                href="/login"
                className="btn-premium bg-primary text-primary-foreground scale-125 hover:scale-[1.3] active:scale-110 shadow-2xl shadow-primary/40 inline-block relative z-10"
              >
                Commencer Maintenant
              </Link>
              <p className="mt-16 text-[10px] font-black text-muted/40 uppercase tracking-[0.4em] relative z-10">Déploiement en 5 minutes • Support 24/7</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-secondary/10 bg-secondary/5 dark:bg-transparent">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-primary-foreground shadow-lg shadow-primary/20">R</div>
                <span className="font-extrabold tracking-tighter text-2xl text-foreground">RECRUITPRO</span>
              </div>
              <p className="text-muted leading-relaxed font-medium text-lg">
                La plateforme RH pensée pour la croissance, l'humain et la performance. Déjà adopté par +500 entreprises en Europe.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-20">
              <div className="flex flex-col gap-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted/40 mb-2">Produit</h4>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">Offres IA</a>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">Matching</a>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">Tarifs</a>
              </div>
              <div className="flex flex-col gap-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted/40 mb-2">Légal</h4>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">RGPD</a>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">Confidentialité</a>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">CGU</a>
              </div>
              <div className="hidden lg:flex flex-col gap-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted/40 mb-2">Social</h4>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">LinkedIn</a>
                <a href="#" className="text-sm font-bold text-muted hover:text-primary transition-colors">Twitter (X)</a>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-secondary/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black text-muted/30 uppercase tracking-[0.3em] font-sans">© 2026 RECRUITPRO SAAS. Built with excellence.</p>
            <div className="flex gap-8 items-center opacity-40">
              <div className="w-6 h-6 bg-foreground rounded-full hover:opacity-100 transition-opacity cursor-pointer" />
              <div className="w-6 h-6 bg-foreground rounded-full hover:opacity-100 transition-opacity cursor-pointer" />
              <div className="w-6 h-6 bg-foreground rounded-full hover:opacity-100 transition-opacity cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
