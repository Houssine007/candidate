"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { getCandidate, CandidateProfile, updateApplicationStatus, getLMSCourses, assignCourse, LMSCourse } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Briefcase,
    GraduationCap,
    Award,
    FileText,
    TrendingUp,
    Target,
    AlertCircle,
    BookOpen,
    Zap,
    ChevronRight,
    Check
} from "lucide-react"

export default function CandidateDetailPage() {
    const { id } = useParams()
    const searchParams = useSearchParams()
    const jobId = searchParams.get('jobId')
    const router = useRouter()
    const { user, token } = useAuthStore()
    const [candidate, setCandidate] = React.useState<CandidateProfile | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [lmsCourses, setLmsCourses] = React.useState<LMSCourse[]>([])
    const [assignedGaps, setAssignedGaps] = React.useState<Set<number>>(new Set())

    React.useEffect(() => {
        if (!user || user.role !== "RECRUITER" || !token) {
            router.push("/login")
            return
        }

        const loadCandidate = async () => {
            try {
                const jId = jobId ? Number(jobId) : undefined
                const [data, courses] = await Promise.allSettled([
                    getCandidate(Number(id), token, jId),
                    getLMSCourses(token)
                ])
                if (data.status === "fulfilled") setCandidate(data.value)
                else setError("Impossible de charger le profil du candidat.")
                if (courses.status === "fulfilled") setLmsCourses(courses.value)
            } catch (err) {
                console.error(err)
                setError("Impossible de charger le profil du candidat.")
            } finally {
                setLoading(false)
            }
        }

        loadCandidate()
    }, [id, token, user, router, jobId])

    const handleAssignCourse = async (courseId: string, skillId: number, candidateUserId: number) => {
        if (!token) return
        try {
            await assignCourse(candidateUserId, courseId, token)
            setAssignedGaps(prev => new Set([...prev, skillId]))
        } catch (err: any) {
            alert(err.message || "Erreur lors de l'assignation")
        }
    }
    const [promotedToEmployee, setPromotedToEmployee] = React.useState(false)

    const handleStatusUpdate = async (newStatus: string) => {
        if (!token || !candidate?.application_id) return
        try {
            await updateApplicationStatus(candidate.application_id, newStatus, token)
            setCandidate({ ...candidate, current_status: newStatus })
            if (newStatus === "ACCEPTED") {
                setPromotedToEmployee(true)
            }
        } catch (err) {
            console.error(err)
            alert("Erreur lors de la mise à jour du statut")
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    )

    if (error || !candidate) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-black mb-2">Oups !</h1>
            <p className="text-muted mb-8">{error || "Candidat non trouvé."}</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">Retour</button>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20">
            <div className="glow-mesh" />

            {/* Navigation top bar */}
            <nav className="fixed top-0 w-full z-50 p-6 flex items-center justify-between pointer-events-none">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-xl pointer-events-auto transition-all text-muted hover:text-foreground font-bold text-xs uppercase"
                >
                    <ArrowLeft className="w-4 h-4" /> Retour
                </button>
                <div className="flex items-center gap-4 pointer-events-auto">
                    <ThemeToggle />
                </div>
            </nav>

            <main className="container mx-auto max-w-5xl pt-32 px-6">
                {/* Bannière promotion employé */}
                {promotedToEmployee && (
                    <div className="mb-8 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                                <p className="font-black text-green-400 text-sm">Candidat accepté — Profil employé créé automatiquement</p>
                                <p className="text-xs text-muted/60 mt-0.5">{candidate.first_name} {candidate.last_name} est maintenant dans votre équipe.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/recruiter/organization")}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-black rounded-xl transition-all"
                        >
                            Voir dans l'organisation <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                )}


                {/* Header Profile Section */}
                <header className="glass-panel p-10 md:p-16 rounded-[4rem] shadow-2xl mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
                        <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary font-black text-4xl shadow-xl shadow-primary/5 border border-primary/20">
                            {candidate.first_name[0]}{candidate.last_name[0]}
                        </div>
                        
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-5xl font-black tracking-tight mb-4">{candidate.first_name} {candidate.last_name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-xl text-xs font-bold border border-secondary/20">
                                    <Mail className="w-4 h-4 text-primary" /> {candidate.email}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-xl text-xs font-bold border border-secondary/20">
                                    <Phone className="w-4 h-4 text-primary" /> {candidate.phone || "Non renseigné"}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-xl text-xs font-bold border border-secondary/20">
                                    <Briefcase className="w-4 h-4 text-primary" /> {candidate.years_of_experience} ans d'expérience
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-xl text-xs font-bold border border-secondary/20">
                                    <GraduationCap className="w-4 h-4 text-primary" /> Bac +{candidate.education_level}
                                </div>
                            </div>
                            
                            {candidate.bio && (
                                <p className="text-muted text-lg font-medium leading-relaxed max-w-3xl italic">
                                    "{candidate.bio}"
                                </p>
                            )}

                            {candidate.cv_url && (
                                <div className="mt-8 flex gap-4">
                                    <a 
                                        href={`http://127.0.0.1:8000/${candidate.cv_url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                    >
                                        <FileText className="w-4 h-4" /> Consulter le CV Original
                                    </a>
                                </div>
                            )}
                        </div>




                        {/* Status & Matching Summary */}
                        <div className="flex flex-col items-center md:items-end gap-6">
                            {candidate.match_score !== undefined && (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-secondary/10" />
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * candidate.match_score) / 100} className="text-primary transition-all duration-1000" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black">{Math.round(candidate.match_score)}%</span>
                                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Match</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {candidate.application_id && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-muted/50 uppercase tracking-widest px-2">Statut Recrutement</label>
                                    <select 
                                        value={candidate.current_status}
                                        onChange={(e) => handleStatusUpdate(e.target.value)}
                                        className="bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-xl px-4 py-2 font-bold text-sm outline-none transition-all cursor-pointer"
                                    >
                                        <option value="PENDING">À examiner</option>
                                        <option value="REVIEWING">En revue</option>
                                        <option value="SHORTLISTED">Finaliste</option>
                                        <option value="ACCEPTED">Accepté</option>
                                        <option value="REJECTED">Refusé</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scored Breakdown if available */}
                {candidate.match_details && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[
                            { label: "Compétences", score: candidate.match_details.skill_score, color: "bg-primary" },
                            { label: "Expérience", score: candidate.match_details.experience_score, color: "bg-blue-500" },
                            { label: "Éducation", score: candidate.match_details.education_score, color: "bg-amber-500" }
                        ].map((item, idx) => (
                            <div key={idx} className="glass-panel p-6 rounded-3xl border border-secondary/10">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-muted">{item.label}</span>
                                    <span className="text-xl font-black">{Math.round(item.score)}%</span>
                                </div>
                                <div className="w-full h-2 bg-secondary/10 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.score}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}


                {/* Gaps & Formations suggérées */}
                {candidate.match_details?.gaps && candidate.match_details.gaps.filter(g => g.type === "skill").length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <Zap className="w-6 h-6 text-amber-400" />
                            <h2 className="text-2xl font-black tracking-tight">Gaps & Formations suggérées</h2>
                            <span className="text-xs font-black bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20">
                                {candidate.match_details.gaps.filter(g => g.type === "skill").length} gaps identifiés
                            </span>
                        </div>

                        <div className="space-y-3">
                            {candidate.match_details.detailed_skills
                                ?.filter(s => s.actual < s.required)
                                .map((gap, i) => {
                                    // Trouver le skill_id depuis les compétences du candidat ou les gaps
                                    const gapData = candidate.match_details!.gaps.find(
                                        g => g.type === "skill" && g.required === gap.required
                                    )
                                    const skillId = (gapData as any)?.id
                                    const relatedCourses = lmsCourses.filter(c => c.skillId === skillId)
                                    const isAssigned = skillId && assignedGaps.has(skillId)

                                    return (
                                        <div key={i} className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
                                            {/* Gap info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                                    <p className="font-black text-sm">{gap.skill_name}</p>
                                                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                                                        Niv. {gap.actual} / {gap.required} requis
                                                    </span>
                                                </div>
                                                {/* Level bar */}
                                                <div className="flex items-center gap-2 ml-7">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map(l => (
                                                            <div key={l} className={`w-6 h-2 rounded-full transition-all ${
                                                                l <= gap.actual ? "bg-amber-400" :
                                                                l <= gap.required ? "bg-amber-400/20 border border-amber-400/30" :
                                                                "bg-secondary/10"
                                                            }`} />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-muted/50">
                                                        +{gap.required - gap.actual} niveau{gap.required - gap.actual > 1 ? "x" : ""} à combler
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Cours suggérés */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {relatedCourses.length > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        {relatedCourses.slice(0, 2).map(course => (
                                                            <div key={course._id} className="flex items-center gap-2 px-3 py-2 bg-background border border-secondary/20 rounded-xl">
                                                                <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
                                                                <span className="text-xs font-bold max-w-32 truncate">{course.title}</span>
                                                                <button
                                                                    onClick={() => candidate.id && handleAssignCourse(course._id, skillId, candidate.id)}
                                                                    disabled={!!isAssigned}
                                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                                                        isAssigned
                                                                            ? "bg-green-500/20 text-green-400"
                                                                            : "bg-primary text-white hover:bg-primary/80"
                                                                    }`}
                                                                    title={isAssigned ? "Déjà assigné" : "Assigner ce cours"}
                                                                >
                                                                    {isAssigned ? <Check className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted/40 italic">Aucun cours disponible pour ce gap</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Experiences */}
                        <section>
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <Briefcase className="w-6 h-6 text-primary" /> Expériences & Parcours
                            </h2>
                            <div className="bg-secondary/5 border border-secondary/10 rounded-[2.5rem] p-8 whitespace-pre-wrap font-medium leading-relaxed">
                                {candidate.experience_detail || "Aucune expérience détaillée renseignée."}
                            </div>
                        </section>

                        {/* Formations */}
                        <section>
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <GraduationCap className="w-6 h-6 text-blue-500" /> Éducation & Formations
                            </h2>
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] p-8 whitespace-pre-wrap font-medium leading-relaxed">
                                {candidate.formations || "Aucune formation renseignée."}
                            </div>
                        </section>

                        {/* CV Text Parsing */}
                        {candidate.cv_text && (
                            <section>
                                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-muted">
                                    <FileText className="w-6 h-6" /> Contenu du CV
                                </h2>
                                <div className="bg-black/5 dark:bg-white/5 border border-secondary/10 rounded-[2.5rem] p-8 font-mono text-xs text-muted/80 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-hide">
                                    {candidate.cv_text}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-12">
                        {/* Skills */}
                        <section>
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <Target className="w-6 h-6 text-primary" /> Compétences
                            </h2>
                            <div className="space-y-4">
                                {candidate.skills.map((s, i) => (
                                    <div key={i} className="p-5 bg-secondary/5 border border-secondary/10 rounded-3xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                        <div>
                                            <p className="text-sm font-black tracking-tight">{s.name}</p>
                                            <p className="text-[10px] font-black text-muted/50 uppercase tracking-widest">{s.years_experience} ans</p>
                                        </div>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map(l => (
                                                <div key={l} className={`w-2 h-4 rounded-full transition-all ${l <= s.level ? 'bg-primary' : 'bg-secondary/20'}`} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {candidate.skills.length === 0 && (
                                    <div className="text-center py-10 opacity-20">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                                        <p className="font-black uppercase text-xs">Aucune compétence listée</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Certifications */}
                        <section>
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-amber-500">
                                <Award className="w-6 h-6" /> Certifications
                            </h2>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] p-8 font-bold text-sm whitespace-pre-wrap">
                                {candidate.certifications || "Aucune certification."}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    )
}
