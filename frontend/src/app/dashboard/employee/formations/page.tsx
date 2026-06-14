"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { getMyTrainingEnrollments, Training, TrainingEnrollment } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, BookOpen, Clock, Award, AlertCircle, CheckCircle } from "lucide-react"

export default function FormationsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [enrollments, setEnrollments] = React.useState<TrainingEnrollment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<"all" | "PENDING" | "APPROVED" | "COMPLETED">("all")

  React.useEffect(() => {
    if (!user || user.role !== "EMPLOYEE" || !token) {
      router.push("/login")
      return
    }

    const loadData = async () => {
      try {
        const data = await getMyTrainingEnrollments(token)
        setEnrollments(data)
      } catch (err: any) {
        console.error(err)
        setError("Impossible de charger les formations")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, token, router])

  const filtered = filter === "all" ? enrollments : enrollments.filter(e => e.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "APPROVED":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      case "COMPLETED":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "CANCELLED":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      default:
        return "bg-secondary/10 text-muted border-secondary/20"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "En attente d'approbation",
      APPROVED: "Approuvée",
      COMPLETED: "Complétée",
      CANCELLED: "Annulée"
    }
    return labels[status] || status
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
        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-tight mb-2">Mes Formations</h1>
          <p className="text-muted font-medium">
            Suivez vos formations assignées et complétez votre développement professionnel
          </p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {enrollments.length > 0 && (
          <div className="mb-6 flex gap-2">
            {(["all", "PENDING", "APPROVED", "COMPLETED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === s
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                    : "bg-secondary/10 text-muted hover:text-foreground hover:bg-secondary/20"
                }`}
              >
                {s === "all" ? "Toutes" : getStatusLabel(s)}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-secondary/10 rounded-[2.5rem]">
            <BookOpen className="w-16 h-16 text-muted/20 mx-auto mb-4" />
            <h2 className="text-lg font-black mb-2">Aucune formation</h2>
            <p className="text-muted font-medium">
              {enrollments.length === 0
                ? "Vous n'avez pas encore de formation assignée"
                : `Aucune formation avec le statut "${filter}"`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((enrollment) => (
              <div key={enrollment.id} className="glass-panel p-6 rounded-[2.5rem] shadow-xl shadow-black/5 hover:shadow-xl hover:shadow-primary/10 transition-all flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-black tracking-tight mb-2">{enrollment.training?.title || "Formation"}</h3>
                    {enrollment.training?.description && (
                      <p className="text-sm text-muted line-clamp-2">{enrollment.training.description}</p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ml-4 ${getStatusColor(enrollment.status)}`}>
                    {getStatusLabel(enrollment.status)}
                  </div>
                </div>

                {enrollment.training && (
                  <div className="space-y-3 mb-4 text-sm">
                    {enrollment.training.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Catégorie</span>
                        <span className="font-bold">{enrollment.training.category}</span>
                      </div>
                    )}
                    {enrollment.training.duration_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-bold">{enrollment.training.duration_hours}h</span>
                      </div>
                    )}
                    {enrollment.training.provider && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Fournisseur</span>
                        <span className="font-bold">{enrollment.training.provider}</span>
                      </div>
                    )}
                  </div>
                )}

                {enrollment.training?.skills_taught && enrollment.training.skills_taught.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 mb-2">Compétences enseignées</p>
                    <div className="flex flex-wrap gap-2">
                      {enrollment.training.skills_taught.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                          {skill.skill_name || `Skill ${skill.skill_id}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-secondary/10 pt-4 mt-auto">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Inscrit le {new Date(enrollment.enrolled_at).toLocaleDateString("fr-FR")}</span>
                    {enrollment.status === "COMPLETED" && enrollment.score !== null && (
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="font-bold">{enrollment.score}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
