"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  getGpecOverview, GpecOverview, GpecCoverage,
  getGpecSkillGap, getCoursesForSkill, assignCourse,
  GpecSkillGap, LMSCourse,
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Users, Layers, Briefcase, AlertTriangle, X, Check, Zap, GraduationCap, Target, BarChart3 } from "lucide-react"
import ForecastView from "./ForecastView"

const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  critique: { label: "Critique", chip: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500" },
  partiel:  { label: "Partiel",  chip: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500" },
  ok:       { label: "Couvert",  chip: "bg-green-500/10 text-green-500 border-green-500/20", dot: "bg-green-500" },
}

export default function GpecPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [data, setData] = React.useState<GpecOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [view, setView] = React.useState<"staffing" | "forecast">("staffing")

  // Plan d'action : assignation d'une formation pour une compétence en tension
  const [action, setAction] = React.useState<GpecCoverage | null>(null)
  const [gap, setGap] = React.useState<GpecSkillGap | null>(null)
  const [courses, setCourses] = React.useState<LMSCourse[]>([])
  const [actionLoading, setActionLoading] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<string>("")
  const [selectedEmps, setSelectedEmps] = React.useState<Set<number>>(new Set())
  const [assigning, setAssigning] = React.useState(false)
  const [done, setDone] = React.useState<string | null>(null)

  const reload = React.useCallback(() => {
    if (!token) return
    getGpecOverview(token).then(setData).catch((e) => setError(e.message || "Erreur de chargement")).finally(() => setLoading(false))
  }, [token])

  React.useEffect(() => {
    if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN") || !token) {
      router.push("/login")
      return
    }
    reload()
  }, [user, token, router, reload])

  const openAction = async (c: GpecCoverage) => {
    if (!token) return
    setAction(c); setGap(null); setCourses([]); setSelectedCourse(""); setSelectedEmps(new Set()); setDone(null)
    setActionLoading(true)
    try {
      const [g, cs] = await Promise.all([getGpecSkillGap(c.skill_id, token), getCoursesForSkill(c.skill_id, token)])
      setGap(g)
      setCourses(cs)
      setSelectedEmps(new Set(g.employees.map((e) => e.user_id)))
      if (cs.length === 1) setSelectedCourse(cs[0]._id)
    } catch (e: any) {
      setDone(e.message || "Erreur de chargement")
    } finally {
      setActionLoading(false)
    }
  }

  const runAssign = async () => {
    if (!token || !selectedCourse || selectedEmps.size === 0) return
    setAssigning(true)
    let ok = 0
    for (const uid of selectedEmps) {
      try { await assignCourse(uid, selectedCourse, token); ok++ } catch { /* déjà inscrit, etc. */ }
    }
    setAssigning(false)
    setDone(`${ok} employé(s) inscrit(s). La compétence se mettra à jour à la réussite de la formation.`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 p-6 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.push("/dashboard/recruiter")}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-xl pointer-events-auto transition-all text-muted hover:text-foreground font-bold text-xs uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="pointer-events-auto"><ThemeToggle /></div>
      </nav>

      <main className="container mx-auto max-w-6xl pt-24 px-6 pb-20">
        <header className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-2">Pilotage GPEC</p>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            {view === "staffing" ? "Cartographie des compétences" : "GPEC prévisionnelle"}
          </h1>
          <p className="text-muted font-medium">
            {view === "staffing"
              ? "État des lieux des compétences détenues et analyse des écarts par rapport aux postes ouverts"
              : "Couverture des emplois-types cibles par l'effectif, à horizon — besoins futurs et viviers internes"}
          </p>
        </header>

        {/* Toggle staffing ↔ prévisionnel */}
        <div className="inline-flex p-1 mb-10 rounded-2xl bg-secondary/10 border border-secondary/15">
          <button
            onClick={() => setView("staffing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${view === "staffing" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}
          >
            <BarChart3 className="w-4 h-4" /> Postes ouverts
          </button>
          <button
            onClick={() => setView("forecast")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${view === "forecast" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}
          >
            <Target className="w-4 h-4" /> Prévisionnel
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold">{error}</div>
        )}

        {view === "forecast" && token && <ForecastView token={token} />}

        {view === "staffing" && data && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <Kpi icon={<Users />} label="Effectif" value={data.headcount} />
              <Kpi icon={<Layers />} label="Compétences détenues" value={data.distinct_skills} />
              <Kpi icon={<Briefcase />} label="Postes ouverts" value={data.open_positions} />
              <Kpi icon={<AlertTriangle />} label="Compétences en tension" value={data.tension_count} alert={data.tension_count > 0} />
            </div>

            {/* Indice de couverture global */}
            <div className="glass-panel p-6 rounded-2xl mb-12">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Indice de couverture global</p>
                  <p className="text-sm text-muted/70 mt-0.5">
                    {data.covered_count} / {data.required_count} compétences requises couvertes par l'effectif
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-black ${data.coverage_index >= data.coverage_target ? "text-green-500" : "text-primary"}`}>
                    {data.coverage_index}%
                  </span>
                  <p className="text-[10px] font-bold text-muted/60">objectif {data.coverage_target}%</p>
                </div>
              </div>
              <div className="relative h-3 bg-secondary/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${data.coverage_index >= data.coverage_target ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(data.coverage_index, 100)}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/50"
                  style={{ left: `${data.coverage_target}%` }}
                  title={`Objectif ${data.coverage_target}%`}
                />
              </div>
            </div>

            {/* État des lieux par domaine */}
            <section className="mb-12">
              <h2 className="text-xl font-black mb-1">État des lieux par domaine</h2>
              <p className="text-sm text-muted mb-5">Compétences détenues par les collaborateurs, regroupées par domaine métier.</p>
              {data.domains.length === 0 ? (
                <p className="text-sm text-muted/60">Aucune compétence renseignée pour les collaborateurs.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.domains.map((d) => (
                    <div key={d.label} className="glass-panel p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black">{d.label}</h3>
                        <span className="text-xs font-bold text-muted">{d.employees} collab. · {d.skill_entries} comp.</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-secondary/20 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(d.avg_level / 4) * 100}%` }} />
                        </div>
                        <span className="text-xs font-black text-primary whitespace-nowrap">niv. moy. {d.avg_level.toFixed(1)}/4</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Analyse des écarts */}
            <section>
              <h2 className="text-xl font-black mb-1">Analyse des écarts</h2>
              <p className="text-sm text-muted mb-5">
                Couverture de chaque compétence exigée par les postes ouverts. Les compétences <span className="text-red-500 font-bold">critiques</span> et <span className="text-amber-500 font-bold">partielles</span> sont les priorités de formation ou de recrutement.
              </p>

              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-secondary/15 text-[10px] uppercase tracking-widest text-muted/60">
                        <th className="text-left font-black px-5 py-3">Compétence</th>
                        <th className="text-left font-black px-3 py-3">Domaine</th>
                        <th className="text-center font-black px-3 py-3">Niv. requis</th>
                        <th className="text-center font-black px-3 py-3">Détiennent</th>
                        <th className="text-center font-black px-3 py-3">Au niveau</th>
                        <th className="text-center font-black px-3 py-3">État</th>
                        <th className="text-left font-black px-3 py-3">Impact</th>
                        <th className="text-right font-black px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.coverage.map((c: GpecCoverage) => {
                        const st = STATUS[c.status]
                        return (
                          <tr key={c.skill} className="border-b border-secondary/10 last:border-0 hover:bg-secondary/5">
                            <td className="px-5 py-3 font-bold align-top">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${st.dot}`} />
                              {c.skill}
                              {c.is_mandatory && <span className="ml-2 text-[9px] font-bold uppercase text-muted/50">obligatoire</span>}
                              {c.reason && <p className="text-[11px] font-medium text-muted/70 mt-1 ml-4 normal-case">{c.reason}</p>}
                            </td>
                            <td className="px-3 py-3 text-muted align-top">{c.domain}</td>
                            <td className="px-3 py-3 text-center font-bold align-top">{c.required_level}</td>
                            <td className="px-3 py-3 text-center align-top">{c.employees_with}</td>
                            <td className="px-3 py-3 text-center font-bold align-top">{c.employees_at_level}</td>
                            <td className="px-3 py-3 text-center align-top">
                              <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${st.chip}`}>{st.label}</span>
                            </td>
                            <td className="px-3 py-3 text-left align-top text-xs text-muted whitespace-nowrap">
                              {c.jobs_impacted > 0 ? (
                                <span title={c.job_titles.join(" · ")}>
                                  {c.jobs_impacted} poste{c.jobs_impacted > 1 ? "s" : ""}
                                  <span className="text-muted/40"> · </span>
                                  {c.teams_impacted} équipe{c.teams_impacted > 1 ? "s" : ""}
                                </span>
                              ) : <span className="text-muted/40">—</span>}
                            </td>
                            <td className="px-5 py-3 text-right align-top">
                              {c.status !== "ok" && (
                                <button
                                  onClick={() => openAction(c)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-black rounded-lg hover:bg-primary/20 transition-all"
                                >
                                  <Zap className="w-3 h-3" /> Agir
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {data.coverage.length === 0 && (
                        <tr><td colSpan={8} className="px-5 py-8 text-center text-muted/60">Aucune exigence de poste à analyser.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal — plan d'action : assigner une formation */}
      {action && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setAction(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-secondary/20 rounded-3xl shadow-2xl w-full max-w-lg p-7 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Plan d'action</p>
                  <h3 className="font-black text-lg">Combler l'écart : {action.skill}</h3>
                </div>
                <button onClick={() => setAction(null)} className="text-muted/40 hover:text-muted"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted mb-5">
                Assigner une formation qui valide cette compétence aux employés sous le niveau requis ({action.required_level}).
              </p>

              {actionLoading ? (
                <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
              ) : done ? (
                <div className="py-6 text-center">
                  <div className="inline-flex w-14 h-14 rounded-full bg-green-500/15 text-green-600 items-center justify-center mb-3"><Check className="w-7 h-7" /></div>
                  <p className="font-bold mb-5">{done}</p>
                  <button onClick={() => { setAction(null); reload() }} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black">Fermer</button>
                </div>
              ) : courses.length === 0 ? (
                <div className="py-6 text-center">
                  <GraduationCap className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted font-medium mb-1">Aucune formation ne valide « {action.skill} » dans le LMS.</p>
                  <p className="text-xs text-muted/60">Créez-en une depuis l'Académie (espace instructeur), en la liant à cette compétence.</p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted/60 mb-2">Formation</p>
                  <div className="space-y-2 mb-5">
                    {courses.map((c) => (
                      <button key={c._id} onClick={() => setSelectedCourse(c._id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedCourse === c._id ? "bg-primary/10 border-primary/30" : "bg-secondary/5 border-secondary/10 hover:border-primary/20"}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedCourse === c._id ? "bg-primary border-primary" : "border-secondary/30"}`}>
                          {selectedCourse === c._id && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="font-bold text-sm truncate">{c.title}</span>
                        {c.skillLevel && <span className="ml-auto text-[10px] font-bold text-primary whitespace-nowrap">niv. {c.skillLevel}</span>}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted/60 mb-2">Employés à former ({gap?.employees.length || 0})</p>
                  {gap && gap.employees.length === 0 ? (
                    <p className="text-sm text-muted/60 mb-5">Tous les employés possèdent déjà le niveau requis.</p>
                  ) : (
                    <div className="space-y-1.5 mb-6 max-h-48 overflow-y-auto">
                      {gap?.employees.map((e) => {
                        const sel = selectedEmps.has(e.user_id)
                        return (
                          <button key={e.user_id}
                            onClick={() => setSelectedEmps((prev) => { const n = new Set(prev); n.has(e.user_id) ? n.delete(e.user_id) : n.add(e.user_id); return n })}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${sel ? "bg-primary/10 border-primary/30" : "bg-secondary/5 border-secondary/10"}`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? "bg-primary border-primary" : "border-secondary/30"}`}>
                              {sel && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="font-bold text-sm">{e.name}</span>
                            <span className="ml-auto text-[10px] text-muted/60">{e.current_level === 0 ? "compétence absente" : `niveau ${e.current_level}`}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <button onClick={runAssign} disabled={!selectedCourse || selectedEmps.size === 0 || assigning}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 disabled:opacity-40 transition-all">
                    {assigning ? "Assignation…" : `Assigner la formation (${selectedEmps.size})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, alert }: { icon: React.ReactElement; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`glass-panel p-5 rounded-2xl ${alert ? "ring-1 ring-red-500/30" : ""}`}>
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${alert ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mt-1">{label}</p>
    </div>
  )
}
