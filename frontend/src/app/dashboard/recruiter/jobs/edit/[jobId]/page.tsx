"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
    ArrowLeft, ArrowRight, Sparkles, Search, Trash2, Loader2, Plus,
    Check, MapPin, Briefcase, GraduationCap, Star, ToggleLeft, ToggleRight,
    Euro, Calendar, X, ChevronRight, Zap, Copy, CheckCheck, Brain
} from "lucide-react"
import { getJob, updateJob, searchSkills, Skill } from "@/lib/api"

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

export default function EditJobPage() {
    const router = useRouter()
    const { jobId } = useParams()
    const { token } = useAuthStore()

    const [step,         setStep]         = React.useState(0)
    const [loading,      setLoading]      = React.useState(true)
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

    // Load Job Data
    React.useEffect(() => {
        if (!jobId || !token) return
        const load = async () => {
            try {
                const job = await getJob(parseInt(jobId as string))
                setTitle(job.title)
                setDescription(job.description)
                setLocation(job.location)
                setSalaryMin(job.salary_min?.toString() || "")
                setSalaryMax(job.salary_max?.toString() || "")
                setMinExp(job.min_years_experience)
                setMinEdu(job.min_education_level)
                // contractType, startDate, benefits are not in Job model currently but might be in JobBase
                // For now we use the ones that are in the Job object returned by getJob
                setRequirements(job.requirements.map(r => ({
                    skill_id: r.skill_id,
                    skill_name: r.skill_name || "",
                    required_level: r.required_level,
                    is_mandatory: r.is_mandatory,
                    source: "manual"
                })))
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [jobId, token])

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
        if (!title.trim() || !location.trim() || !token || !jobId) return
        setSubmitting(true)
        try {
            await updateJob(parseInt(jobId as string), {
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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">

            {/* Header */}
            <header className="h-16 border-b border-secondary/10 px-8 flex items-center justify-between bg-background sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard/recruiter")} className="w-9 h-9 rounded-xl bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Modifier l'offre</p>
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
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer les modifications
                        </button>
                    ) : (
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:bg-primary/90 disabled:opacity-40 transition-all">
                            Suivant <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto px-8 py-10">
                        <div className="mb-10">
                            <h1 className="text-3xl font-black tracking-tight">Modifier l'offre</h1>
                            <p className="text-muted mt-1">Mettez à jour les informations du poste</p>
                        </div>

                        {/* STEP 0 : Informations */}
                        {step === 0 && (
                            <div className="space-y-8">
                                <Section num="01" title="Informations générales">
                                    <div className="space-y-5">
                                        <Field label="Titre du poste *">
                                            <input value={title} onChange={e => setTitle(e.target.value)}
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
                                                    <input value={location} onChange={e => setLocation(e.target.value)} className="form-input pl-10" />
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
                                                    <input value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input pl-10" />
                                                </div>
                                            </Field>
                                            <Field label="Salaire Min (€/an)">
                                                <div className="relative">
                                                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} className="form-input pl-10" />
                                                </div>
                                            </Field>
                                            <Field label="Salaire Max (€/an)">
                                                <div className="relative">
                                                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                                    <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} className="form-input pl-10" />
                                                </div>
                                            </Field>
                                        </div>
                                    </div>
                                </Section>

                                <Section num="02" title="Description du poste">
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
                                        className="form-input resize-none" />
                                </Section>
                            </div>
                        )}

                        {/* STEP 1 : Compétences */}
                        {step === 1 && (
                            <Section num="04" title="Compétences requises">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                                    <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                                        placeholder="Rechercher une compétence" className="form-input pl-10" />
                                    {skillResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-secondary/15 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto">
                                            {skillResults.map(s => (
                                                <button key={s.id} onClick={() => addSkill(s)}
                                                    className="w-full text-left px-4 py-3 hover:bg-primary/5 text-sm font-medium transition-all">
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {requirements.map((req, i) => (
                                        <div key={req.skill_id} className="flex items-center gap-3 p-3.5 bg-secondary/5 rounded-2xl border border-secondary/10">
                                            <span className="flex-1 font-semibold text-sm">{req.skill_name}</span>
                                            <div className="flex gap-1">
                                                {SKILL_LEVELS.map(lvl => (
                                                    <button key={lvl.value} onClick={() => setRequirements(p => p.map((r, j) => j === i ? { ...r, required_level: lvl.value } : r))}
                                                        className={`w-8 h-8 rounded-lg border text-xs font-black transition-all ${req.required_level === lvl.value ? lvl.color : "bg-secondary/10 border-secondary/10 text-muted/30"}`}>
                                                        {lvl.short}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => setRequirements(p => p.map((r, j) => j === i ? { ...r, is_mandatory: !r.is_mandatory } : r))}
                                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${req.is_mandatory ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-muted"}`}>
                                                {req.is_mandatory ? "Requis" : "Optionnel"}
                                            </button>
                                            <button onClick={() => setRequirements(p => p.filter((_, j) => j !== i))}
                                                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* STEP 2 : Critères */}
                        {step === 2 && (
                            <div className="space-y-10">
                                <Section num="05" title="Expérience minimum">
                                    <div className="grid grid-cols-5 gap-3">
                                        {EXP_OPTIONS.map(o => (
                                            <button key={o.value} onClick={() => setMinExp(o.value)}
                                                className={`p-4 rounded-2xl border text-center transition-all ${minExp === o.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/15"}`}>
                                                <p className="font-black text-sm">{o.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                                <Section num="06" title="Formation minimum">
                                    <div className="grid grid-cols-5 gap-3">
                                        {EDU_LEVELS.map(l => (
                                            <button key={l.value} onClick={() => setMinEdu(l.value)}
                                                className={`p-4 rounded-2xl border text-center transition-all ${minEdu === l.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/5 border-secondary/15"}`}>
                                                <p className="font-black text-sm">{l.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* STEP 3 : Preview */}
                        {step === 3 && (
                            <Section num="07" title="Aperçu final">
                                <div className="glass-panel p-8 space-y-6">
                                    <h2 className="text-2xl font-black">{title}</h2>
                                    <p className="text-sm text-muted">{location} · {contractType}</p>
                                    <p className="text-sm leading-relaxed">{description}</p>
                                </div>
                                <button onClick={handleSubmit} disabled={submitting}
                                    className="w-full mt-8 py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3">
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Enregistrer
                                </button>
                            </Section>
                        )}

                        {/* Nav */}
                        <div className="flex items-center justify-between mt-14 pt-8 border-t border-secondary/10">
                            {step > 0 && (
                                <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 bg-secondary/10 rounded-xl font-bold text-sm">Précédent</button>
                            )}
                            {step < STEPS.length - 1 && (
                                <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]} className="px-6 py-2.5 bg-primary text-white font-black rounded-xl text-sm">Suivant</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
    return (
        <section>
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">{num}</p>
            <h2 className="text-lg font-black mb-5">{title}</h2>
            {children}
        </section>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">{label}</label>{children}</div>
}
