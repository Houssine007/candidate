"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  getEmployeeMe, getUserPermissions, getMyProfile,
  EmployeeProfile, UserPermissions, CandidateProfile
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, BookOpen, Briefcase, User, Award, AlertCircle, Pencil, GraduationCap, FileText } from "lucide-react"

const EDUCATION_LABELS: Record<number, string> = {
  0: "Sans diplôme", 1: "CAP / BEP", 2: "Bac", 3: "Bac +2", 4: "Bac +3",
  5: "Bac +5", 6: "Bac +6", 7: "Doctorat", 8: "HDR",
}

export default function EmployeeDashboard() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
  const [employee, setEmployee] = React.useState<EmployeeProfile | null>(null)
  const [permissions, setPermissions] = React.useState<UserPermissions | null>(null)
  const [profile, setProfile] = React.useState<CandidateProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!user || user.role !== "EMPLOYEE" || !token) {
      router.push("/login")
      return
    }

    const loadData = async () => {
      try {
        const [empData, permData] = await Promise.all([
          getEmployeeMe(token),
          getUserPermissions(token)
        ])
        setEmployee(empData)
        setPermissions(permData)
        // Profil candidat « emporté » depuis le parcours de recrutement (non bloquant)
        try {
          setProfile(await getMyProfile(token))
        } catch {
          /* pas de profil candidat lié : on ignore */
        }
      } catch (err: any) {
        console.error(err)
        setError("Impossible de charger les données. Session expirée ?")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, token, router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const canAccessHR = permissions?.permissions.some(p => p.includes("manage") || p.includes("edit"))

  // Compétences à afficher : on privilégie le profil candidat (avec noms) sinon les skills employé
  const displaySkills = React.useMemo(() => {
    if (profile?.skills && profile.skills.length > 0) {
      return profile.skills.map(s => ({ label: s.name || `Skill ${s.skill_id}`, level: s.level, years: s.years_experience }))
    }
    return (employee?.skills || []).map(s => ({ label: `Skill ${s.skill_id}`, level: s.level, years: s.years_experience }))
  }, [profile, employee])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black mb-2">Erreur</h1>
        <p className="text-muted mb-8">{error || "Données non trouvées"}</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <aside className="fixed left-0 top-0 h-full w-64 bg-secondary/5 border-r border-secondary/10 hidden lg:flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-black text-primary text-sm">R</div>
          <span className="font-extrabold tracking-tighter text-lg">RECRUITPRO</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => router.push("/dashboard/employee")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm bg-primary/10 text-primary border border-primary/20">
            <User className="w-4 h-4" /> Mon Profil
          </button>
          <button onClick={() => router.push("/dashboard/employee/formations")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
            <BookOpen className="w-4 h-4" /> Mes Formations
          </button>
          <button onClick={() => router.push("/dashboard/employee/mobilite")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
            <Briefcase className="w-4 h-4" /> Mobilité Interne
          </button>
          {canAccessHR && (
            <button onClick={() => router.push("/dashboard/recruiter")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
              <Award className="w-4 h-4" /> Outils RH
            </button>
          )}
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-muted/60 hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-bold text-xs uppercase tracking-widest mt-auto">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </aside>

      <main className="lg:ml-64 p-6 md:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Bonjour, {employee.first_name} 👋</h1>
            <p className="text-muted font-medium">
              {employee.job_title ? `${employee.job_title} • ` : ""}
              {employee.years_of_experience}+ ans d'expérience
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/candidate/onboarding")}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-black text-xs rounded-xl hover:bg-primary/90 transition-all"
            >
              <Pencil className="w-3 h-3" /> Éditer mon profil
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 rounded-panel-sm shadow-xl shadow-black/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">Rôle Interne</p>
                <p className="text-xl font-black">{permissions?.internal_role?.name || "Collaborateur"}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-panel-sm shadow-xl shadow-black/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">Compétences</p>
                <p className="text-xl font-black">{displaySkills.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-panel-sm shadow-xl shadow-black/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">Permissions</p>
                <p className="text-xl font-black">{permissions?.permissions.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Profil professionnel emporté depuis la candidature */}
            <section className="glass-panel p-8 rounded-panel shadow-xl shadow-black/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" /> Mon Profil Professionnel
                </h2>
                <button
                  onClick={() => router.push("/dashboard/candidate/onboarding")}
                  className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/70 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Modifier
                </button>
              </div>

              {profile ? (
                <div className="space-y-6">
                  {profile.bio && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Bio</p>
                      <p className="text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1 flex items-center gap-2"><Briefcase className="w-3 h-3" /> Expérience</p>
                      <p className="font-bold">{profile.years_of_experience ?? employee.years_of_experience ?? 0} ans</p>
                    </div>
                    <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1 flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Formation</p>
                      <p className="font-bold">{EDUCATION_LABELS[profile.education_level ?? employee.education_level ?? 0] || `Niveau ${profile.education_level}`}</p>
                    </div>
                  </div>
                  {profile.experience_detail && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Parcours</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">{profile.experience_detail}</p>
                    </div>
                  )}
                  {profile.formations && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Diplômes & Formations</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">{profile.formations}</p>
                    </div>
                  )}
                  {profile.certifications && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Certifications</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">{profile.certifications}</p>
                    </div>
                  )}
                  {profile.cv_url && (
                    <a href={profile.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                      <FileText className="w-3 h-3" /> Voir mon CV
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted/40" />
                  <p className="text-sm font-bold">Votre profil professionnel est vide</p>
                  <button
                    onClick={() => router.push("/dashboard/candidate/onboarding")}
                    className="mt-4 px-4 py-2 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary/90 transition-all"
                  >
                    Compléter mon profil
                  </button>
                </div>
              )}
            </section>

            <section className="glass-panel p-8 rounded-panel shadow-xl shadow-black/5">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" /> Mes Formations
              </h2>
              <div className="text-center py-10 opacity-50">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted/40" />
                <p className="text-sm font-bold">Aucune formation assignée pour le moment</p>
                <p className="text-[10px] text-muted/60 mt-2">Votre manager vous assignera des formations</p>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="glass-panel p-8 rounded-panel shadow-xl shadow-black/5">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" /> Compétences
              </h2>
              <div className="space-y-4">
                {displaySkills.length > 0 ? (
                  displaySkills.map((skill, idx) => (
                    <div key={idx} className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                      <p className="text-sm font-bold text-foreground">{skill.label}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-secondary/20 rounded-full">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(skill.level / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-primary">Niv. {skill.level}</span>
                      </div>
                      <p className="text-[10px] text-muted/60 mt-1">{skill.years} ans</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 opacity-50">
                    <p className="text-[10px] font-bold uppercase">Aucune compétence</p>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-panel p-8 rounded-panel shadow-xl shadow-black/5">
              <h2 className="text-xl font-black mb-4">Infos Profil</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Email</span>
                  <span className="font-bold">{employee.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Téléphone</span>
                  <span className="font-bold">{employee.phone || profile?.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Poste</span>
                  <span className="font-bold">{employee.job_title || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Éducation</span>
                  <span className="font-bold">Bac +{employee.education_level}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
