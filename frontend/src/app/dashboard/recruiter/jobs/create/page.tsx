"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
    ArrowLeft, ArrowRight, Sparkles, Search, Trash2, Loader2, Plus,
    Check, MapPin, Briefcase, GraduationCap, Star, ToggleLeft, ToggleRight,
    Euro, Calendar, X, ChevronRight, Zap, Copy, CheckCheck, Brain
} from "lucide-react"
import { createJob, searchSkills, Skill } from "@/lib/api"

const API_BASE = "http://localhost:8000"

const CONTRACT_TYPES = ["CDI", "CDD", "Stage", "Alternance", "Freelance"]

const EXP_OPTIONS = [
    { value: 0, label: "Junior",  sub: "0–1 an" },
    { value: 2, label: "2 ans",   sub: "Confirmé" },
    { value: 3, label: "3 ans",   sub: "Expérimenté" },
    { value: 5, label: "5 ans",   sub: "Senior" },
    { value: 8, label: "8+ ans",  sub: "Expert" },
]

const EDU_LEVELS = [
    { value: 1, label: "Bac",    sub: "Niveau Bac" },
    { value: 2, label: "Bac +2", sub: "BTS / DUT" },
    { value: 3, label: "Bac +3", sub: "Licence" },
    { value: 4, label: "Bac +4", sub: "Master 1" },
    { value: 5, label: "Bac +5", sub: "Master / Ingé" },
]

