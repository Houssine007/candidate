"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { lmsLaunchUrl } from "@/lib/api"
import {
    TrendingUp,
    Users,
    Building2,
    PieChart,
    BookOpen,
    GraduationCap,
    ExternalLink,
    Briefcase,
    LogOut,
} from "lucide-react"

/**
 * Barre latérale unique du rôle recruteur.
 *
 * Auparavant, ce menu était recopié à la main sur chaque page recruteur et les
 * copies avaient divergé (GPEC / Académie présents ici, absents là). Le centraliser
 * garantit un menu identique sur toutes les pages d'un même rôle et un seul endroit
 * à modifier pour ajouter une entrée. Les permissions par rôle restent inchangées :
 * ce composant ne sert qu'au rôle recruteur.
 */

export type RecruiterSidebarKey =
    | "overview"
    | "employees"
    | "organization"
    | "gpec"
    | "formations"

const NAV_ITEMS: {
    key: RecruiterSidebarKey
    label: string
    href: string
    icon: React.ElementType
}[] = [
    { key: "overview", label: "Vue d'ensemble", href: "/dashboard/recruiter", icon: TrendingUp },
    { key: "employees", label: "Employés", href: "/dashboard/recruiter/employees", icon: Users },
    { key: "organization", label: "Organisation", href: "/dashboard/recruiter/organization", icon: Building2 },
    { key: "gpec", label: "Pilotage GPEC", href: "/dashboard/recruiter/gpec", icon: PieChart },
    { key: "formations", label: "Formations", href: "/dashboard/recruiter/formations", icon: BookOpen },
]

const BASE = "w-full flex items-center gap-4 p-4 rounded-2xl transition-colors font-bold text-sm"
const INACTIVE = "text-muted hover:text-foreground hover:bg-secondary/10"
const ACTIVE = "bg-primary/10 text-primary border border-primary/20"

export function RecruiterSidebar({ active }: { active: RecruiterSidebarKey }) {
    const router = useRouter()
    const { token, logout } = useAuthStore()

    // SSO unifiée : ouvre le LMS (RecruitPRO Academy) en transmettant le JWT RH
    // via ?token=. Le LMS le capte et le persiste — aucune ré-authentification.
    const handleLaunchLms = () => {
        if (!token) return
        window.open(lmsLaunchUrl(token, "/instructor/courses"), "_blank", "noopener")
    }

    const handleLogout = () => {
        logout()
        router.push("/")
    }

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-secondary/5 border-r border-secondary/10 hidden lg:flex flex-col p-6 z-50">
            <div className="flex items-center gap-3 mb-12">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center font-black text-primary text-sm">R</div>
                <span className="font-extrabold tracking-tighter text-lg">RECRUITPRO</span>
            </div>

            <nav aria-label="Navigation recruteur" className="space-y-2 flex-1">
                {NAV_ITEMS.map(({ key, label, href, icon: Icon }) => {
                    const isActive = key === active
                    return (
                        <button
                            key={key}
                            onClick={() => router.push(href)}
                            aria-current={isActive ? "page" : undefined}
                            className={`${BASE} ${isActive ? ACTIVE : INACTIVE}`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    )
                })}

                <button
                    onClick={handleLaunchLms}
                    title="Ouvrir RecruitPRO Academy en SSO (nouvel onglet)"
                    className={`${BASE} bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20`}
                >
                    <GraduationCap className="w-4 h-4" /> Académie (LMS)
                    <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
                </button>

                <button onClick={() => router.push("/")} className={`${BASE} ${INACTIVE}`}>
                    <Briefcase className="w-4 h-4" /> Voir le Site
                </button>
            </nav>

            <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 text-muted/60 hover:text-foreground hover:bg-secondary/10 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest mt-auto"
            >
                <LogOut className="w-4 h-4" /> Déconnexion
            </button>
        </aside>
    )
}
