"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { createJob, getSkills, Skill } from "@/lib/api"
import { 
    Briefcase, 
    MapPin, 
    Target, 
    Plus, 
    X, 
    ChevronLeft,
    CheckCircle2,
    Building2,
    DollarSign,
    GraduationCap
} from "lucide-react"

export default function NewJobPage() {
    const router = useRouter()
    const { token } = useAuthStore()
    const [loading, setLoading] = React.useState(false)
    const [availableSkills, setAvailableSkills] = React.useState<Skill[]>([])
    
    const [formData, setFormData] = React.useState({
        title: "",
        company: "TechCorp Solutions", // Default for demo
        location: "",
        description: "",
        salary_min: "",
        salary_max: "",
        min_years_experience: "0",
        min_education_level: "0",
        requirements: [] as { skill_id: number, required_level: number, is_mandatory: boolean, skill_name?: string }[]
    })

    React.useEffect(() => {
        const fetchSkills = async () => {
            try {
                const skills = await getSkills(token!)
                setAvailableSkills(skills)
            } catch (err) {
                console.error("Failed to fetch skills", err)
            }
        }
        if (token) fetchSkills()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return
        setLoading(true)
        try {
            await createJob({
                ...formData,
                salary_min: formData.salary_min ? parseFloat(formData.salary_min) : undefined,
                salary_max: formData.salary_max ? parseFloat(formData.salary_max) : undefined,
                min_years_experience: parseFloat(formData.min_years_experience),
                min_education_level: parseInt(formData.min_education_level),
                requirements: formData.requirements.map(r => ({
                    skill_id: r.skill_id,
                    required_level: r.required_level,
                    is_mandatory: r.is_mandatory
                }))
            }, token)
            router.push("/dashboard/recruiter")
        } catch (err) {
            console.error(err)
            alert("Erreur lors de la création de l'offre")
        } finally {
            setLoading(false)
        }
    }

    const addRequirement = (skill: Skill) => {
        if (formData.requirements.find(r => r.skill_id === skill.id)) return
        setFormData({
            ...formData,
            requirements: [...formData.requirements, { 
                skill_id: skill.id, 
                required_level: 2, 
                is_mandatory: true, 
                skill_name: skill.name 
            }]
        })
    }

    const removeRequirement = (skillId: number) => {
        setFormData({
            ...formData,
            requirements: formData.requirements.filter(r => r.skill_id !== skillId)
        })
    }

    const updateRequirement = (skillId: number, field: string, value: any) => {
        setFormData({
            ...formData,
            requirements: formData.requirements.map(r => 
                r.skill_id === skillId ? { ...r, [field]: value } : r
            )
        })
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 text-muted hover:text-primary transition-colors font-bold mb-8"
                >
                    <ChevronLeft className="w-4 h-4" /> Retour au Dashboard
                </button>

                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-4xl font-black tracking-tight">Nouvelle Offre d'Emploi</h1>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                        <Target className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Sourcing Intelligent</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5 space-y-8">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Intitulé du Poste</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                    <input 
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                        placeholder="ex: Lead Developer React"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Localisation</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                    <input 
                                        required
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                        placeholder="ex: Paris (Hyrbide)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Salary & Experience */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2 col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Salaire Min (€)</label>
                                <input 
                                    type="number"
                                    value={formData.salary_min}
                                    onChange={e => setFormData({...formData, salary_min: e.target.value})}
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl px-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                    placeholder="50000"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Salaire Max (€)</label>
                                <input 
                                    type="number"
                                    value={formData.salary_max}
                                    onChange={e => setFormData({...formData, salary_max: e.target.value})}
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl px-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                    placeholder="70000"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">XP Min (ans)</label>
                                <input 
                                    type="number"
                                    value={formData.min_years_experience}
                                    onChange={e => setFormData({...formData, min_years_experience: e.target.value})}
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl px-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Diplôme (Bac+X)</label>
                                <input 
                                    type="number"
                                    value={formData.min_education_level}
                                    onChange={e => setFormData({...formData, min_education_level: e.target.value})}
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl px-4 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 ml-2">Description du Poste</label>
                            <textarea 
                                required
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                rows={6}
                                className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold resize-none"
                                placeholder="Décrivez le poste, les responsabilités et l'environnement de travail..."
                            />
                        </div>
                    </div>

                    {/* Requirements / Skills */}
                    <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl shadow-black/5 space-y-8">
                        <div>
                            <h2 className="text-xl font-black mb-1">Compétences Requises</h2>
                            <p className="text-xs text-muted font-bold">L'IA utilisera ces critères pour matcher les candidats.</p>
                        </div>

                        <div className="space-y-4">
                            {formData.requirements.map((req) => (
                                <div key={req.skill_id} className="flex items-center gap-4 p-4 bg-secondary/5 rounded-2xl border border-secondary/10 group">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm tracking-tight">{req.skill_name}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted/50">Niveau:</span>
                                            <select 
                                                value={req.required_level}
                                                onChange={e => updateRequirement(req.skill_id, 'required_level', parseInt(e.target.value))}
                                                className="bg-background border border-secondary/10 rounded-lg px-2 py-1 text-xs font-bold"
                                            >
                                                <option value={1}>Débutant</option>
                                                <option value={2}>Intermédiaire</option>
                                                <option value={3}>Avancé</option>
                                                <option value={4}>Expert</option>
                                            </select>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={req.is_mandatory}
                                                onChange={e => updateRequirement(req.skill_id, 'is_mandatory', e.target.checked)}
                                                className="w-4 h-4 rounded border-secondary/10 text-primary focus:ring-primary/20"
                                            />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted/50">Obligatoire</span>
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => removeRequirement(req.skill_id)}
                                            className="p-2 text-muted hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add Skill selector */}
                            <div className="flex flex-wrap gap-2 pt-4">
                                {availableSkills
                                    .filter(s => !formData.requirements.find(r => r.skill_id === s.id))
                                    .slice(0, 10)
                                    .map(skill => (
                                        <button
                                            key={skill.id}
                                            type="button"
                                            onClick={() => addRequirement(skill)}
                                            className="px-4 py-2 bg-secondary/10 hover:bg-primary/20 border border-secondary/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> {skill.name}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button 
                            type="button"
                            onClick={() => router.back()}
                            className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-muted hover:bg-secondary/10 transition-all"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-12 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                        >
                            {loading ? "Création..." : "Publier l'Offre"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
