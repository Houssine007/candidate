"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
    getMyApplications,
    getMyProfile,
    updateMyProfile,
    getSkills,
    updateCandidateOnboarding,
    searchSkills,
    getProfileAnalysis,
    Application,
    CandidateProfile,
    Skill,
    CandidateSkill,
    ProfileAnalysis,
    ProfileDomainSuggestion
} from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    Briefcase,
    Clock,
    MapPin,
    TrendingUp,
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronDown,
    User,
    LogOut,
    Search,
    Zap,
    LayoutDashboard,
    Plus,
    Trash2,
    Save,
    Star,
    Upload,
    FileText,
    FileUp,
    Loader2,
    Award,
    Sparkles,
    BookOpen,
    Target
} from "lucide-react"
import { uploadCV } from "@/lib/api"

export default function CandidateDashboard() {
    const router = useRouter()
    const { user, token, logout } = useAuthStore()
    const [applications, setApplications] = React.useState<Application[]>([])
    const [profile, setProfile] = React.useState<CandidateProfile | null>(null)
    const [allSkills, setAllSkills] = React.useState<Skill[]>([])
    const [loading, setLoading] = React.useState(true)
    const [showProfileModal, setShowProfileModal] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [profileAnalysis, setProfileAnalysis] = React.useState<ProfileAnalysis | null>(null)
    const [analysisOpen, setAnalysisOpen] = React.useState(false)
    const [analysisLoading, setAnalysisLoading] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [skillSearch, setSkillSearch] = React.useState("")
    const [skillResults, setSkillResults] = React.useState<any[]>([])
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Skill Search Debounce
    React.useEffect(() => {
        const timer = setTimeout(async () => {
        if (skillSearch.length > 1) {
            const results = await searchSkills(skillSearch);
            setSkillResults(results);
        } else {
            setSkillResults([]);
        }
        }, 300);
        return () => clearTimeout(timer);
    }, [skillSearch]);

    // Form State
    const [formProfile, setFormProfile] = React.useState<Partial<CandidateProfile>>({})

    const loadData = async () => {
        if (!token) return
        try {
            // Fetch data
            let appsData: Application[] = [];
            let profileData: CandidateProfile | null = null;
            let skillsData: Skill[] = [];

            try {
                const [apps, skills] = await Promise.all([
                    getMyApplications(token),
                    getSkills(token)
                ]);
                appsData = apps;
                skillsData = skills;
            } catch (err) {
                console.error("Error fetching base data:", err);
            }

            try {
                profileData = await getMyProfile(token);
            } catch (err: any) {
                // If profile is not found (404), it's expected for new users
                if (err.message?.includes("404") || err.message?.includes("Failed to fetch profile")) {
                    console.log("Profile not found - new user or onboarding incomplete.");
                } else {
                    console.error("Error fetching profile:", err);
                }
            }
            
            setApplications(appsData)
            setProfile(profileData)
            setFormProfile(profileData || {})
            setAllSkills(skillsData)
        } catch (err: any) {
            console.error("Dashboard load data error:", err)
            // On ne redirige plus automatiquement, l'utilisateur choisit d'y aller via la sidebar
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        if (!user || user.role !== "CANDIDATE" || !token) {
            router.push("/login")
            return
        }
        loadData()
    }, [user, token, router])

    const handleLogout = () => {
        logout()
        router.push("/")
    }

    const handleSaveProfile = async () => {
        if (!token || !formProfile) return
        setIsSaving(true)
        try {
            await updateMyProfile(formProfile, token)
            await loadData() // Refresh everything (scores might change)
            setShowProfileModal(false)
        } catch (err) {
            alert("Erreur lors de la sauvegarde du profil")
        } finally {
            setIsSaving(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !token) return
        
        if (file.type !== "application/pdf") {
            alert("Veuillez uploader un fichier PDF uniquement.")
            return
        }

        setIsUploading(true)
        try {
            const updatedProfile = await uploadCV(file, token)
            setProfile(updatedProfile)
            setFormProfile(updatedProfile)
            alert("CV uploadé et analysé avec succès ! Votre profil a été mis à jour.")
        } catch (err: any) {
            console.error(err)
            alert("Erreur lors de l'upload du CV : " + (err.message || "Erreur inconnue"))
        } finally {
            setIsUploading(false)
        }
    }

    const addSkill = (skill: any) => {
        const skills = [...(formProfile.skills || [])]
        if (skills.find(s => s.skill_id === skill.id)) return

        skills.push({
            skill_id: skill.id,
            name: skill.name,
            level: 2,
            years_experience: 1
        })
        setFormProfile({ ...formProfile, skills })
        setSkillSearch("")
        setSkillResults([])
    }

    const handleLoadAnalysis = async () => {
        if (!token || profileAnalysis) { setAnalysisOpen(o => !o); return }
        setAnalysisOpen(true)
        setAnalysisLoading(true)
        try {
            const data = await getProfileAnalysis(token)
            setProfileAnalysis(data)
        } catch {
            setProfileAnalysis({ domains: [], has_rome_data: false })
        } finally {
            setAnalysisLoading(false)
        }
    }

    const removeSkill = (skillId: number) => {
        const skills = (formProfile.skills || []).filter(s => s.skill_id !== skillId)
        setFormProfile({ ...formProfile, skills })
    }

    const updateSkillLevel = (skillId: number, level: number) => {
        const skills = (formProfile.skills || []).map(s =>
            s.skill_id === skillId ? { ...s, level } : s
        )
        setFormProfile({ ...formProfile, skills })
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted font-sans">Chargement de votre espace...</p>
            </div>
        </div>
    )

    const activeApps = applications.filter(a => a.status !== "REJECTED" && a.status !== "ACCEPTED").length
    const averageMatch = applications.length > 0
        ? Math.round(applications.reduce((acc, a) => acc + (a.match_details?.total_score || 0), 0) / applications.length)
        : 0

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20">
            <div className="glow-mesh" />

            {/* Sidebar (Desktop) */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-secondary/5 border-r border-secondary/10 hidden lg:flex flex-col p-6 z-50">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-black text-primary text-sm">C</div>
                    <span className="font-extrabold tracking-tighter text-lg underline-offset-4 decoration-primary decoration-2">TALENTSPACE</span>
                </div>

                <nav className="space-y-4 flex-1">
                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm bg-primary/10 text-primary border border-primary/20">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                    <button onClick={() => router.push("/")} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <Search className="w-4 h-4" /> Explorer Offres
                    </button>
                    <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-foreground hover:bg-secondary/10">
                        <User className="w-4 h-4" /> Mon Profil
                    </button>
                    <button 
                        onClick={() => router.push("/dashboard/candidate/onboarding")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-muted hover:text-primary hover:bg-primary/5 transition-all group"
                    >
                        <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                        Parcours Onboarding
                    </button>
                </nav>

                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                >
                    <LogOut className="w-4 h-4" /> 
                    Déconnexion
                </button>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t border-secondary/10 flex lg:hidden items-center justify-around px-6 z-[100]">
                <button 
                    onClick={() => router.push("/dashboard/candidate")}
                    className="flex flex-col items-center gap-1 text-primary"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
                </button>
                <button 
                    onClick={() => router.push("/")}
                    className="flex flex-col items-center gap-1 text-muted"
                >
                    <Search className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Offres</span>
                </button>
                <button 
                    onClick={() => router.push("/dashboard/candidate/onboarding")}
                    className="flex flex-col items-center gap-1 text-muted"
                >
                    <Zap className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Onboarding</span>
                </button>
                <button 
                    onClick={() => setShowProfileModal(true)}
                    className="flex flex-col items-center gap-1 text-muted"
                >
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Profil</span>
                </button>
            </div>

            {/* Main Content */}
            <main className="lg:ml-64 p-6 md:p-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground">Espace Candidat 🚀</h1>
                        <p className="text-muted font-medium">Suivez vos candidatures et optimisez votre matching.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowProfileModal(true)}
                            className="px-6 py-3 bg-secondary/10 hover:bg-secondary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <User className="w-4 h-4" /> Editer Profil
                        </button>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="glass-panel p-8 rounded-panel-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">Candidatures Actives</p>
                        <p className="text-4xl font-black">{activeApps}</p>
                    </div>

                    <div className="glass-panel p-8 rounded-panel-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform text-primary">
                            <TrendingUp className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">Score de Match Moyen</p>
                        <p className="text-4xl font-black text-primary">{averageMatch}%</p>
                    </div>

                    <div className="glass-panel p-8 rounded-panel-sm relative overflow-hidden group bg-primary/5 border-primary/20">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform text-primary">
                            <Zap className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Votre Visibilité</p>
                        <p className="text-4xl font-black text-primary">Expert</p>
                    </div>
                </div>

                {/* Applications List */}
                <h2 className="text-2xl font-black tracking-tighter mb-8 text-foreground">Mes Candidatures</h2>

                <div className="space-y-6">
                    {applications.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center glass-panel rounded-panel-lg border-dashed">
                            <Search className="w-12 h-12 text-muted/20 mb-4" />
                            <p className="text-muted font-bold">Aucune candidature pour le moment.</p>
                            <button onClick={() => router.push("/")} className="mt-4 text-primary font-black uppercase text-[10px] tracking-widest border-b-2 border-primary/20 hover:border-primary transition-all">
                                Découvrir les offres
                            </button>
                        </div>
                    ) : (
                        applications.map((app) => (
                            <div key={app.id} className="glass-panel p-6 md:p-10 rounded-panel hover:border-primary/30 transition-all group shadow-xl shadow-black/5">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <StatusBadge status={app.status} />
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest italic font-sans italic">Postulé le {new Date(app.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-3xl font-black tracking-tight mb-2 group-hover:text-primary transition-colors text-foreground">{app.job_title}</h3>
                                        <div className="flex items-center gap-4 text-muted font-medium text-sm">
                                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Remote</span>
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Temps Plein</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8 lg:pl-8 lg:border-l border-secondary/10">
                                        <div className="text-center">
                                            <div className="w-24 h-24 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center mb-2">
                                                <span className="text-3xl font-black text-primary">{Math.round(app.match_details?.total_score || 0)}%</span>
                                                <span className="text-[8px] font-black uppercase text-primary/60 tracking-widest">Match</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-muted">Compatibilité</span>
                                                <span className="text-primary">{Math.round(app.match_details?.total_score || 0)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-secondary/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${app.match_details?.total_score}%` }}></div>
                                            </div>
                                            <div className="flex gap-1">
                                                {app.match_details?.gaps && app.match_details.gaps.length > 0 ? (
                                                    <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> {app.match_details.gaps.length} points à améliorer
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Profil idoine
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <button className="w-12 h-12 flex items-center justify-center bg-secondary/10 hover:bg-primary hover:text-white rounded-2xl transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Profile Edition Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-panel-lg shadow-2xl flex flex-col overflow-hidden relative border-primary/20">

                        <div className="p-8 md:p-12 flex items-center justify-between border-b border-secondary/10">
                            <div>
                                <h2 className="text-4xl font-black tracking-tight text-foreground">Éditer mon profil</h2>
                                <p className="text-muted font-medium mt-1">Boostez vos compétences pour augmenter votre score de match.</p>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-3 hover:bg-secondary/10 rounded-full transition-all text-muted"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 md:p-12 flex flex-col lg:flex-row gap-12 scrollbar-hide">
                            {/* Left Side: Basic Info */}
                            <div className="flex-1 space-y-8">
                                <section>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Informations Générales
                                    </h3>
                                    
                                    {/* CV Upload Section */}
                                    <div className="mb-10 p-6 bg-primary/5 border border-dashed border-primary/30 rounded-panel-sm flex flex-col items-center text-center group">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            {isUploading ? (
                                                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            ) : profile?.cv_url ? (
                                                <FileText className="w-8 h-8 text-primary" />
                                            ) : (
                                                <Upload className="w-8 h-8 text-primary" />
                                            )}
                                        </div>
                                        <h4 className="text-sm font-black mb-1">Analyse de CV IA</h4>
                                        <p className="text-[10px] text-muted font-medium mb-6 max-w-[250px]">Uploadé votre CV PDF pour remplir automatiquement vos compétences et votre bio.</p>
                                        
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".pdf"
                                            className="hidden"
                                        />
                                        
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {isUploading ? "Analyse en cours..." : profile?.cv_url ? "Mettre à jour le CV" : "Uploader mon CV"}
                                            {!isUploading && <FileUp className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-2">Années d'Expérience</label>
                                            <input
                                                type="number"
                                                value={formProfile.years_of_experience || 0}
                                                onChange={e => setFormProfile({ ...formProfile, years_of_experience: parseFloat(e.target.value) })}
                                                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl p-4 font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-2">Niveau d'Études (Bac+)</label>
                                            <input
                                                type="number"
                                                value={formProfile.education_level || 0}
                                                onChange={e => setFormProfile({ ...formProfile, education_level: parseInt(e.target.value) })}
                                                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl p-4 font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Mes Compétences
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {(formProfile.skills || []).map((s) => (
                                            <div key={s.skill_id} className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl flex items-center justify-between group">
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-foreground">{s.name}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        {[1, 2, 3, 4].map(lvl => (
                                                            <button
                                                                key={lvl}
                                                                onClick={() => updateSkillLevel(s.skill_id, lvl)}
                                                                className={`w-3 h-5 rounded-full transition-all ${lvl <= s.level ? 'bg-primary scale-110 shadow-lg shadow-primary/20' : 'bg-secondary/20 hover:bg-secondary/40'}`}
                                                            />
                                                        ))}
                                                        <span className="text-[10px] font-black text-muted uppercase ml-2 mt-1">Niveau {s.level}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeSkill(s.skill_id)}
                                                    className="p-3 text-muted/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Right Side: ROME Skill Search */}
                            <div className="w-full lg:w-80 bg-secondary/5 rounded-3xl p-8 border border-secondary/10 flex flex-col">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-6 flex items-center gap-2">
                                    <Award className="w-4 h-4" /> Catalogue ROME 4.0
                                </h3>
                                
                                <div className="relative mb-6">
                                    <input 
                                        type="text" 
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        className="w-full bg-background border border-secondary/10 rounded-xl p-3 pl-10 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Rechercher (ex: Python...)"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                    
                                    {skillResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-background border border-secondary/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {skillResults.map(s => (
                                                <div 
                                                    key={s.id} 
                                                    onClick={() => addSkill(s)}
                                                    className="p-3 hover:bg-secondary/10 cursor-pointer border-b border-secondary/5 flex justify-between items-center transition-all"
                                                >
                                                    <span className="text-[10px] font-bold">{s.name}</span>
                                                    <Plus className="w-3 h-3 text-primary" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 overflow-y-auto max-h-[300px] scrollbar-hide pr-2">
                                    <p className="text-[9px] text-muted font-medium mb-2 italic">Compétences suggérées basées sur le marché...</p>
                                    {allSkills
                                        .filter(s => !(formProfile.skills || []).find(ps => ps.skill_id === s.id))
                                        .slice(0, 10)
                                        .map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => addSkill(s)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-primary/5 text-[10px] font-bold text-muted hover:text-primary transition-all flex items-center justify-between border border-transparent"
                                            >
                                                {s.name}
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        {/* ── Analyse de profil ─────────────────────────────────── */}
                {profile && (
                    <div className="mt-12">
                        <button
                            onClick={handleLoadAnalysis}
                            className="w-full flex items-center justify-between p-6 glass-panel rounded-panel-sm hover:border-primary/30 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-foreground">Analyse de votre profil</p>
                                    <p className="text-[10px] text-muted font-medium">Découvrez vos points forts et les compétences à développer</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted transition-transform ${analysisOpen ? "rotate-180" : ""}`} />
                        </button>

                        {analysisOpen && (
                            <div className="mt-4 space-y-4">
                                {analysisLoading && (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    </div>
                                )}

                                {!analysisLoading && profileAnalysis && !profileAnalysis.has_rome_data && (
                                    <div className="glass-panel rounded-panel-sm p-8 text-center">
                                        <Target className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                                        <p className="font-bold text-sm text-foreground mb-1">Profil en cours de construction</p>
                                        <p className="text-[11px] text-muted">
                                            Complétez votre profil avec vos compétences pour obtenir des suggestions personnalisées.
                                        </p>
                                        <button
                                            onClick={() => router.push("/dashboard/candidate/onboarding")}
                                            className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Compléter mon profil
                                        </button>
                                    </div>
                                )}

                                {!analysisLoading && profileAnalysis?.domains.map((domain, i) => (
                                    <DomainCard key={i} domain={domain} onOpenOnboarding={() => router.push("/dashboard/candidate/onboarding")} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Modal Footer */}
                        <div className="p-8 md:p-12 border-t border-secondary/10 flex items-center justify-between bg-secondary/5">
                            <p className="text-[10px] font-medium text-muted max-w-md italic">
                                * Sauvegardez vos modifications pour que vos scores de matching soient recalculés sur toutes vos candidatures actives.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="px-10 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const FIT_CONFIG = {
    "fort":         { label: "Domaine fort",      color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    "potentiel":    { label: "Potentiel",          color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
    "à découvrir":  { label: "À développer",       color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
}

function DomainCard({ domain, onOpenOnboarding }: { domain: ProfileDomainSuggestion; onOpenOnboarding: () => void }) {
    const cfg = FIT_CONFIG[domain.fit_level] ?? FIT_CONFIG["potentiel"]
    const [open, setOpen] = React.useState(domain.fit_level !== "à découvrir")

    return (
        <div className={`glass-panel rounded-panel-sm overflow-hidden border ${cfg.border}`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-6 hover:bg-secondary/5 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                    </div>
                    <span className="font-black text-sm text-foreground">{domain.label}</span>
                    <span className="text-[10px] text-muted font-medium">
                        {domain.owned_count} / {domain.typical_count} compétences
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-6 pb-6 grid md:grid-cols-2 gap-6">
                    {/* Compétences acquises */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Vous maîtrisez
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {domain.owned_skills.map((s, i) => (
                                <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                                    {s.name}
                                    <span className="opacity-60 text-[9px]">niv.{s.level}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Suggestions */}
                    {domain.suggested_skills.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-primary" /> À développer
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {domain.suggested_skills.map((s, i) => (
                                    <span key={i} className="px-3 py-1 bg-primary/8 border border-primary/20 text-primary rounded-full text-[11px] font-bold">
                                        + {s}
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={onOpenOnboarding}
                                className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary/30 hover:border-primary transition-all"
                            >
                                Ajouter ces compétences à mon profil →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const configs: any = {
        PENDING: { label: "À l'étude", color: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock className="w-3.5 h-3.5" /> },
        REVIEWING: { label: "En revue", color: "text-blue-500", bg: "bg-blue-500/10", icon: <Search className="w-3.5 h-3.5" /> },
        SHORTLISTED: { label: "Finaliste", color: "text-purple-500", bg: "bg-purple-500/10", icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ACCEPTED: { label: "Recruté", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        REJECTED: { label: "Refusé", color: "text-red-500", bg: "bg-red-500/10", icon: <XCircle className="w-3.5 h-3.5" /> },
    }
    const config = configs[status] || configs.PENDING
    return (
        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${config.bg} ${config.color} border border-current/10 font-sans`}>
            {config.icon}
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{config.label}</span>
        </div>
    )
}
