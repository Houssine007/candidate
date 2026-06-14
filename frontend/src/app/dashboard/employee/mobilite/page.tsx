"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { getInternalPositions, getMyInternalApplications, applyToPosition, InternalPosition, InternalApplication } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Briefcase, MapPin, DollarSign, AlertCircle, CheckCircle } from "lucide-react"

export default function MobilityPage() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
  const [positions, setPositions] = React.useState<InternalPosition[]>([])
  const [applications, setApplications] = React.useState<InternalApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showMotivationModal, setShowMotivationModal] = React.useState(false)
  const [selectedPosition, setSelectedPosition] = React.useState<InternalPosition | null>(null)
  const [motivation, setMotivation] = React.useState("")

  React.useEffect(() => {
    if (!user || user.role !== "EMPLOYEE" || !token) {
      router.push("/login")
      return
    }

    const loadData = async () => {
      try {
        const [posData, appData] = await Promise.all([
          getInternalPositions(token),
          getMyInternalApplications(token)
        ])
        setPositions(posData)
        setApplications(appData)
      } catch (err: any) {
        console.error(err)
        setError("Impossible de charger les données")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, token, router])

  const hasApplied = (positionId: number) => {
    return applications.some(app => app.position_id === positionId && ["PENDING", "REVIEWING", "INTERVIEW"].includes(app.status))
  }

  const getApplicationStatus = (positionId: number) => {
    return applications.find(app => app.position_id === positionId)?.status
  }

  const handleApply = async () => {
    if (!selectedPosition || !token) return
    try {
      const app = await applyToPosition(selectedPosition.id, motivation, token)
      setApplications([...applications, app])
      setShowMotivationModal(false)
      setMotivation("")
      setSelectedPosition(null)
    } catch (err: any) {
      console.error(err)
      setError("Erreur lors de la candidature")
    }
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
          <h1 className="text-3xl font-black tracking-tight mb-2">Mobilité Interne</h1>
          <p className="text-muted font-medium">
            Découvrez les postes disponibles en interne et postulez pour progresser dans votre carrière
          </p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {positions.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-secondary/10 rounded-[2.5rem]">
            <Briefcase className="w-16 h-16 text-muted/20 mx-auto mb-4" />
            <h2 className="text-lg font-black mb-2">Aucune opportunité pour le moment</h2>
            <p className="text-muted font-medium">Revenez bientôt pour découvrir de nouveaux postes</p>
          </div>
        ) : (
          <div className="space-y-6">
            {positions.map((position) => {
              const applied = hasApplied(position.id)
              const appStatus = getApplicationStatus(position.id)
              return (
                <div key={position.id} className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5 hover:shadow-xl hover:shadow-primary/10 transition-all">
                  <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black tracking-tight mb-3">{position.title}</h3>
                      <p className="text-muted font-medium mb-4 line-clamp-2">{position.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        {position.location && (
                          <div className="flex items-center gap-2 text-muted">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{position.location}</span>
                          </div>
                        )}
                        {position.salary_min && position.salary_max && (
                          <div className="flex items-center gap-2 text-muted">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span>{position.salary_min.toLocaleString()} - {position.salary_max.toLocaleString()} €</span>
                          </div>
                        )}
                      </div>

                      {position.requirements && position.requirements.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted/60 mb-2">Compétences requises</p>
                          <div className="flex flex-wrap gap-2">
                            {position.requirements.slice(0, 3).map((req, idx) => (
                              <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                {req.skill_name || `Skill ${req.skill_id}`} {req.is_mandatory ? "(obligatoire)" : ""}
                              </span>
                            ))}
                            {position.requirements.length > 3 && (
                              <span className="px-3 py-1 bg-secondary/10 text-muted text-xs font-bold rounded-full">
                                +{position.requirements.length - 3} autres
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 min-w-max">
                      {applied ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">
                            {appStatus === "PENDING" && "Candidature envoyée"}
                            {appStatus === "REVIEWING" && "En revue"}
                            {appStatus === "INTERVIEW" && "Entretien"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPosition(position)
                            setShowMotivationModal(true)
                          }}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                        >
                          Postuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showMotivationModal && selectedPosition && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-[3rem] w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-4">Postuler à {selectedPosition.title}</h2>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Expliquez pourquoi vous souhaitez postuler à ce poste..."
              className="w-full bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all font-medium mb-6 min-h-[120px]"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowMotivationModal(false)
                  setSelectedPosition(null)
                  setMotivation("")
                }}
                className="flex-1 py-3 font-black uppercase text-xs text-muted hover:bg-secondary/10 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-3 font-black uppercase text-xs bg-primary text-primary-foreground rounded-xl transition-all hover:scale-105"
              >
                Postuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
