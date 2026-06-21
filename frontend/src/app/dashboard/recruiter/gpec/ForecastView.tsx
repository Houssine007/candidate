"use client"

import * as React from "react"
import {
  getGpecForecast, getGpecForecastSynthesis, getGpecTargetPool, getGpecMobility,
  ForecastOverview, ForecastRole, ForecastSynthesis, TargetPool, PoolPerson,
} from "@/lib/api"
import { Users, Target, TrendingUp, AlertTriangle, Sparkles, GraduationCap, Clock, ArrowRight, X } from "lucide-react"

const ST: Record<string, { label: string; chip: string; dot: string; bar: string }> = {
  critique: { label: "Critique", chip: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500", bar: "bg-red-500" },
  partiel:  { label: "Partiel",  chip: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500", bar: "bg-amber-500" },
  couvert:  { label: "Couvert",  chip: "bg-green-500/10 text-green-500 border-green-500/20", dot: "bg-green-500", bar: "bg-green-500" },
}

export default function ForecastView({ token }: { token: string }) {
  const [data, setData] = React.useState<ForecastOverview | null>(null)
  const [synth, setSynth] = React.useState<ForecastSynthesis | null>(null)
  const [synthLoading, setSynthLoading] = React.useState(true)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [poolRole, setPoolRole] = React.useState<ForecastRole | null>(null)
  const [pool, setPool] = React.useState<TargetPool | null>(null)
  const [poolLoading, setPoolLoading] = React.useState(false)

  const openPool = (r: ForecastRole) => {
    setPoolRole(r); setPool(null); setPoolLoading(true)
    getGpecTargetPool(r.target_id, token).then(setPool).catch(() => {}).finally(() => setPoolLoading(false))
  }

  React.useEffect(() => {
    getGpecForecast(token).then(setData).catch((e) => setError(e.message || "Erreur")).finally(() => setLoading(false))
    getGpecForecastSynthesis(token).then(setSynth).catch(() => {}).finally(() => setSynthLoading(false))
  }, [token])

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
  }
  if (error) {
    return <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold">{error}</div>
  }
  if (!data) return null

  if (data.targets_count === 0) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center">
        <Target className="w-10 h-10 text-muted/30 mx-auto mb-3" />
        <p className="font-bold mb-1">Aucun emploi-type cible défini</p>
        <p className="text-sm text-muted/70">Définissez des cibles d'effectif (métier, nombre, horizon) pour obtenir l'analyse prévisionnelle.</p>
      </div>
    )
  }

  const reached = data.coverage_index >= data.coverage_target

  return (
    <div className="space-y-8">
      {/* KPIs prévisionnels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users />} label="Effectif" value={data.headcount} />
        <Kpi icon={<Target />} label="Emplois-types cibles" value={data.targets_count} />
        <Kpi icon={<TrendingUp />} label="Postes à pourvoir (écart)" value={data.total_gap} />
        <Kpi icon={<AlertTriangle />} label="Cibles en tension" value={data.tension_count} alert={data.tension_count > 0} />
      </div>

      {/* Indice de couverture des besoins futurs */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Couverture des besoins futurs</p>
            <p className="text-sm text-muted/70 mt-0.5">{data.total_qualified} / {data.total_target_headcount} postes cibles déjà couverts par l'effectif</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-black ${reached ? "text-green-500" : "text-primary"}`}>{data.coverage_index}%</span>
            <p className="text-[10px] font-bold text-muted/60">objectif {data.coverage_target}%</p>
          </div>
        </div>
        <div className="relative h-3 bg-secondary/20 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${reached ? "bg-green-500" : "bg-primary"}`} style={{ width: `${Math.min(data.coverage_index, 100)}%` }} />
          <div className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${data.coverage_target}%` }} title={`Objectif ${data.coverage_target}%`} />
        </div>
      </div>

      {/* Synthèse RH (LLM) */}
      <div className="glass-panel p-6 rounded-2xl border border-primary/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex p-2 rounded-xl bg-primary/10 text-primary"><Sparkles className="w-4 h-4" /></div>
          <h3 className="font-black">Synthèse RH</h3>
          {synth && (
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-muted/50">
              {synth.source === "groq" ? "Génération IA" : "Synthèse auto"}
            </span>
          )}
        </div>
        {synthLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-secondary/20 rounded w-full" />
            <div className="h-3 bg-secondary/20 rounded w-[92%]" />
            <div className="h-3 bg-secondary/20 rounded w-[80%]" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{synth?.synthesis}</p>
        )}
      </div>

      {/* Cartes par emploi-type cible */}
      <div className="space-y-4">
        <h2 className="text-xl font-black">Couverture par emploi-type cible</h2>
        {data.roles.map((r) => <RoleCard key={r.target_id} r={r} onPool={() => openPool(r)} />)}
      </div>

      {/* Modal — vivier interne */}
      {poolRole && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setPoolRole(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-secondary/20 rounded-3xl shadow-2xl w-full max-w-2xl p-7 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Vivier interne</p>
                  <h3 className="font-black text-lg">{poolRole.role}</h3>
                </div>
                <button onClick={() => setPoolRole(null)} className="text-muted/40 hover:text-muted"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted mb-5">
                Collaborateurs déjà qualifiés et potentiels à former pour atteindre la cible
                ({poolRole.target_headcount} poste{poolRole.target_headcount > 1 ? "s" : ""}).
              </p>
              {poolLoading || !pool ? (
                <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-green-500 mb-2">Déjà qualifiés ({pool.qualified.length})</p>
                    {pool.qualified.length === 0 ? (
                      <p className="text-sm text-muted/60">Aucun collaborateur ne couvre encore ce métier.</p>
                    ) : pool.qualified.map((p) => (
                      <div key={p.employee_id} className="flex items-center gap-2 py-1.5 text-sm border-b border-secondary/10 last:border-0">
                        <Check2 /> <span className="font-bold">{p.name}</span>
                        <span className="text-[11px] text-muted/50">{p.job_title}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Potentiels à former ({pool.potentials.length})</p>
                    {pool.potentials.length === 0 ? (
                      <p className="text-sm text-muted/60">Aucun potentiel interne identifié.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {pool.potentials.map((p) => <PotentialRow key={p.employee_id} p={p} targetId={poolRole.target_id} token={token} />)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Check2() {
  return <span className="inline-flex w-4 h-4 rounded-full bg-green-500/15 text-green-600 items-center justify-center text-[10px]">✓</span>
}

function PotentialRow({ p, targetId, token }: { p: PoolPerson; targetId: number; token: string }) {
  const [expl, setExpl] = React.useState<string | null>(null)
  const [source, setSource] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const analyse = () => {
    if (expl || loading) return
    setLoading(true)
    getGpecMobility(targetId, p.employee_id, token)
      .then((m) => { setExpl(m.explanation); setSource(m.source) })
      .catch(() => setExpl("Analyse indisponible."))
      .finally(() => setLoading(false))
  }

  return (
    <div className="bg-secondary/5 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-bold text-sm">{p.name}</span>
        <span className="text-[10px] text-muted/50">{p.job_title}</span>
        <span className="ml-auto text-[10px] font-black text-primary">potentiel {Math.round(p.potential_score ?? 0)}</span>
      </div>
      {p.to_develop.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.to_develop.map((d) => (
            <span key={d.skill} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${d.mandatory ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-secondary/10 text-muted border-secondary/20"}`}>
              {d.skill} <span className="opacity-60">n{d.actual}→n{d.required}</span>
            </span>
          ))}
        </div>
      )}
      {expl ? (
        <div className="mt-1 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted/60">
              Analyse de mobilité {source === "groq" ? "· IA" : ""}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/90">{expl}</p>
        </div>
      ) : (
        <button
          onClick={analyse}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[10px] font-black text-primary hover:underline disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" /> {loading ? "Analyse…" : "Analyser la mobilité (IA)"}
        </button>
      )}
    </div>
  )
}

