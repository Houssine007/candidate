"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { ThemeToggle } from "@/components/theme-toggle"
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const { setAuth } = useAuthStore()
    const [email, setEmail] = React.useState("recruiter@techcorp.com")
    const [password, setPassword] = React.useState("password123")
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            const { user, token } = await login(email, password)
            setAuth(user, token)
            if (user.role === "RECRUITER" || user.role === "ADMIN") {
                router.push("/dashboard/recruiter")
           } else if (user.role === "EMPLOYEE") {
                router.push("/dashboard/employee")
            } else if (user.role === "CANDIDATE") {
                router.push("/dashboard/candidate")
            } else {
                router.push("/")
            }
        } catch (err) {
            setError("Email ou mot de passe incorrect")
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
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center font-black text-primary text-xl border border-secondary/20 shadow-xl shadow-primary/10">
                        R
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-foreground">
                        RECRUIT<span className="text-primary">PRO</span>
                    </span>
                </div>

                <div className="z-10">
                    <h1 className="text-6xl font-black tracking-tight mb-6 leading-tight text-gradient">
                        L'excellence RH<br />commence ici.
                    </h1>
                    <p className="text-muted text-xl max-w-md font-medium leading-relaxed">
                        Rejoignez la nouvelle génération de recruteurs utilisant l'IA pour trouver les talents qui comptent vraiment.
                    </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-muted/30 z-10">
                    © 2026 RECRUITPRO • PREMIUM SAAS
                </div>

                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
            </div>

            {/* Right Side: Form */}
            <div className="flex flex-col justify-center items-center p-6 md:p-12 relative">
                <div className="absolute top-8 right-8">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-md">
                    <div className="text-center md:text-left mb-10">
                        <h2 className="text-3xl font-black tracking-tighter text-foreground mb-2">Bon retour parmi nous</h2>
                        <p className="text-muted font-medium">Connectez-vous pour gérer vos talents.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Email professionnel</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-primary" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 bg-secondary/5 border border-secondary/20 rounded-2xl pl-12 pr-4 text-foreground outline-none focus:border-primary/50 transition-all font-medium"
                                    placeholder="exemple@entreprise.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Mot de passe</label>
                                <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">Oublié ?</a>
                            </div>
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
                                    Se Connecter <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-muted font-medium">
                        Pas encore de compte ?{" "}
                        <button onClick={() => router.push("/signup")} className="text-primary font-black uppercase tracking-widest text-[11px] hover:underline">Rejoignez-nous</button>
                    </p>
                </div>
            </div>
        </div>
    )
}
