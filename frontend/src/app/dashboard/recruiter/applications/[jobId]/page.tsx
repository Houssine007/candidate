"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { getJob, getJobApplications, updateApplicationStatus, getInternalMatches, assignCourse, getLMSCourses, Application, Job, InternalMatch, LMSCourse, confirmHire } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    ArrowLeft,
    Users,
    User,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    MoreVertical,
    Mail,
    Calendar,
    AlertCircle,
    TrendingUp,
    Target,
    FileText,
    Briefcase,
    Lightbulb,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Sparkles,
    X
} from "lucide-react"

const COLUMNS = [
    { id: "PENDING", label: "À Examiner", color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "REVIEWING", label: "En Revue", color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "SHORTLISTED", label: "Finalistes", color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "ACCEPTED", label: "Recrutés", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "REJECTED", label: "Refusés", color: "text-red-500", bg: "bg-red-500/10" },
]

export default function KanbanPage() {
    const { jobId } = useParams()
    const router = useRouter()
    const { user, token } = useAuthStore()

    const [job, setJob] = React.useState<Job | null>(null)
    const [applications, setApplications] = React.useState<Application[]>([])
    const [loading, setLoading] = React.useState(true)
    const [updatingAppId, setUpdatingAppId] = React.useState<number | null>(null)
    const [selectedApp, setSelectedApp] = React.useState<Application | null>(null)
    // Mobilité interne
    const [internalMatches, setInternalMatches] = React.useState<InternalMatch[]>([])
    const [showMobility, setShowMobility] = React.useState(false)
    const [mobilityLoading, setMobilityLoading] = React.useState(false)
    const [selectedEmployee, setSelectedEmployee] = React.useState<InternalMatch | null>(null)
    const [lmsCourses, setLmsCourses] = React.useState<LMSCourse[]>([])
    const [assigningCourse, setAssigningCourse] = React.useState<string | null>(null)
    const [assignedCourses, setAssignedCourses] = React.useState<Set<string>>(new Set())

    // Modal confirmation d'intégration
    const [hireModal, setHireModal] = React.useState<Application | null>(null)
    const [hireTitle, setHireTitle] = React.useState("")
    const [hireLoading, setHireLoading] = React.useState(false)

    const loadData = React.useCallback(async () => {
        if (!token || !jobId) return
        try {
            const [jobData, appsData] = await Promise.all([
                getJob(Number(jobId)),
                getJobApplications(Number(jobId), token)
            ])
            setJob(jobData)
            setApplications(appsData)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [jobId, token])

    const loadInternalMatches = async () => {
        if (!token || !jobId) return
        setMobilityLoading(true)
        try {
            const [matches, courses] = await Promise.all([
                getInternalMatches(Number(jobId), token),
                getLMSCourses(token).catch(() => [])
            ])
            setInternalMatches(matches)
            setLmsCourses(courses)
        } catch (err) {
            console.error(err)
        } finally {
            setMobilityLoading(false)
        }
    }

    const handleAssignCourse = async (employeeId: number, courseId: string) => {
        if (!token) return
        setAssigningCourse(courseId)
        try {
            await assignCourse(employeeId, courseId, token)
            setAssignedCourses(prev => new Set([...prev, `${employeeId}-${courseId}`]))
        } catch (e) {
            console.error(e)
        } finally {
            setAssigningCourse(null)
        }
    }



    React.useEffect(() => {
        loadData()
    }, [loadData])

    const handleConfirmHire = async () => {
        if (!token || !hireModal) return
        setHireLoading(true)
        try {
            await confirmHire(hireModal.id, hireTitle, token)
            // Retirer du pipeline local
            setApplications(prev => prev.filter(a => a.id !== hireModal.id))
            setHireModal(null)
            setSelectedApp(null)
        } catch (e: any) {
            alert(e.message || "Erreur lors de la confirmation")
        } finally {
            setHireLoading(false)
        }
    }

    const handleStatusChange = async (appId: number, newStatus: string) => {
        if (!token) return
        // Intercepter ACCEPTED → ouvrir le modal de confirmation d'intégration
        if (newStatus === "ACCEPTED") {
            const app = applications.find(a => a.id === appId)
            if (app) {
                setHireTitle(job?.title || "")
                setHireModal(app)
            }
            return
        }
        setUpdatingAppId(appId)
        try {
            await updateApplicationStatus(appId, newStatus, token)
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))

            // Close the modal and show a small success feedback if needed
            setSelectedApp(null)

            // Optional: Notification or subtle sound
        } catch (err) {
            console.error(err)
            alert("Erreur lors du changement de statut. Vérifiez votre connexion.")
        } finally {
            setUpdatingAppId(null)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted font-sans">Chargement du pipeline...</p>
            </div>
        </div>
    )

    return (
        <>
        <div className="min-h-screen bg-background text-foreground pb-12">
            <div className="glow-mesh" />

            {/* Header omitted for brevity in preview, remains same */}
            <header className="fixed top-0 w-full z-50 transition-all duration-300">
                <div className="container mx-auto px-6 py-4">
                    <div className="glass-panel px-6 py-3 rounded-2xl flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-secondary/20 rounded-xl transition-colors text-muted hover:text-foreground"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-black tracking-tight">{job?.title}</h1>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-3 h-3 text-primary" /> {applications.length} Candidatures
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => { setShowMobility(!showMobility); if (!showMobility && internalMatches.length === 0) loadInternalMatches() }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${showMobility ? 'bg-violet-500 text-white border-violet-500' : 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20'}`}
                            >
                                <Sparkles className="w-4 h-4" />
                                Mobilité Interne
                                {internalMatches.length > 0 && <span className="bg-white/20 px-1.5 rounded-full">{internalMatches.length}</span>}
                            </button>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            {/* Panneau Mobilité Interne */}
            {showMobility && (
                <div className="container mx-auto px-6 pt-28 pb-4">
                    <div className="glass-panel rounded-[2rem] p-6 border-violet-500/20">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-violet-500" />
                                </div>
                                <div>
                                    <h2 className="font-black text-lg">Mobilité Interne</h2>
                                    <p className="text-[10px] text-muted font-medium">Employés qui pourraient combler ce besoin avec quelques formations</p>
                                </div>
                            </div>
                            {mobilityLoading && <div className="w-5 h-5 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />}
                        </div>

                        {internalMatches.length === 0 && !mobilityLoading ? (
                            <div className="text-center py-10 text-muted">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-bold">Aucun employé interne ne correspond suffisamment à ce poste</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {internalMatches.map(emp => (
                                    <div key={emp.employee_id} className="bg-secondary/5 border border-secondary/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center font-black text-violet-500 text-sm uppercase">
                                                    {emp.full_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm">{emp.full_name}</p>
                                                    <p className="text-[10px] text-muted uppercase font-bold">{emp.job_title}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-2 py-1 rounded-lg text-[11px] font-black ${emp.total_score >= 70 ? 'bg-green-500/10 text-green-500' : emp.total_score >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {Math.round(emp.total_score)}%
                                                </div>
                                                {emp.trainable && <p className="text-[9px] text-violet-500 font-bold mt-1">✓ Formable</p>}
                                            </div>
                                        </div>

                                        {/* Barre de score */}
                                        <div className="mb-4">
                                            <div className="h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all" style={{ width: `${emp.total_score}%` }} />
                                            </div>
                                        </div>

                                        {/* Gaps */}
                                        {emp.gaps.filter(g => g.type === 'skill').length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Compétences à développer</p>
                                                <div className="space-y-1.5">
                                                    {emp.gaps.filter(g => g.type === 'skill').map((gap, i) => (
                                                        <div key={i} className="flex items-center justify-between text-[10px]">
                                                            <span className="font-bold text-foreground/80 truncate">{gap.skill_name || `Skill #${gap.id}`}</span>
                                                            <span className="text-muted shrink-0 ml-2">{gap.actual} → {gap.required}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="w-full py-2 text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-500 rounded-xl hover:bg-violet-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <GraduationCap className="w-3.5 h-3.5" /> Assigner des formations
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}



            {/* Kanban Board */}
            <main className={`container mx-auto px-6 ${showMobility ? 'pt-4' : 'pt-32'} h-[calc(100vh-80px)] overflow-x-auto`}>
                <div className="flex gap-6 min-w-max h-full pb-8">
                    {COLUMNS.map(col => {
                        const colApps = applications.filter(a => a.status === col.id)

                        return (
                            <div key={col.id} className="w-[320px] flex flex-col h-full">
                                {/* Column Header */}
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${col.bg.replace('/10', '')}`} />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">{col.label}</h3>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-secondary/20 rounded-md text-muted italic">
                                            {colApps.length}
                                        </span>
                                    </div>
                                    <button className="p-1.5 hover:bg-secondary/20 rounded-lg text-muted/40">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 bg-secondary/5 border border-secondary/10 rounded-[2rem] p-4 overflow-y-auto space-y-4 shadow-inner scrollbar-hide">
                                    {colApps.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 opacity-20">
                                            <Clock className="w-8 h-8 mb-2" />
                                            <p className="text-[9px] font-black uppercase tracking-widest italic">Vide</p>
                                        </div>
                                    ) : (
                                        colApps.map(app => (
                                            <div
                                                key={app.id}
                                                onClick={() => setSelectedApp(app)}
                                                className="glass-panel p-5 rounded-3xl group hover:border-primary/50 transition-all shadow-lg shadow-black/5 cursor-pointer relative overflow-hidden"
                                            >
                                                {/* Score Badge */}
                                                <div className="absolute top-0 right-0 p-3">
                                                    <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg">
                                                        <span className="text-[10px] font-black text-primary">{Math.round(app.match_details?.total_score || 0)}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center font-black text-primary text-sm border border-secondary/10">
                                                            {app.candidate_name?.[0] || "C"}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-foreground leading-tight">{app.candidate_name}</h4>
                                                            <p className="text-[9px] font-bold text-muted/60 uppercase tracking-widest">
                                                                {new Date(app.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {app.cover_letter && (
                                                    <div className="mb-4">
                                                        <p className="text-[11px] text-muted leading-relaxed line-clamp-2 italic">
                                                            "{app.cover_letter}"
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 pt-4 border-t border-secondary/10">
                                                    <div className="flex-1 flex gap-1">
                                                        {app.match_details?.gaps && app.match_details.gaps.length > 0 ? (
                                                            app.match_details.gaps.slice(0, 3).map((_, i) => (
                                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                                                            ))
                                                        ) : (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                                        )}
                                                    </div>

                                                    <div className="text-[9px] font-black text-muted uppercase tracking-tighter hover:text-primary transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/recruiter/candidates/${app.candidate_id}?jobId=${jobId}`); }}>Voir Profil</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Match Deep Dive Modal */}
            {selectedApp && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border-primary/20">
                        <button
                            onClick={() => setSelectedApp(null)}
                            className="absolute top-8 right-8 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl text-muted hover:text-foreground transition-all z-10"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-foreground">
                            <div className="flex flex-col md:flex-row gap-12 mb-12 items-center md:items-start text-center md:text-left">
                                {/* Score Circle */}
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-secondary/10" />
                                        <circle
                                            cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                                            className="text-primary"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * (selectedApp.match_details?.total_score || 0)) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-foreground">{Math.round(selectedApp.match_details?.total_score || 0)}%</span>
                                        <span className="text-[10px] font-black uppercase text-muted tracking-widest">Score Global</span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
                                        <span className="badge-rh bg-primary/10 text-primary">Dossier Candidat</span>
                                        {/* Status Badge in Modal */}
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10 ${COLUMNS.find(c => c.id === selectedApp.status)?.bg || "bg-secondary/10"
                                            } ${COLUMNS.find(c => c.id === selectedApp.status)?.color || "text-muted"
                                            }`}>
                                            {COLUMNS.find(c => c.id === selectedApp.status)?.label || selectedApp.status}
                                        </span>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tight mb-2 text-foreground">{selectedApp.candidate_name}</h2>
                                    <p className="text-muted font-medium text-lg italic mb-6">"{selectedApp.cover_letter || "Aucune lettre de motivation fournie."}"</p>

                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                        <div className="px-4 py-2 bg-secondary/5 border border-secondary/10 rounded-2xl flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold font-sans">Skills: {Math.round(selectedApp.match_details?.skill_score || 0)}%</span>
                                        </div>
                                        <div className="px-4 py-2 bg-secondary/5 border border-secondary/10 rounded-2xl flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            <span className="text-xs font-bold font-sans">XP: {Math.round(selectedApp.match_details?.experience_score || 0)}%</span>
                                        </div>
                                        <div className="px-4 py-2 bg-secondary/5 border border-secondary/10 rounded-2xl flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-amber-500" />
                                            <span className="text-xs font-bold font-sans">Edu: {Math.round(selectedApp.match_details?.education_score || 0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Story Section */}
                            <div className="mb-12 space-y-8 animate-in slide-in-from-bottom duration-700">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        {selectedApp.candidate_profile?.bio && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Bio Professionnelle</h3>
                                                <p className="text-foreground/80 font-medium leading-relaxed bg-secondary/5 p-6 rounded-3xl border border-secondary/10">{selectedApp.candidate_profile.bio}</p>
                                            </div>
                                        )}
                                        {selectedApp.candidate_profile?.experience_detail && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Parcours Professionnel</h3>
                                                <p className="text-foreground/80 font-medium whitespace-pre-wrap leading-relaxed bg-secondary/5 p-6 rounded-3xl border border-secondary/10">{selectedApp.candidate_profile.experience_detail}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-8">
                                        {selectedApp.candidate_profile?.formations && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-3">Formation</h3>
                                                <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                                                    <p className="text-foreground/80 font-bold text-sm whitespace-pre-wrap">{selectedApp.candidate_profile.formations}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedApp.candidate_profile?.certifications && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-3 transition-all duration-300">Certifications</h3>
                                                <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                                                    <p className="text-foreground/80 font-bold text-sm whitespace-pre-wrap">{selectedApp.candidate_profile.certifications}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedApp.candidate_profile?.cv_text && (
                                    <div className="p-8 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-secondary/10">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-4 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Texte de son CV complet
                                        </h3>
                                        <div className="max-h-60 overflow-y-auto pr-4 text-xs font-mono text-muted/80 leading-relaxed whitespace-pre-wrap scrollbar-hide">
                                            {selectedApp.candidate_profile.cv_text}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Skills Comparison */}
                                <div className="p-8 bg-secondary/5 border border-secondary/10 rounded-[2.5rem]">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-primary" /> Match des Compétences
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedApp.match_details?.detailed_skills.map((s: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-2xl border border-secondary/5">
                                                <div>
                                                    <p className="text-xs font-black">{s.skill_name}</p>
                                                    <p className="text-[9px] font-bold text-muted/60 uppercase">Requis: Niveau {s.required}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map(lvl => (
                                                            <div
                                                                key={lvl}
                                                                className={`w-1.5 h-3 rounded-full ${lvl <= s.actual ? 'bg-primary' : 'bg-secondary/20'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    {s.actual >= s.required ? (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Gap Analysis */}
                                <div className="p-8 bg-black/5 dark:bg-white/5 border border-secondary/10 rounded-[2.5rem]">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" /> Analyse des Gaps
                                    </h3>
                                    <div className="space-y-4">
                                        {!selectedApp.match_details?.gaps || selectedApp.match_details.gaps.length === 0 ? (
                                            <div className="py-12 text-center">
                                                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                                                <p className="text-xs font-black uppercase tracking-widest text-primary">Profil Parfaitement Aligné</p>
                                            </div>
                                        ) : (
                                            selectedApp.match_details.gaps.map((gap: any, i: number) => (
                                                <div key={i} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-4">
                                                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                                                        <TrendingUp className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-amber-600 tracking-tighter">Manque de {gap.type === 'skill' ? 'Compétence' : gap.type}</p>
                                                        <p className="text-xs font-black">{gap.name || gap.type}</p>
                                                        <p className="text-[9px] font-medium text-muted">Requis: {gap.required} • Actuel: {gap.actual}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-secondary/10 flex flex-col md:flex-row items-center justify-between bg-secondary/5 z-20 gap-4">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted text-center md:text-left">Changer le statut</p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                    {selectedApp.status !== "REVIEWING" && (
                                        <button
                                            disabled={updatingAppId !== null}
                                            onClick={() => handleStatusChange(selectedApp.id, "REVIEWING")}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded-xl border border-blue-500/10 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {updatingAppId === selectedApp.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                                            En Revue
                                        </button>
                                    )}
                                    {selectedApp.status !== "SHORTLISTED" && (
                                        <button
                                            disabled={updatingAppId !== null}
                                            onClick={() => handleStatusChange(selectedApp.id, "SHORTLISTED")}
                                            className="px-4 py-2 bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase rounded-xl border border-purple-500/10 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {updatingAppId === selectedApp.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                                            Finaliste
                                        </button>
                                    )}
                                    {selectedApp.status !== "ACCEPTED" && (
                                        <button
                                            disabled={updatingAppId !== null}
                                            onClick={() => handleStatusChange(selectedApp.id, "ACCEPTED")}
                                            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-xl border border-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {updatingAppId === selectedApp.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                                            Recruter
                                        </button>
                                    )}
                                    {selectedApp.status !== "REJECTED" && (
                                        <button
                                            disabled={updatingAppId !== null}
                                            onClick={() => handleStatusChange(selectedApp.id, "REJECTED")}
                                            className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {updatingAppId === selectedApp.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                                            Refuser
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button onClick={() => router.push(`/dashboard/recruiter/candidates/${selectedApp.candidate_id}?jobId=${jobId}`)} className="btn-premium border border-primary/20 hover:bg-primary/5 py-3 md:py-4 px-6 md:px-8 text-[10px] w-full md:w-auto mt-4 md:mt-0 items-center justify-center flex gap-2">
                                    <User className="w-3.5 h-3.5" /> Voir Profil Complet
                                </button>
                                <button onClick={() => setSelectedApp(null)} className="btn-premium bg-foreground text-background py-3 md:py-4 px-6 md:px-8 text-[10px] w-full md:w-auto mt-4 md:mt-0">Fermer le Dossier</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

          {/* Modal confirmation d'intégration */}
        {hireModal && (
            <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[300] flex items-center justify-center p-6">
                <div className="glass-panel p-10 rounded-[3rem] w-full max-w-md shadow-2xl border-emerald-500/30">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-center mb-1">Confirmer l'intégration</h2>
                    <p className="text-sm text-muted text-center mb-8">
                        <strong>{hireModal.candidate_name}</strong> va rejoindre l'entreprise.<br />
                        Les pourparlers sont terminés.
                    </p>

                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">
                            Poste / Fonction définitif(ve)
                        </label>
                        <input
                            value={hireTitle}
                            onChange={e => setHireTitle(e.target.value)}
                            placeholder="ex: Développeur Backend Senior"
                            className="w-full bg-secondary/10 border border-secondary/20 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 transition-all font-bold text-sm"
                            autoFocus
                        />
                        <p className="text-[10px] text-muted mt-2">Ce titre sera utilisé dans le profil employé.</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setHireModal(null) }}
                            className="flex-1 py-4 font-black uppercase text-xs text-muted hover:text-foreground transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleConfirmHire}
                            disabled={!hireTitle.trim() || hireLoading}
                            className="flex-1 py-4 font-black uppercase text-xs bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {hireLoading
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <CheckCircle2 className="w-4 h-4" />
                            }
                            Confirmer l'intégration
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal assignation formations employé interne */}
        {selectedEmployee && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                <div className="glass-panel p-8 rounded-[3rem] w-full max-w-lg shadow-2xl border-violet-500/20 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black">{selectedEmployee.full_name}</h2>
                            <p className="text-xs text-muted">{selectedEmployee.job_title} · Score {Math.round(selectedEmployee.total_score)}%</p>
                        </div>
                        <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-secondary/10 rounded-xl">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Gaps */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Compétences à développer</p>
                        <div className="space-y-2">
                            {selectedEmployee.gaps.filter(g => g.type === 'skill').map((gap, i) => {
                                const relatedCourses = lmsCourses.filter(c =>
                                    c.title.toLowerCase().includes((gap.skill_name || '').toLowerCase().split(' ')[0])
                                )
                                return (
                                    <div key={i} className="bg-secondary/5 border border-secondary/10 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="font-black text-sm">{gap.skill_name}</p>
                                            <span className="text-[10px] text-muted">Niveau {gap.actual} → {gap.required}</span>
                                        </div>
                                        {relatedCourses.length > 0 ? (
                                            <div className="space-y-2">
                                                {relatedCourses.map(course => {
                                                    const key = `${selectedEmployee.employee_id}-${course._id}`
                                                    const assigned = assignedCourses.has(key)
                                                    return (
                                                        <div key={course._id} className="flex items-center justify-between gap-3 p-2 bg-background/50 rounded-xl">
                                                            <p className="text-[11px] font-bold truncate flex-1">{course.title}</p>
                                                            <button
                                                                onClick={() => handleAssignCourse(selectedEmployee.employee_id, course._id)}
                                                                disabled={assigned || assigningCourse === course._id}
                                                                className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${assigned ? 'bg-green-500/10 text-green-500' : 'bg-violet-500 text-white hover:bg-violet-600'} disabled:opacity-50`}
                                                            >
                                                                {assigned ? '✓ Assigné' : assigningCourse === course._id ? '...' : 'Assigner'}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted italic">Aucun cours disponible pour cette compétence</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <button onClick={() => setSelectedEmployee(null)} className="w-full py-3 font-black text-xs uppercase text-muted hover:text-foreground transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        )}
        </>

    )
}
