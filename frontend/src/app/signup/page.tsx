"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { register, login, testConnection } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { ThemeToggle } from "@/components/theme-toggle"
import { Lock, Mail, User, ArrowRight, Loader2, Briefcase, GraduationCap } from "lucide-react"

export default function SignupPage() {
    const router = useRouter()
    const { setAuth } = useAuthStore()
    const [fullName, setFullName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [role, setRole] = React.useState<"CANDIDATE" | "RECRUITER">("CANDIDATE")
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState("")

    React.useEffect(() => {
        testConnection();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            // 1. Register
            await register(fullName, email, password, role)

            // 2. Login automatically
            const { user, token } = await login(email, password)
            setAuth(user, token)

            // 3. Redirect
            if (user.role === "RECRUITER") {
                router.push("/dashboard/recruiter")
            } else {
                // Pour les candidats, direction onboarding !
                router.push("/onboarding/candidate")
            }
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'inscription")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 selection:bg-primary/30">
            <div className="glow-mesh opacity-50" />

            {/* Left Side: Branding */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-secondary/5 border-r border-secondary/10 relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center font-black text-primary text-xl border border-secondary/20 shadow-xl shadow-primary/10 cursor-pointer" onClick={() => router.push("/")}>
                        R
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-foreground">
                        RECRUIT<span className="text-primary">PRO</span>
                    </span>
                </div>

                <div className="z-10">
                    <h1 className="text-6xl font-black tracking-tight mb-6 leading-tight text-gradient">
                        Propulsez votre<br />carrière avec l'IA.
                    </h1>
                    <p className="text-muted text-xl max-w-md font-medium leading-relaxed">
                        Que vous soyez un talent en quête de défis ou un recruteur cherchant la perle rare, RecruitPro est votre meilleur allié.
                    </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-muted/30 z-10">
                    © 2026 RECRUITPRO • JOIN THE ELITE
                </div>

                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
            </div>

            {/* Right Side: Form */}
            <div className="flex flex-col justify-center items-center p-6 md:p-12 relative overflow-y-auto">
                <div className="absolute top-8 right-8">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-md py-12">
                    <div className="text-center md:text-left mb-10">
                        <h2 className="text-3xl font-black tracking-tighter text-foreground mb-2">Créez votre compte gratuit</h2>
                        <p className="text-muted font-medium">Rejoignez des milliers de professionnels.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Role Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button
                                type="button"
                                onClick={() => setRole("CANDIDATE")}
                                className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-3 ${role === "CANDIDATE" ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-secondary/20 bg-secondary/5 hover:border-secondary/40"}`}
                            >
                                <GraduationCap className={`w-8 h-8 ${role === "CANDIDATE" ? "text-primary" : "text-muted"}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${role === "CANDIDATE" ? "text-primary" : "text-muted"}`}>Candidat</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("RECRUITER")}
                                className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-3 ${role === "RECRUITER" ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-secondary/20 bg-secondary/5 hover:border-secondary/40"}`}
                            >
                                <Briefcase className={`w-8 h-8 ${role === "RECRUITER" ? "text-primary" : "text-muted"}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${role === "RECRUITER" ? "text-primary" : "text-muted"}`}>Recruteur</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Nom complet</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full h-14 bg-secondary/5 border border-secondary/20 rounded-2xl pl-12 pr-4 text-foreground outline-none focus:border-primary/50 transition-all font-medium"
                                    placeholder="Jean Dupont"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 bg-secondary/5 border border-secondary/20 rounded-2xl pl-12 pr-4 text-foreground outline-none focus:border-primary/50 transition-all font-medium"
                                    placeholder="jean@exemple.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 bg-secondary/5 border border-secondary/20 rounded-2xl pl-12 pr-4 text-foreground outline-none focus:border-primary/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Créer mon compte <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-muted font-medium">
                        Déjà inscrit ?{" "}
                        <button onClick={() => router.push("/login")} className="text-primary font-black uppercase tracking-widest text-[11px] hover:underline">Connectez-vous</button>
                    </p>
                </div>
            </div>
        </div>
    )
}
