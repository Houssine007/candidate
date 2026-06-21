"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

/**
 * Petite bulle d'aide accessible.
 *
 * S'ouvre au survol ET au focus clavier (pas seulement à la souris), se ferme
 * avec Échap, et expose `role="tooltip"` + `aria-describedby` pour les lecteurs
 * d'écran. À utiliser pour expliquer un terme métier (Fit, Potentiel, badges…)
 * sans alourdir l'interface.
 *
 * À éviter à l'intérieur d'un conteneur `overflow-hidden/auto` (la bulle serait
 * rognée) ; préférer alors un `title` natif.
 */
export function InfoHint({
    label,
    children,
    className = "",
}: {
    label: string
    children: React.ReactNode
    className?: string
}) {
    const [open, setOpen] = React.useState(false)
    const id = React.useId()

    return (
        <span className={`relative inline-flex items-center ${className}`}>
            <button
                type="button"
                aria-label={label}
                aria-describedby={open ? id : undefined}
                aria-expanded={open}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={e => {
                    if (e.key === "Escape") setOpen(false)
                }}
                className="text-muted hover:text-foreground transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
            </button>
            {open && (
                <span
                    role="tooltip"
                    id={id}
                    className="absolute left-1/2 top-full z-[400] mt-2 w-64 -translate-x-1/2 rounded-xl border border-card-border bg-card px-3.5 py-3 text-[11px] font-medium leading-relaxed text-foreground shadow-xl"
                >
                    {children}
                </span>
            )}
        </span>
    )
}
