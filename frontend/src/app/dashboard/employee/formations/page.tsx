"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  getMyTrainingEnrollments, TrainingEnrollment,
  getMyLmsEnrollments, LMSEnrollment,
  lmsLaunchUrl,
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, BookOpen, Clock, Award, AlertCircle, GraduationCap, ExternalLink } from "lucide-react"

// Modèle unifié : une carte de formation, quelle que soit sa source (RH ou LMS).
interface UnifiedFormation {
  key: string
  source: "rh" | "lms"
  title: string
  description?: string
  statusKey: string
  statusLabel: string
  category?: string
  skills: string[]
  metaLine?: string
  enrolledAt?: string
  score?: number | null
  courseId?: string
}

const STATUS_RH: Record<string, string> = {
  PENDING: "En attente d'approbation",
  APPROVED: "Approuvée",
  COMPLETED: "Complétée",
  CANCELLED: "Annulée",
}
const STATUS_LMS: Record<string, string> = {
  assigned: "À faire",
  in_progress: "En cours",
  completed: "Complétée",
  abandoned: "Abandonnée",
}

function statusColor(statusKey: string) {
  const k = statusKey.toLowerCase()
  if (k === "completed") return "bg-green-500/10 text-green-600 border-green-500/20"
  if (k === "approved") return "bg-blue-500/10 text-blue-600 border-blue-500/20"
  if (k === "in_progress") return "bg-blue-500/10 text-blue-600 border-blue-500/20"
  if (k === "pending" || k === "assigned") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
  if (k === "cancelled" || k === "abandoned") return "bg-red-500/10 text-red-600 border-red-500/20"
  return "bg-secondary/10 text-muted border-secondary/20"
}

function normalizeRh(list: TrainingEnrollment[]): UnifiedFormation[] {
  return list.map((e) => ({
    key: `rh-${e.id}`,
    source: "rh",
    title: e.training?.title || "Formation",
    description: e.training?.description,
    statusKey: e.status,
    statusLabel: STATUS_RH[e.status] || e.status,
    category: e.training?.category,
    skills: (e.training?.skills_taught || []).map((s) => s.skill_name || `Skill ${s.skill_id}`),
    metaLine: e.training?.provider
      ? `Fournisseur : ${e.training.provider}`
      : e.training?.duration_hours
        ? `${e.training.duration_hours}h`
        : undefined,
    enrolledAt: e.enrolled_at,
    score: e.score,
  }))
}

function normalizeLms(list: LMSEnrollment[]): UnifiedFormation[] {
  return list.map((e) => {
    const c = e.courseId
    return {
      key: `lms-${e._id}`,
      source: "lms",
      title: c?.title || "Cours",
      description: c?.description,
      statusKey: e.status,
      statusLabel: STATUS_LMS[e.status] || e.status,
      category: undefined,
      skills: c?.skillLevel ? [`Compétence visée · niveau ${c.skillLevel}`] : [],
      metaLine: c?.finalExam ? "Examen final requis pour valider" : undefined,
      enrolledAt: e.assignedAt,
      score: e.finalScore ?? null,
      courseId: c?._id,
    }
  })
}

export default function FormationsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [items, setItems] = React.useState<UnifiedFormation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<"all" | "rh" | "lms">("all")

  React.useEffect(() => {
    if (!user || user.role !== "EMPLOYEE" || !token) {
      router.push("/login")
      return
    }

    const loadData = async () => {
      // Les deux systèmes de formation sont interrogés en parallèle et fusionnés :
      // les Trainings RH (Postgres) et les cours assignés via le LMS (Mongo).
      const [rhRes, lmsRes] = await Promise.allSettled([
        getMyTrainingEnrollments(token),
        getMyLmsEnrollments(token),
      ])

      const merged: UnifiedFormation[] = []
      if (rhRes.status === "fulfilled") merged.push(...normalizeRh(rhRes.value))
      if (lmsRes.status === "fulfilled") merged.push(...normalizeLms(lmsRes.value))

      if (rhRes.status === "rejected" && lmsRes.status === "rejected") {
        setError("Impossible de charger les formations")
      }

      // Tri : les plus récentes d'abord
      merged.sort((a, b) => (b.enrolledAt || "").localeCompare(a.enrolledAt || ""))
      setItems(merged)
      setLoading(false)
    }

    loadData()
  }, [user, token, router])

  const launchLms = (path: string) => {
    if (!token) return
    window.open(lmsLaunchUrl(token, path), "_blank", "noopener")
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.source === filter)
  const counts = {
    rh: items.filter((i) => i.source === "rh").length,
    lms: items.filter((i) => i.source === "lms").length,
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
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-xl pointer-events-auto transition-all text-muted hover:text-foreground font-bold text-xs uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl pt-24 px-6 pb-20">
        <header className="mb-12 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Mes Formations</h1>
            <p className="text-muted font-medium">
              Vos formations RH et vos cours en ligne (LMS), réunis au même endroit
            </p>
          </div>
          <button
            onClick={() => launchLms("/dashboard")}
            title="Ouvrir l'Académie en ligne (LMS)"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap"
          >
            <GraduationCap className="w-4 h-4" /> Académie <ExternalLink className="w-3 h-3" />
          </button>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="mb-6 flex gap-2">
            {([
              ["all", `Toutes (${items.length})`],
              ["rh", `Formations RH (${counts.rh})`],
              ["lms", `Cours en ligne (${counts.lms})`],
            ] as const).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === s
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                    : "bg-secondary/10 text-muted hover:text-foreground hover:bg-secondary/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-secondary/10 rounded-panel">
            <BookOpen className="w-16 h-16 text-muted/20 mx-auto mb-4" />
            <h2 className="text-lg font-black mb-2">Aucune formation</h2>
            <p className="text-muted font-medium">
              {items.length === 0
                ? "Vous n'avez pas encore de formation assignée"
                : "Aucune formation dans cette catégorie"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((f) => (
              <div key={f.key} className="glass-panel p-6 rounded-panel shadow-xl shadow-black/5 hover:shadow-xl hover:shadow-primary/10 transition-all flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em] ${
                        f.source === "lms" ? "bg-blue-500/10 text-blue-500" : "bg-secondary/15 text-muted"
                      }`}>
                        {f.source === "lms" ? "Cours en ligne" : "Formation RH"}
                      </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight mb-2">{f.title}</h3>
                    {f.description && (
                      <p className="text-sm text-muted line-clamp-2">{f.description}</p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ml-4 ${statusColor(f.statusKey)}`}>
                    {f.statusLabel}
                  </div>
                </div>

                <div className="space-y-3 mb-4 text-sm">
                  {f.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Catégorie</span>
                      <span className="font-bold">{f.category}</span>
                    </div>
                  )}
                  {f.metaLine && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-bold">{f.metaLine}</span>
                    </div>
                  )}
                </div>

                {f.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 mb-2">Compétences</p>
                    <div className="flex flex-wrap gap-2">
                      {f.skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-secondary/10 pt-4 mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted">
                    {f.enrolledAt && <span>Assignée le {new Date(f.enrolledAt).toLocaleDateString("fr-FR")}</span>}
                    {f.statusKey.toLowerCase() === "completed" && f.score != null && (
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Award className="w-4 h-4" /> {f.score}%
                      </span>
                    )}
                  </div>
                  {f.source === "lms" && f.statusKey !== "completed" && (
                    <button
                      onClick={() => launchLms(f.courseId ? `/courses/${f.courseId}` : "/dashboard")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-black rounded-lg hover:bg-blue-600 transition-all"
                    >
                      Continuer dans le LMS <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