function RoleCard({ r, onPool }: { r: ForecastRole; onPool: () => void }) {
  const st = ST[r.status]
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${st.dot}`} />
            <h3 className="font-black">{r.role}</h3>
            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${st.chip}`}>{st.label}</span>
          </div>
          {r.horizon && (
            <p className="text-[11px] text-muted/60 font-bold mt-1 flex items-center gap-1 ml-4">
              <Clock className="w-3 h-3" /> horizon {r.horizon}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`text-2xl font-black ${r.status === "couvert" ? "text-green-500" : "text-primary"}`}>{r.coverage_pct}%</span>
          <p className="text-[10px] font-bold text-muted/60">{r.qualified_count}/{r.target_headcount} cible</p>
        </div>
      </div>

      {/* mini-stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Mini label="Qualifiés" value={r.qualified_count} tone="text-green-500" />
        <Mini label="Potentiels internes" value={r.potential_count} tone="text-primary" />
        <Mini label="Écart à combler" value={r.gap} tone={r.gap > 0 ? "text-amber-500" : "text-muted"} />
      </div>

      {/* compétences d'avenir non couvertes */}
      {r.emergent_skills.filter((e) => e.holders_at_level === 0).length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60 mb-1.5">Compétences d'avenir non couvertes</p>
          <div className="flex flex-wrap gap-1.5">
            {r.emergent_skills.filter((e) => e.holders_at_level === 0).map((e) => (
              <span key={e.skill} className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 text-[10px] font-bold">
                ✦ {e.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* listes qualifiés / potentiels */}
      <div className="grid md:grid-cols-2 gap-4">
        <PeopleList title="Déjà qualifiés" people={r.qualified} empty="Aucun collaborateur ne couvre encore ce métier." icon={<Users className="w-3.5 h-3.5" />} showScore="skill_score" />
        <PeopleList title="Potentiels à former" people={r.potentials} empty="Aucun potentiel interne identifié." icon={<GraduationCap className="w-3.5 h-3.5" />} showScore="potential_score" />
      </div>

      <button
        onClick={onPool}
        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-black rounded-lg hover:bg-primary/20 transition-all"
      >
        Voir le vivier interne <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function PeopleList({ title, people, empty, icon, showScore }: {
  title: string; people: any[]; empty: string; icon: React.ReactElement; showScore: "skill_score" | "potential_score"
}) {
  return (
    <div className="bg-secondary/5 rounded-xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60 mb-2 flex items-center gap-1.5">{icon} {title} ({people.length})</p>
      {people.length === 0 ? (
        <p className="text-xs text-muted/50">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {people.map((p) => (
            <div key={p.employee_id} className="flex items-center gap-2 text-sm">
              <span className="font-bold truncate">{p.name}</span>
              <span className="text-[10px] text-muted/50 truncate">{p.job_title}</span>
              {p[showScore] != null && (
                <span className="ml-auto text-[10px] font-black text-primary whitespace-nowrap">{Math.round(p[showScore])}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-secondary/5 rounded-xl p-3 text-center">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted/60 mt-0.5">{label}</p>
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
