"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { getRecruiterJobsWithMatches, Job } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
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
    Plus
} from "lucide-react"
import { inviteCandidate } from "@/lib/api"

export default function RecruiterDashboard() {
    const router = useRouter()
    const { user, token, logout } = useAuthStore()
    const [jobs, setJobs] = React.useState<Job[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        if (!user || user.role !== "RECRUITER" || !token) {
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

    const handleLogout = () => {
        logout()
        router.push("/")
    }

    const handleInvite = async (jobId: number, candidateId: number) => {
        if (!token) return
        try {
            await inviteCandidate(jobId, candidateId, token)
            // Rafraîchir les données
            const data = await getRecruiterJobsWithMatches(token)
            setJobs(data)
            alert("Candidat invité avec succès !")
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Erreur lors de l'invitation")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    const totalPositions = jobs.length
    const totalMatches = jobs.reduce((acc, job) => acc + (job.matching_candidates?.length || 0), 0)

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-secondary/5 border-r border-secondary/10 hidden lg:flex flex-col p-6 z-50">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-black text-primary text-sm">R</div>
                    <span className="font-extrabold tracking-tighter text-lg">RECRUITPRO</span>
                </div>

                <nav className="space-y-2 flex-1">
                    <button onClick={() => router.push("/dashboard/recruiter")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm bg-primary/10 text-primary border border-primary/20">
                        <TrendingUp className="w-4 h-4" /> Overview
                    </button>
                    <button onClick={() => router.push("/dashboard/recruiter/organization")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <Building2 className="w-4 h-4" /> Organisation
                    </button>
                    <button onClick={() => router.push("/")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <Briefcase className="w-4 h-4" /> Voir le Site
                    </button>
                    <NavItem icon={<Users className="w-4 h-4" />} label="Candidats" />
                    <NavItem icon={<CheckCircle2 className="w-4 h-4" />} label="Recrutements" />
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 text-muted/60 hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-bold text-xs uppercase tracking-widest mt-auto"
                >
                    <LogOut className="w-4 h-4" /> Déconnexion
                </button>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 p-6 md:p-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Bonjour, {user?.full_name} 👋</h1>
                        <p className="text-muted font-medium">Voici l'état actuel de vos recrutements chez <span className="text-primary">TechCorp</span>.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
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
                    <StatsCard label="Prochaines Interviews" value="4" icon={<Clock />} color="text-amber-500" />
                </div>

                {/* Job Matches Section */}
                <div className="space-y-10">
                    <div className="flex items-end justify-between">
                        <h2 className="text-2xl font-black tracking-tighter">Matching Intelligent & Gaps</h2>
                        <button className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary/20 hover:border-primary transition-all">Nouveau Poste +</button>
                    </div>

                    <div className="space-y-6">
                        {jobs.map((job) => (
                            <div key={job.id} className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5">
                                <div className="flex flex-col lg:flex-row justify-between gap-8">
                                    <div className="lg:w-1/3">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="badge-rh bg-primary/10 text-primary inline-block">Offre Active</span>
                                            <button
                                                onClick={() => router.push(`/dashboard/recruiter/applications/${job.id}`)}
                                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors flex items-center gap-2"
                                            >
                                                Voir le Pipeline <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight mb-4">{job.title}</h3>
                                        <p className="text-muted text-sm leading-relaxed mb-6 line-clamp-3">{job.description}</p>

                                        <div className="flex gap-4">
                                            <div className="p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted/50 mb-1">XP Min</p>
                                                <p className="font-bold text-foreground">{job.min_years_experience} ans</p>
                                            </div>
                                            <div className="p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted/50 mb-1">Diplôme</p>
                                                <p className="font-bold text-foreground">Bac +{job.min_education_level}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 lg:pl-8 lg:border-l border-secondary/10">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Suggestions de Talents (Sourcing)</h4>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">IA Matching</span>
                                        </div>

                                        <div className="space-y-4">
                                            {job.matching_candidates && job.matching_candidates.length > 0 ? (
                                                job.matching_candidates.map((match) => (
                                                    <div key={match.candidate_id} className={`p-5 bg-secondary/5 rounded-[1.5rem] border ${match.has_applied ? 'border-primary/40 bg-primary/5' : 'border-secondary/10'} flex flex-col md:flex-row md:items-center justify-between group hover:border-primary/30 transition-all relative overflow-hidden`}>
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
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted/50">Gaps Identifiés</p>
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
                                            ) : (
                                                <div className="py-10 text-center border-2 border-dashed border-secondary/10 rounded-[1.5rem]">
                                                    <AlertCircle className="w-8 h-8 text-muted/20 mx-auto mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted/40">Aucun profil correspondant trouvé</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <a href="#" className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${active
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-muted hover:text-foreground hover:bg-secondary/10"
            }`}>
            {icon} {label}
        </a>
    )
}

function StatsCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactElement, color: string }) {
    return (
        <div className="glass-panel p-6 rounded-[2rem] shadow-xl shadow-black/5 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-secondary/10 rounded-xl ${color}`}>
                    {React.cloneElement(icon, { className: "w-5 h-5" } as any)}
                </div>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">+12%</span>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
                <p className="text-3xl font-black text-foreground">{value}</p>
            </div>
        </div>
    )
}
