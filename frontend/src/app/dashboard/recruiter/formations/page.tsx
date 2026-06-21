"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  getEmployees, Employee,
  getLMSCourses, LMSCourse,
  getEmployeeEnrollments, LMSEnrollment,
  assignCourse, lmsLaunchUrl
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import {
  BookOpen, Users, TrendingUp, LogOut, Building2,
  Briefcase, Plus, Search, Check, Clock, Award,
  ChevronRight, AlertCircle, X, GraduationCap, Zap, ExternalLink
} from "lucide-react"

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  assigned:    { label: "Assigné",      color: "bg-blue-500/10 text-blue-400" },
  in_progress: { label: "En cours",     color: "bg-amber-500/10 text-amber-400" },
  completed:   { label: "Terminé",      color: "bg-green-500/10 text-green-400" },
  abandoned:   { label: "Abandonné",    color: "bg-red-500/10 text-red-400" },
}

export default function FormationsPage() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()

  const [tab, setTab] = React.useState<"employees" | "catalog">("employees")
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [courses, setCourses] = React.useState<LMSCourse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lmsOffline, setLmsOffline] = React.useState(false)

  // Employé sélectionné
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)
  const [enrollments, setEnrollments] = React.useState<LMSEnrollment[]>([])
  const [enrollLoading, setEnrollLoading] = React.useState(false)

  // Modal assignation
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assignCourseId, setAssignCourseId] = React.useState("")
  const [assigning, setAssigning] = React.useState(false)
  const [courseSearch, setCourseSearch] = React.useState("")

  React.useEffect(() => {
    if (!user || !token) { router.push("/login"); return }
    loadData()
  }, [user, token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [emps, lmsCourses] = await Promise.allSettled([
        getEmployees(token),
        getLMSCourses(token)
      ])
      if (emps.status === "fulfilled") setEmployees(emps.value)
      if (lmsCourses.status === "fulfilled") setCourses(lmsCourses.value)
      else setLmsOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const selectEmployee = async (emp: Employee) => {
    setSelectedEmployee(emp)
    setEnrollLoading(true)
    try {
      const data = await getEmployeeEnrollments(emp.id, token!)
      setEnrollments(data)
    } catch {
      setEnrollments([])
    } finally {
      setEnrollLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedEmployee || !assignCourseId || !token) return
    setAssigning(true)
    try {
      const enrollment = await assignCourse(selectedEmployee.id, assignCourseId, token)
      setEnrollments(prev => [enrollment, ...prev])
      setShowAssignModal(false)
      setAssignCourseId("")
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'assignation")
    } finally {
      setAssigning(false)
    }
  }

  // SSO : ouvre le LMS (RecruitPRO Academy) avec le JWT RH, sans ré-auth.
  // Atterrissage direct sur l'espace instructeur (gestion/création de cours).
  const handleLaunchLms = () => {
    if (!token) return
    window.open(lmsLaunchUrl(token, "/instructor/courses"), "_blank", "noopener")
  }

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
    c.status === "published"
  )

  const totalCompleted = employees.length > 0
    ? enrollments.filter(e => e.status === "completed").length
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <RecruiterSidebar active="formations" />

      {/* Main */}
      <main className="lg:ml-64 flex-1 p-6 md:p-12">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Formations & Compétences</h1>
            <p className="text-muted text-sm">Gérez les parcours de formation de vos équipes.</p>
          </div>
          <div className="flex items-center gap-3">
            {lmsOffline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20">
                <AlertCircle className="w-3 h-3" /> LMS hors ligne
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Employés" value={employees.length.toString()} icon={<Users />} color="text-primary" />
          <StatCard label="Cours disponibles" value={courses.filter(c => c.status === "published").length.toString()} icon={<BookOpen />} color="text-blue-400" />
          <StatCard label="Formations complétées" value={totalCompleted.toString()} icon={<Award />} color="text-green-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-secondary/10">
          <button
            onClick={() => setTab("employees")}
            className={`px-6 py-3 font-black text-sm transition-all border-b-2 -mb-px ${tab === "employees" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <Users className="w-4 h-4 inline mr-2" />Suivi par employé
          </button>
          <button
            onClick={() => setTab("catalog")}
            className={`px-6 py-3 font-black text-sm transition-all border-b-2 -mb-px ${tab === "catalog" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />Catalogue de cours
          </button>
        </div>

        {/* Tab: Employees */}
        {tab === "employees" && (
          <div className="flex gap-6">
            {/* Employee list */}
            <div className="w-72 flex-shrink-0 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-3">Employés</p>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted/40 text-sm">Aucun employé</div>
              ) : (
                employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => selectEmployee(emp)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      selectedEmployee?.id === emp.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-secondary/5 border-secondary/10 hover:border-primary/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-[10px] text-muted/50 truncate">{emp.job_title || "—"}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-muted/30" />
                  </button>
                ))
              )}
            </div>

            {/* Employee detail */}
            <div className="flex-1">
              {!selectedEmployee ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted/30">
                  <Users className="w-12 h-12 mb-3" />
                  <p className="font-black text-sm uppercase tracking-widest">Sélectionnez un employé</p>
                </div>
              ) : (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xl">
                        {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                      </div>
                      <div>
                        <h2 className="font-black text-xl">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                        <p className="text-muted text-sm">{selectedEmployee.job_title || "Aucun titre"} · {selectedEmployee.department || "—"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      disabled={lmsOffline}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-black text-xs rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Assigner une formation
                    </button>
                  </div>

                  {/* Enrollments */}
                  {enrollLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-secondary/10 rounded-2xl">
                      <GraduationCap className="w-8 h-8 text-muted/20 mx-auto mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest text-muted/30">Aucune formation assignée</p>
                      <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={lmsOffline}
                        className="mt-4 text-xs font-bold text-primary hover:text-primary/70 transition-colors disabled:opacity-40"
                      >
                        + Assigner une formation
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.map(enroll => {
                        const course = enroll.courseId as LMSCourse
                        const st = STATUS_LABEL[enroll.status]
                        const totalModules = (course as any).modules?.length || 0
                        const completedModules = enroll.progress?.completedModules || 0
                        const pct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

                        return (
                          <div key={enroll._id} className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 flex items-center gap-5">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-sm truncate">{course?.title || "Cours supprimé"}</p>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${st?.color}`}>
                                  {st?.label}
                                </span>
                              </div>
                              {enroll.status === "in_progress" && totalModules > 0 && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-muted/50">{pct}%</span>
                                </div>
                              )}
                              {enroll.status === "completed" && enroll.finalScore != null && (
                                <p className="text-[10px] text-green-400 font-bold mt-1">
                                  Score final : {enroll.finalScore}% · {course?.skillLevel && `Compétence niveau ${course.skillLevel} validée`}
                                </p>
                              )}
                              <p className="text-[10px] text-muted/40 mt-1">
                                Assigné le {new Date(enroll.assignedAt).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Catalog */}
        {tab === "catalog" && (
          <div>
            {lmsOffline ? (
              <div className="py-16 text-center border-2 border-dashed border-amber-500/20 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
                <p className="font-black text-sm uppercase tracking-widest text-amber-400/60">LMS hors ligne</p>
                <p className="text-xs text-muted/40 mt-2">Démarrez le LMS sur le port 3001 pour accéder au catalogue.</p>
              </div>
            ) : (
              <>
                <div className="relative mb-6 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  <input
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="Rechercher un cours..."
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-xl pl-12 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-muted/40"
                  />
                </div>

                {filteredCourses.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-secondary/10 rounded-2xl">
                    <BookOpen className="w-8 h-8 text-muted/20 mx-auto mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted/30">Aucun cours publié</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCourses.map(course => (
                      <div key={course._id} className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 hover:border-primary/20 transition-all flex flex-col">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-black text-sm mb-2 line-clamp-2">{course.title}</h3>
                        <p className="text-xs text-muted/60 leading-relaxed mb-4 line-clamp-3 flex-1">{course.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          {course.skillLevel && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg">
                              Niv. {course.skillLevel}
                            </span>
                          )}
                          {selectedEmployee ? (
                            <button
                              onClick={async () => {
                                try {
                                  const e = await assignCourse(selectedEmployee.id, course._id, token!)
                                  setEnrollments(prev => [e, ...prev])
                                  alert(`✅ "${course.title}" assigné à ${selectedEmployee.first_name}`)
                                } catch (err: any) {
                                  alert(err.message || "Erreur")
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary/90 transition-all ml-auto"
                            >
                              <Plus className="w-3 h-3" /> Assigner
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted/40 ml-auto">Sélectionnez un employé</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal Assign */}
      {showAssignModal && selectedEmployee && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAssignModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-secondary/20 rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg">Assigner une formation</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-muted/40 hover:text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted mb-4">
                Pour <span className="font-bold text-foreground">{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                {courses.filter(c => c.status === "published").map(course => (
                  <button
                    key={course._id}
                    onClick={() => setAssignCourseId(course._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      assignCourseId === course._id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-secondary/5 border-secondary/10 hover:border-primary/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      assignCourseId === course._id ? "bg-primary border-primary" : "border-secondary/30"
                    }`}>
                      {assignCourseId === course._id && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{course.title}</p>
                      {course.skillLevel && (
                        <p className="text-[10px] text-muted/50">Niveau {course.skillLevel} validé</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleAssign}
                disabled={!assignCourseId || assigning}
                className="w-full py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                {assigning ? "Assignation..." : "Confirmer l'assignation"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactElement; color: string }) {
  return (
    <div className="glass-panel p-6 rounded-panel-sm shadow-xl shadow-black/5">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-secondary/10 rounded-xl ${color}`}>
          {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
      <p className="text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}
