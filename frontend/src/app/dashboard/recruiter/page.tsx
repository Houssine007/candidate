"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { getRecruiterJobsWithMatches, Job } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { Toast, useToast } from "@/components/toast"
import {
    Users,
    User,
    Briefcase,
    TrendingUp,
    Clock,
    ChevronRight,
    LogOut,
    Search,
    CheckCircle2,
    AlertCircle,
    Building2,
    Plus,
    BookOpen,
    GraduationCap,
    ExternalLink,
    PieChart,
    Pencil
} from "lucide-react"
import { inviteCandidate } from "@/lib/api"

export default function RecruiterDashboard() {
    const router = useRouter()
    const { user, token, logout } = useAuthStore()
    const [jobs, setJobs] = React.useState<Job[]>([])
    const [loading, setLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [activeTab, setActiveTab] = React.useState<"active" | "archived">("active")
    const [expandedJobs, setExpandedJobs] = React.useState<Set<number>>(new Set())
    const { toast, showToast } = useToast()

    React.useEffect(() => {
        if (!user || (user.role !== "RECRUITER" && user.role !== "ADMIN") || !token) {
            router.push("/login")
            return
        }

        const loadData = async () => {
            try {
                const data = await getRecruiterJobsWithMatches(token)
                setJobs(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, token, router])

    const handleInvite = async (jobId: number, candidateId: number) => {
        if (!token) return
        try {
            await inviteCandidate(jobId, candidateId, token)
            // Rafraîchir les données
            const data = await getRecruiterJobsWithMatches(token)
            setJobs(data)
            showToast("success", "Candidat invité avec succès !")
        } catch (err: any) {
            console.error(err)
            showToast("error", err.message || "Erreur lors de l'invitation")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Chargement de votre espace…</p>
                </div>
            </div>
        )
    }

    const totalPositions = jobs.length
    const totalMatches = jobs.reduce((acc, job) => acc + (job.matching_candidates?.length || 0), 0)

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Toast toast={toast} />
            {/* Sidebar */}
            <RecruiterSidebar active="overview" />

            {/* Main Content */}
            <main className="lg:ml-64 p-6 md:p-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Bonjour, {user?.full_name} 👋</h1>
                        <p className="text-muted font-medium">Voici l'état actuel de vos recrutements {jobs.length > 0 ? <>chez <span className="text-primary">{jobs[0].company}</span></> : "dans votre espace"}.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                type="text"
                                placeholder="Rechercher une offre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-secondary/5 border border-secondary/10 rounded-xl pl-12 pr-4 py-2.5 outline-none focus:border-primary/50 transition-all text-sm w-64"
                            />
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatsCard label="Postes Ouverts" value={totalPositions.toString()} icon={<Briefcase />} color="text-primary" />
                    <StatsCard label="Candidats Matched" value={totalMatches.toString()} icon={<Users />} color="text-blue-500" />
                    <StatsCard 
                        label="Finalistes" 
                        value={jobs.reduce((acc, job) => acc + (job.matching_candidates?.filter(c => c.has_applied).length || 0), 0).toString() || "0"} 
                        icon={<Clock />} 
                        color="text-amber-500" 
                    />
                </div>

                {/* Job Matches Section */}
                <div className="space-y-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-2 p-1 bg-secondary/5 border border-secondary/10 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab("active")}
                                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-primary text-white shadow-lg" : "text-muted hover:text-foreground"}`}
                            >
                                Postes Actifs ({jobs.filter(j => j.is_active).length})
                            </button>
                            <button
                                onClick={() => setActiveTab("archived")}
                                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "archived" ? "bg-secondary text-foreground shadow-lg" : "text-muted hover:text-foreground"}`}
                            >
                                Archives ({jobs.filter(j => !j.is_active).length})
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black tracking-tighter hidden md:block">Matching Intelligent</h2>
                            <button onClick={() => router.push("/dashboard/recruiter/jobs/create")} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                                <Plus className="w-4 h-4" /> Nouveau Poste
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {jobs
                            .filter(j => (activeTab === "active" ? j.is_active : !j.is_active))
                            .filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()) || j.location.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((job) => (
                            <div key={job.id} className="glass-panel p-8 rounded-panel shadow-xl shadow-black/5">
                                <div className="flex flex-col lg:flex-row justify-between gap-8">
                                    <div className="lg:w-1/3">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`badge-rh inline-block ${job.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary/20 text-muted'}`}>
                                                {job.is_active ? 'Offre Active' : 'Offre Archivée'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!token) return
                                                        try {
                                                            await import("@/lib/api").then(api => api.archiveJob(job.id, token))
                                                            const data = await getRecruiterJobsWithMatches(token)
                                                            setJobs(data)
                                                            showToast("success", job.is_active ? "Offre archivée" : "Offre réactivée")
                                                        } catch (e) {
                                                            showToast("error", "Erreur lors de l'archivage")
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-secondary/10 rounded-xl transition-colors text-muted hover:text-foreground"
                                                    title={job.is_active ? "Archiver" : "Réactiver"}
                                                >
                                                    {job.is_active ? <LogOut className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/dashboard/recruiter/jobs/edit/${job.id}`)}
                                                    className="p-2 hover:bg-secondary/10 rounded-xl transition-colors text-muted hover:text-primary"
                                                    title="Modifier l'offre"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/dashboard/recruiter/applications/${job.id}`)}
                                                    className="p-2 hover:bg-secondary/10 rounded-xl transition-colors text-primary hover:text-primary/70"
                                                    title="Voir Pipeline"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight mb-4">{job.title}</h3>
                                        <p className="text-muted text-sm leading-relaxed mb-4 line-clamp-3">{job.description}</p>
                                        
                                        {/* Status Counts (Dynamique BF-18) */}
                                        <div className="flex gap-2 mb-6">
                                            <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                {job.status_counts?.REVIEWING || 0} En revue
                                            </div>
                                            <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                {job.status_counts?.SHORTLISTED || 0} Finalistes
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex-1">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-1">XP Min</p>
                                                <p className="font-bold text-foreground">{job.min_years_experience} ans</p>
                                            </div>
                                            <div className="p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex-1">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-1">Diplôme</p>
                                                <p className="font-bold text-foreground">Bac +{job.min_education_level}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 lg:pl-8 lg:border-l border-secondary/10">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Suggestions de Talents (Sourcing)</h4>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">Matching IA</span>
                                        </div>

                                        <div className="space-y-4">
                                            {job.matching_candidates && job.matching_candidates.length > 0 ? (
                                                <>
                                                    {(expandedJobs.has(job.id) ? job.matching_candidates : job.matching_candidates.slice(0, 3)).map((match) => (
                                                    <div key={match.candidate_id} className={`p-5 bg-secondary/5 rounded-panel-xs border ${match.has_applied ? 'border-primary/40 bg-primary/5' : 'border-secondary/10'} flex flex-col md:flex-row md:items-center justify-between group hover:border-primary/30 transition-all relative overflow-hidden`}>
                                                        {match.has_applied && (
                                                            <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-widest">
                                                                Candidat
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-xl">
                                                                {match.full_name[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                                                    {match.full_name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="w-24 h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary"
                                                                            style={{ width: `${match.score}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-primary">{match.score}% Match</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                                                            <div className="flex flex-col items-end">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50">Gaps Identifiés</p>
                                                                <div className="flex gap-1 mt-1">
                                                                    {match.gaps.length > 0 ? (
                                                                        match.gaps.slice(0, 3).map((gap, i) => (
                                                                            <div key={i} className="w-2 h-2 rounded-full bg-amber-500/50" />
                                                                        ))
                                                                    ) : (
                                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Action Button: Go to profile */}
                                                            <button
                                                                onClick={() => router.push(`/dashboard/recruiter/candidates/${match.candidate_id}?jobId=${job.id}`)}
                                                                className="w-10 h-10 rounded-xl bg-secondary/10 hover:bg-primary/20 text-muted hover:text-primary flex items-center justify-center transition-all"
                                                                title="Voir le profil complet"
                                                            >
                                                                <User className="w-4 h-4" />
                                                            </button>

                                                            {/* Action Button: Invite if not applied */}
                                                            {!match.has_applied && (
                                                                <button
                                                                    onClick={() => handleInvite(job.id, match.candidate_id)}
                                                                    className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all shadow-lg shadow-primary/5"
                                                                    title="Inviter dans le pipeline"
                                                                >
                                                                    <Plus className="w-5 h-5" />
                                                                </button>
                                                            )}

                                                            {/* Action Button: Go to pipeline if applied */}
                                                            <button
                                                                onClick={() => match.has_applied && router.push(`/dashboard/recruiter/applications/${job.id}`)}
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${match.has_applied ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary/10 hover:bg-secondary/20 text-muted'}`}
                                                                title={match.has_applied ? "Voir la candidature" : "Profil suggéré (pas encore postulé)"}
                                                            >
                                                                {match.has_applied ? <Briefcase className="w-4 h-4" /> : <ChevronRight className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                            {job.matching_candidates && job.matching_candidates.length > 3 && (
                                                <button 
                                                    onClick={() => {
                                                        const next = new Set(expandedJobs)
                                                        if (next.has(job.id)) next.delete(job.id)
                                                        else next.add(job.id)
                                                        setExpandedJobs(next)
                                                    }}
                                                    className="w-full py-3 border-2 border-dashed border-secondary/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:border-primary/30 hover:text-primary transition-all bg-secondary/5 hover:bg-primary/5"
                                                >
                                                    {expandedJobs.has(job.id) ? "▲ Réduire la liste" : `▼ Voir les ${job.matching_candidates.length - 3} autres profils`}
                                                </button>
                                            )}
                                        </>
                                            ) : (
                                                <div className="py-10 text-center border-2 border-dashed border-secondary/10 rounded-panel-xs">
                                                    <AlertCircle className="w-8 h-8 text-muted/20 mx-auto mb-3" />
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted/40">Aucun profil correspondant trouvé</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {jobs.filter(j => (activeTab === "active" ? j.is_active : !j.is_active)).length === 0 && (
                            <div className="text-center py-20 glass-panel rounded-panel border-2 border-dashed border-secondary/10">
                                <Briefcase className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-muted">Aucune offre {activeTab === "active" ? "active" : "archivée"}</h3>
                                <p className="text-sm text-muted/60 mt-2">Commencez par créer une nouvelle opportunité de recrutement.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatsCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactElement, color: string }) {
    return (
        <div className="glass-panel p-6 rounded-panel-sm shadow-xl shadow-black/5 hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-secondary/10 rounded-xl ${color}`}>
                    {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
                </div>
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
                <p className="text-3xl font-black text-foreground">{value}</p>
            </div>
        </div>
    )
}