const SKILL_LEVELS = [
    { value: 1, label: "Débutant",      short: "1", color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
    { value: 2, label: "Intermédiaire", short: "2", color: "bg-amber-500/20 text-amber-400 border-amber-400/30" },
    { value: 3, label: "Avancé",        short: "3", color: "bg-primary/20 text-primary border-primary/30" },
    { value: 4, label: "Expert",        short: "4", color: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
]

const BENEFIT_PRESETS = [
    "Télétravail partiel", "Full Remote", "Tickets restaurant",
    "Mutuelle premium", "RTT", "Prime annuelle",
    "Formation continue", "Stock options", "Vélo de fonction",
]

const STEPS = [
    { id: "post",     label: "Poste",       icon: Briefcase },
    { id: "skills",   label: "Compétences", icon: Star },
    { id: "criteria", label: "Critères",    icon: GraduationCap },
    { id: "preview",  label: "Publication", icon: Check },
]

interface Req { skill_id: number; skill_name: string; required_level: number; is_mandatory: boolean; source: "rome"|"ai"|"manual" }
interface RomeSuggestion { id: number; title: string; rome_code: string; category: string; description: string; suggested_skills: { skill_id: number; skill_name: string; min_level: number; is_mandatory: boolean }[] }
interface AISuggestion { description: string; suggested_skills: { skill_id: number; skill_name: string; min_level: number; is_mandatory: boolean }[]; source: string }

export default function CreateJobPage() {
    const router = useRouter()
    const { token } = useAuthStore()

    const [step,         setStep]         = React.useState(0)
    const [title,        setTitle]        = React.useState("")
    const [description,  setDescription]  = React.useState("")
    const [location,     setLocation]     = React.useState("")
    const [remoteOk,     setRemoteOk]     = React.useState(false)
    const [contractType, setContractType] = React.useState("CDI")
    const [startDate,    setStartDate]    = React.useState("Dès que possible")
    const [salaryMin,    setSalaryMin]    = React.useState("")
    const [salaryMax,    setSalaryMax]    = React.useState("")
    const [benefits,     setBenefits]     = React.useState<string[]>([])
    const [customBenefit, setCustomBenefit] = React.useState("")

    const [requirements, setRequirements] = React.useState<Req[]>([])
    const [skillSearch,  setSkillSearch]  = React.useState("")
    const [skillResults, setSkillResults] = React.useState<Skill[]>([])
    const [minExp,       setMinExp]       = React.useState(2)
    const [minEdu,       setMinEdu]       = React.useState(3)
    const [submitting,   setSubmitting]   = React.useState(false)

    // Suggestions state
    const [romeResults,   setRomeResults]   = React.useState<RomeSuggestion[]>([])
    const [aiSuggestion,  setAISuggestion]  = React.useState<AISuggestion | null>(null)
    const [loadingRome,   setLoadingRome]   = React.useState(false)
    const [loadingAI,     setLoadingAI]     = React.useState(false)
    const [showPanel,     setShowPanel]     = React.useState(false)
    const [appliedRome,   setAppliedRome]   = React.useState<number | null>(null)
    const [copiedDesc,    setCopiedDesc]    = React.useState<number | "ai" | null>(null)

    // Fetch ROME suggestions when title changes
    React.useEffect(() => {
        if (!title || title.length < 3 || !token) { setRomeResults([]); return }
        const t = setTimeout(async () => {
            setLoadingRome(true)
            try {
                const res = await fetch(`${API_BASE}/api/catalog/jobs/suggest?q=${encodeURIComponent(title)}&limit=5`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    // Le backend retourne "skills", on mappe vers "suggested_skills"
                    setRomeResults(data.map((s: any) => ({
                        ...s,
                        suggested_skills: (s.suggested_skills || s.skills || []).map((sk: any) => ({
                            skill_id: sk.skill_id,
                            skill_name: sk.skill_name,
                            min_level: sk.min_level ?? sk.level ?? 2,
                            is_mandatory: sk.is_mandatory ?? sk.mandatory ?? true,
                        }))
                    })))
                }
            } catch { }
            setLoadingRome(false)
        }, 600)
        return () => clearTimeout(t)
    }, [title, token])

    // Skill search
    React.useEffect(() => {
        if (!skillSearch || skillSearch.length < 2 || !token) { setSkillResults([]); return }
        const t = setTimeout(async () => {
            try { setSkillResults(await searchSkills(skillSearch, token)) } catch { }
        }, 300)
        return () => clearTimeout(t)
    }, [skillSearch, token])

    const fetchAISuggestion = async () => {
        if (!title || !token) return
        setLoadingAI(true)
        setAISuggestion(null)
        try {
            const res = await fetch(`${API_BASE}/api/catalog/jobs/suggest-ai?q=${encodeURIComponent(title)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                // Le backend retourne "required_skills", on mappe vers "suggested_skills"
                const rawSkills = data.suggested_skills || data.required_skills || []
                setAISuggestion({
                    ...data,
                    suggested_skills: rawSkills.map((sk: any) => ({
                        skill_id: sk.skill_id,
                        skill_name: sk.skill_name,
                        min_level: sk.min_level ?? sk.level ?? 2,
                        is_mandatory: sk.is_mandatory ?? sk.mandatory ?? true,
                    }))
                })
            }
        } catch { }
        setLoadingAI(false)
    }

    const applyRomeSkills = (s: RomeSuggestion) => {
        setAppliedRome(s.id)
        if (!description) setDescription(s.description || "")
        const toAdd = s.suggested_skills.filter(sk => !requirements.find(r => r.skill_id === sk.skill_id))
            .map(sk => ({ skill_id: sk.skill_id, skill_name: sk.skill_name, required_level: sk.min_level, is_mandatory: sk.is_mandatory, source: "rome" as const }))
        setRequirements(prev => [...prev, ...toAdd])
        setShowPanel(false)
    }

    const applyAI = () => {
        if (!aiSuggestion) return
        if (!description && aiSuggestion.description) setDescription(aiSuggestion.description)
        const toAdd = aiSuggestion.suggested_skills.filter(sk => !requirements.find(r => r.skill_id === sk.skill_id))
            .map(sk => ({ skill_id: sk.skill_id, skill_name: sk.skill_name, required_level: sk.min_level, is_mandatory: sk.is_mandatory, source: "ai" as const }))
        setRequirements(prev => [...prev, ...toAdd])
        setShowPanel(false)
    }

    const copyDesc = (text: string, key: number | "ai") => {
        setDescription(text)
        setCopiedDesc(key)
        setTimeout(() => setCopiedDesc(null), 2000)
    }

    const addSkill = (skill: Skill) => {
        if (requirements.find(r => r.skill_id === skill.id)) return
        setRequirements(prev => [...prev, { skill_id: skill.id, skill_name: skill.name, required_level: 2, is_mandatory: false, source: "manual" }])
        setSkillSearch(""); setSkillResults([])
    }

    const toggleBenefit = (b: string) => setBenefits(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])
    const addCustomBenefit = () => {
        const v = customBenefit.trim()
        if (v && !benefits.includes(v)) setBenefits(prev => [...prev, v])
        setCustomBenefit("")
    }

    const handleSubmit = async () => {
        if (!title.trim() || !location.trim() || !token) return
        setSubmitting(true)
        try {
            await createJob({
                title: title.trim(), description: description.trim(), location: location.trim(),
                company: "TechCorp", min_years_experience: minExp, min_education_level: minEdu,
                salary_min: salaryMin ? parseInt(salaryMin) : undefined,
                salary_max: salaryMax ? parseInt(salaryMax) : undefined,
                contract_type: contractType, start_date: startDate,
                benefits: benefits.length ? benefits : undefined,
                requirements: requirements.map(r => ({ skill_id: r.skill_id, required_level: r.required_level, is_mandatory: r.is_mandatory })),
            }, token)
            router.push("/dashboard/recruiter")
        } catch (err: any) { alert(err.message || "Erreur") }
        setSubmitting(false)
    }

    const canNext = [title.trim().length > 0 && location.trim().length > 0, true, true, true]
    const hasResults = romeResults.length > 0 || aiSuggestion !== null

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="h-16 border-b border-secondary/10 px-8 flex items-center justify-between bg-background sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard/recruiter")} className="w-9 h-9 rounded-xl bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Nouvelle offre</p>
                        <p className="font-black text-sm truncate max-w-[260px]">{title || "Sans titre"}</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon
                        return (
                            <button key={s.id} onClick={() => i <= step && setStep(i)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${i === step ? "bg-primary/10 text-primary border border-primary/20" : i < step ? "text-primary/60 hover:text-primary" : "text-muted/30 cursor-default"}`}>
                                {i < step ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                <span className="hidden lg:inline">{s.label}</span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/dashboard/recruiter")} className="px-4 py-2 text-sm font-bold text-muted hover:text-foreground transition-colors">Annuler</button>
                    {step === STEPS.length - 1 ? (
                        <button onClick={handleSubmit} disabled={submitting || !title.trim() || !location.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:bg-primary/90 disabled:opacity-40 transition-all">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publier le poste
                        </button>
                    ) : (
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:bg-primary/90 disabled:opacity-40 transition-all">
                            Suivant <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto px-8 py-10">
                        <div className="mb-10">
                            <h1 className="text-3xl font-black tracking-tight">Créer un poste</h1>
                            <p className="text-muted mt-1">Définissez les informations du poste à pourvoir</p>
                        </div>

                        {/* ── Suggestion banner (step 0 ou 1) ───────────── */}
                        {(step === 0 || step === 1) && title.length >= 3 && (
                            <div className="mb-8 space-y-2">
                                {/* ROME banner */}
                                {(loadingRome || romeResults.length > 0) && (
                                    <button onClick={() => { setShowPanel(true) }} disabled={loadingRome}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-all group text-left">
                                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                                            {loadingRome ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Zap className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm text-primary">
                                                {loadingRome ? "Recherche de fiches ROME..." : `${romeResults.length} fiche${romeResults.length > 1 ? "s" : ""} ROME trouvée${romeResults.length > 1 ? "s" : ""}`}
                                            </p>
                                            <p className="text-xs text-muted mt-0.5">Compétences suggérées + description pré-rédigée</p>
                                        </div>
                                        {!loadingRome && <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />}
                                    </button>
                                )}

                                {/* AI button */}
                                <button onClick={() => { fetchAISuggestion(); setShowPanel(true) }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all group text-left">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                                        {loadingAI ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Brain className="w-4 h-4 text-purple-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-sm text-purple-400">Générer avec l'IA</p>
                                        <p className="text-xs text-muted mt-0.5">Description et compétences générées par Groq pour "{title}"</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                                </button>
                            </div>
                        )}

                        {/* ── STEP 0 : Informations ─────────────────────── */}
                        {step === 0 && (
                            <div className="space-y-8">
                                <Section num="01" title="Informations générales">
                                    <div className="space-y-5">
                                        <Field label="Titre du poste *">
                                            <input value={title} onChange={e => setTitle(e.target.value)}
                                                placeholder="Ex: Développeur Full-Stack React / Node.js"
                                                className="form-input font-semibold" />
                                        </Field>
                                        <Field label="Type de contrat">
                                            <div className="flex gap-2 flex-wrap">
                                                {CONTRACT_TYPES.map(ct => (
                                                    <button key={ct} onClick={() => setContractType(ct)}
                                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${contractType === ct ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-secondary/5 border-secondary/20 text-foreground hover:border-primary/40 hover:text-primary"}`}>
                                                        {ct}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Localisation *">
                                                <div className="relative">
                                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Paris, Lyon..." className="form-input pl-10" />
                                                </div>
                                            </Field>
                                            <Field label="Télétravail">
                                                <button onClick={() => setRemoteOk(v => !v)}
                                                    className={`w-full h-11 flex items-center justify-between px-4 rounded-xl border font-bold text-sm transition-all ${remoteOk ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/20 text-foreground/70"}`}>
                                                    {remoteOk ? "Remote OK" : "Présentiel"}
                                                    {remoteOk ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 opacity-50" />}
                                                </button>
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <Field label="Prise de poste">
                                                <div className="relative">
                                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Dès que possible" className="form-input pl-10" />
                                                </div>
                                            </Field>
                                            <Field label="Salaire Min (€/an)">
                                                <div className="relative">
                                                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="35 000" className="form-input pl-10" />
                                                </div>
                                            </Field>
                                            <Field label="Salaire Max (€/an)">
                                                <div className="relative">
                                                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="55 000" className="form-input pl-10" />
                                                </div>
                                            </Field>
                                        </div>
                                    </div>
                                </Section>

                                <Section num="02" title="Description du poste">
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
                                        placeholder="Contexte de l'entreprise, missions principales, stack technique, profil recherché..."
                                        className="form-input resize-none" />
                                </Section>

                                <Section num="03" title="Avantages" sub="Optionnel">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {BENEFIT_PRESETS.map(b => (
                                            <button key={b} onClick={() => toggleBenefit(b)}
                                                className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${benefits.includes(b) ? "bg-primary/10 border-primary/30 text-primary font-bold" : "bg-secondary/5 border-secondary/15 text-foreground/70 hover:border-secondary/40"}`}>
                                                {benefits.includes(b) && <Check className="w-3 h-3 inline mr-1" />}{b}
                                            </button>
                                        ))}
                                    </div>
                                    {benefits.filter(b => !BENEFIT_PRESETS.includes(b)).map(b => (
                                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 mr-2 mb-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
                                            {b} <button onClick={() => setBenefits(p => p.filter(x => x !== b))}><X className="w-3.5 h-3.5" /></button>
                                        </span>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                        <input value={customBenefit} onChange={e => setCustomBenefit(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomBenefit()}
                                            placeholder="Ajouter un avantage personnalisé..." className="form-input flex-1" />
                                        <button onClick={addCustomBenefit} className="px-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 border border-secondary/10 transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* ── STEP 1 : Compétences ──────────────────────── */}
                        {step === 1 && (
                            <Section num="04" title="Compétences requises"
                                sub={`${requirements.length} compétence${requirements.length !== 1 ? "s" : ""} · ${requirements.filter(r => r.is_mandatory).length} obligatoires`}>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                    <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                                        placeholder="Rechercher une compétence (React, Python...)" className="form-input pl-10" />
                                    {skillResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-secondary/15 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto">
                                            {skillResults.map(s => (
                                                <button key={s.id} onClick={() => addSkill(s)}
                                                    className="w-full text-left px-4 py-3 hover:bg-primary/5 text-sm font-medium transition-all border-t border-secondary/5 first:border-0 flex items-center justify-between group">
                                                    {s.name} <Plus className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {requirements.length === 0 ? (
                                    <div className="border-2 border-dashed border-secondary/15 rounded-2xl p-10 text-center">
                                        <Star className="w-10 h-10 text-muted/20 mx-auto mb-3" />
                                        <p className="font-bold text-muted/50">Aucune compétence ajoutée</p>
                                        <p className="text-xs text-muted/30 mt-1">Utilisez les suggestions IA ci-dessus ou recherchez manuellement</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[1fr_168px_112px_36px] gap-3 px-1 mb-2">
                                            <span className="col-label">Compétence</span>
                                            <span className="col-label text-center">Niveau min.</span>
                                            <span className="col-label text-center">Statut</span>
                                            <span />
                                        </div>
                                        {requirements.map((req, i) => (
                                            <div key={req.skill_id} className="grid grid-cols-[1fr_168px_112px_36px] gap-3 items-center p-3.5 bg-secondary/5 rounded-2xl border border-secondary/10 hover:border-secondary/20 transition-all">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {req.source === "rome" && <Zap className="w-3 h-3 text-primary/40 flex-shrink-0" />}
                                                    {req.source === "ai" && <Brain className="w-3 h-3 text-purple-400/50 flex-shrink-0" />}
                                                    <span className="font-semibold text-sm truncate text-foreground">{req.skill_name}</span>
                                                </div>
                                                <div className="flex gap-1 justify-center">
                                                    {SKILL_LEVELS.map(lvl => (
                                                        <button key={lvl.value} onClick={() => setRequirements(p => p.map((r, j) => j === i ? { ...r, required_level: lvl.value } : r))}
                                                            title={lvl.label}
                                                            className={`w-9 h-9 rounded-xl border text-sm font-black transition-all ${req.required_level === lvl.value ? lvl.color : "bg-secondary/10 border-secondary/10 text-muted/30 hover:text-muted hover:border-secondary/30"}`}>
                                                            {lvl.short}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button onClick={() => setRequirements(p => p.map((r, j) => j === i ? { ...r, is_mandatory: !r.is_mandatory } : r))}
                                                    className={`text-[10px] font-black py-2 rounded-xl uppercase tracking-wide transition-all text-center w-full border ${req.is_mandatory ? "bg-primary/15 text-primary border-primary/25" : "bg-secondary/8 text-muted/60 border-secondary/15 hover:border-secondary/30"}`}>
                                                    {req.is_mandatory ? "✓ Requis" : "Optionnel"}
                                                </button>
                                                <button onClick={() => setRequirements(p => p.filter((_, j) => j !== i))}
                                                    className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 pt-3 flex-wrap">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted/40">Niveaux :</span>
                                            {SKILL_LEVELS.map(l => <span key={l.value} className={`text-[9px] font-black px-2 py-1 rounded-lg border ${l.color}`}>{l.short} = {l.label}</span>)}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* ── STEP 2 : Critères ─────────────────────────── */}
                        {step === 2 && (
                            <div className="space-y-10">
                                <Section num="05" title="Expérience minimum" sub="Comparée aux années d'expérience du candidat">
                                    <div className="grid grid-cols-5 gap-3">
                                        {EXP_OPTIONS.map(o => (
                                            <button key={o.value} onClick={() => setMinExp(o.value)}
                                                className={`p-4 rounded-2xl border text-center transition-all ${minExp === o.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/15 hover:border-secondary/30"}`}>
                                                <p className="font-black text-sm">{o.label}</p>
                                                <p className="text-[10px] mt-0.5 text-muted">{o.sub}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                                <Section num="06" title="Formation minimum" sub="Comparée au niveau de diplôme du candidat">
                                    <div className="grid grid-cols-5 gap-3">
                                        {EDU_LEVELS.map(l => (
                                            <button key={l.value} onClick={() => setMinEdu(l.value)}
                                                className={`p-4 rounded-2xl border text-center transition-all ${minEdu === l.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/15 hover:border-secondary/30"}`}>
                                                <p className="font-black text-sm">{l.label}</p>
                                                <p className="text-[10px] mt-0.5 text-muted">{l.sub}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* ── STEP 3 : Preview ──────────────────────────── */}
                        {step === 3 && (
                            <Section num="07" title="Aperçu" sub="Vérifiez avant de publier">
                                <div className="glass-panel rounded-panel-sm p-8 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-lg">{contractType}</span>
                                            {remoteOk && <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">Remote OK</span>}
                                        </div>
                                        <h2 className="text-2xl font-black">{title || "—"}</h2>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted flex-wrap">
                                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{location}</span>
                                            {(salaryMin || salaryMax) && <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />{salaryMin}–{salaryMax} €/an</span>}
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{startDate}</span>
                                        </div>
                                    </div>
                                    {description && <p className="text-sm leading-relaxed text-muted/80 border-t border-secondary/10 pt-5">{description}</p>}
                                    {requirements.length > 0 && (
                                        <div className="border-t border-secondary/10 pt-5">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3">Compétences requises</p>
                                            <div className="flex flex-wrap gap-2">
                                                {requirements.map(r => (
                                                    <span key={r.skill_id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${r.is_mandatory ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/5 border-secondary/10 text-muted"}`}>
                                                        {r.skill_name}
                                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${SKILL_LEVELS.find(l => l.value === r.required_level)?.color ?? ""}`}>{r.required_level}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="border-t border-secondary/10 pt-5 grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted/50 mb-1">Expérience min.</p>
                                            <p className="font-bold">{EXP_OPTIONS.find(o => o.value === minExp)?.label}</p>
                                        </div>
                                        <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted/50 mb-1">Formation min.</p>
                                            <p className="font-bold">{EDU_LEVELS.find(l => l.value === minEdu)?.label}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSubmit} disabled={submitting || !title.trim() || !location.trim()}
                                    className="w-full mt-6 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-3">
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    {submitting ? "Publication en cours..." : "Publier le poste"}
                                </button>
                            </Section>
                        )}

                        {/* Nav */}
                        <div className="flex items-center justify-between mt-14 pt-8 border-t border-secondary/10">
                            {step > 0 ? (
                                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-5 py-2.5 bg-secondary/10 hover:bg-secondary/20 rounded-xl font-bold text-sm transition-all">
                                    <ArrowLeft className="w-4 h-4" /> Précédent
                                </button>
                            ) : <div />}
                            {step < STEPS.length - 1 && (
                                <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:bg-primary/90 disabled:opacity-40 transition-all">
                                    Suivant <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right summary sidebar */}
                <aside className="hidden xl:flex w-72 border-l border-secondary/10 flex-col p-6 overflow-y-auto">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-6">Résumé</p>
                    <div className="space-y-3 flex-1 text-sm">
                        <SRow label="Titre"          value={title || "—"} />
                        <SRow label="Contrat"         value={contractType} />
                        <SRow label="Lieu"            value={`${location || "—"}${remoteOk ? " · Remote" : ""}`} />
                        <SRow label="Prise de poste"  value={startDate} />
                        {(salaryMin || salaryMax) && <SRow label="Salaire" value={`${salaryMin || "?"} – ${salaryMax || "?"} €`} />}
                        {requirements.length > 0 && (
                            <div className="pt-3 border-t border-secondary/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2">{requirements.length} compétence{requirements.length > 1 ? "s" : ""}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {requirements.slice(0, 8).map(r => <span key={r.skill_id} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${r.is_mandatory ? "bg-primary/10 text-primary" : "bg-secondary/10 text-muted"}`}>{r.skill_name}</span>)}
                                    {requirements.length > 8 && <span className="text-[10px] text-muted/50">+{requirements.length - 8}</span>}
                                </div>
                            </div>
                        )}
                        <div className="pt-3 border-t border-secondary/10">
                            <SRow label="Expérience min." value={EXP_OPTIONS.find(o => o.value === minExp)?.label ?? "—"} />
                            <SRow label="Formation min."  value={EDU_LEVELS.find(l => l.value === minEdu)?.label ?? "—"} />
                        </div>
                    </div>
                    {(() => {
                        const pct = Math.round(([title, location, description, requirements.length > 0].filter(Boolean).length / 4) * 100)
                        return (
                            <div className="mt-6 pt-6 border-t border-secondary/10">
                                <div className="flex justify-between mb-2">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Complétude</p>
                                    <span className={`text-xs font-black ${pct >= 75 ? "text-primary" : pct >= 50 ? "text-amber-500" : "text-red-400"}`}>{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? "bg-primary" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        )
                    })()}
                </aside>
            </div>

            {/* ── Suggestions panel (slide-over) ─────────────────────────── */}
            {showPanel && (
                <div className="fixed inset-0 z-[60] flex">
                    <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
                    <div className="w-[520px] bg-background border-l border-secondary/10 flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-secondary/10 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="font-black text-lg flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Suggestions IA</h2>
                                <p className="text-xs text-muted mt-0.5">Pour "{title}"</p>
                            </div>
                            <button onClick={() => setShowPanel(false)} className="w-9 h-9 rounded-xl bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-all"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* AI Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" />Génération Groq IA</p>
                                    <button onClick={fetchAISuggestion} disabled={loadingAI}
                                        className="flex items-center gap-1.5 text-xs font-black text-purple-400 hover:text-purple-300 transition-colors">
                                        {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        {loadingAI ? "Génération..." : "Régénérer"}
                                    </button>
                                </div>

                                {loadingAI && (
                                    <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                        <p className="text-sm text-purple-400/70">Groq génère les suggestions...</p>
                                    </div>
                                )}

                                {aiSuggestion && !loadingAI && (
                                    <div className="border border-purple-500/20 rounded-2xl overflow-hidden">
                                        <div className="p-4 bg-purple-500/5 flex items-center justify-between">
                                            <div>
                                                <p className="font-black text-sm text-purple-300">Suggestion Groq IA</p>
                                                <p className="text-[10px] text-muted mt-0.5">{(aiSuggestion.suggested_skills || []).length} compétences · source: {aiSuggestion.source}</p>
                                            </div>
                                            <button onClick={applyAI}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-purple-500 text-white hover:bg-purple-400 transition-all">
                                                <Plus className="w-3.5 h-3.5" />Tout importer
                                            </button>
                                        </div>
                                        {aiSuggestion.description && (
                                            <div className="px-4 pt-3 pb-3 border-t border-purple-500/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Description générée</p>
                                                    <button onClick={() => copyDesc(aiSuggestion.description, "ai")} className="flex items-center gap-1 text-[10px] font-black text-muted/60 hover:text-purple-400 transition-colors">
                                                        {copiedDesc === "ai" ? <><CheckCheck className="w-3 h-3 text-purple-400" />Copié</> : <><Copy className="w-3 h-3" />Copier</>}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-muted/70 leading-relaxed line-clamp-4">{aiSuggestion.description}</p>
                                            </div>
                                        )}
                                        {aiSuggestion.suggested_skills && aiSuggestion.suggested_skills.length > 0 && (
                                            <div className="px-4 pt-3 pb-4 border-t border-purple-500/10">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2">{aiSuggestion.suggested_skills.length} compétences</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {aiSuggestion.suggested_skills.map(sk => {
                                                        const already = !!requirements.find(r => r.skill_id === sk.skill_id)
                                                        return (
                                                            <button key={sk.skill_id}
                                                                onClick={() => { if (!already) setRequirements(p => [...p, { skill_id: sk.skill_id, skill_name: sk.skill_name, required_level: sk.min_level, is_mandatory: sk.is_mandatory, source: "ai" }]) }}
                                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${already ? "bg-purple-500/15 border-purple-500/25 text-purple-300 cursor-default" : "bg-secondary/5 border-secondary/15 text-foreground/70 hover:border-purple-500/30 hover:text-purple-400 hover:bg-purple-500/5"}`}>
                                                                {already ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                                                                {sk.skill_name} <span className="text-[9px] opacity-60">niv.{sk.min_level}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ROME Section */}
                            {romeResults.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Fiches ROME ({romeResults.length})</p>
                                    <div className="space-y-3">
                                        {romeResults.map(s => (
                                            <div key={s.id} className="border border-secondary/15 rounded-2xl overflow-hidden hover:border-secondary/30 transition-all">
                                                <div className="p-4 flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-black text-sm">{s.title}</p>
                                                        <p className="text-[10px] text-muted mt-0.5">{s.rome_code} · {s.category}</p>
                                                    </div>
                                                    <button onClick={() => applyRomeSkills(s)}
                                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${appliedRome === s.id ? "bg-primary/20 text-primary" : "bg-primary text-white hover:bg-primary/90"}`}>
                                                        {appliedRome === s.id ? <><Check className="w-3.5 h-3.5" />Appliqué</> : <><Plus className="w-3.5 h-3.5" />Importer</>}
                                                    </button>
                                                </div>
                                                {s.description && (
                                                    <div className="px-4 pt-2 pb-3 border-t border-secondary/10">
                                                        <div className="flex justify-between mb-1">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Description</p>
                                                            <button onClick={() => copyDesc(s.description, s.id)} className="flex items-center gap-1 text-[10px] font-black text-muted/60 hover:text-primary transition-colors">
                                                                {copiedDesc === s.id ? <><CheckCheck className="w-3 h-3 text-primary" />Copié</> : <><Copy className="w-3 h-3" />Copier</>}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-muted/70 line-clamp-2">{s.description}</p>
                                                    </div>
                                                )}
                                                {s.suggested_skills && s.suggested_skills.length > 0 && (
                                                    <div className="px-4 pt-2 pb-3 border-t border-secondary/10">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2">{(s.suggested_skills || []).length} compétences</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {s.suggested_skills.map(sk => {
                                                                const already = !!requirements.find(r => r.skill_id === sk.skill_id)
                                                                return (
                                                                    <button key={sk.skill_id}
                                                                        onClick={() => { if (!already) setRequirements(p => [...p, { skill_id: sk.skill_id, skill_name: sk.skill_name, required_level: sk.min_level, is_mandatory: sk.is_mandatory, source: "rome" }]) }}
                                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${already ? "bg-primary/15 border-primary/25 text-primary cursor-default" : "bg-secondary/5 border-secondary/15 text-foreground/70 hover:border-primary/30 hover:text-primary hover:bg-primary/5"}`}>
                                                                        {already ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                                                                        {sk.skill_name} <span className="text-[9px] opacity-60">niv.{sk.min_level}</span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Section({ num, title, sub, children }: { num: string; title: string; sub?: string; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-5"><p className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary mb-0.5">{num}</p><h2 className="text-lg font-black tracking-tight">{title}</h2>{sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}</div>
            {children}
        </section>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-xs font-bold text-foreground/60 mb-1.5">{label}</label>{children}</div>
}

function SRow({ label, value }: { label: string; value: string }) {
    return <div className="mb-3"><p className="text-[9px] font-bold uppercase tracking-widest text-muted/40">{label}</p><p className="text-xs font-semibold text-foreground/70 mt-0.5 truncate">{value}</p></div>
}
