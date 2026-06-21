"use client"

import * as React from "react"
import { CheckCircle, AlertTriangle } from "lucide-react"

/**
 * Notification éphémère partagée (« toast »).
 *
 * Reprend le style déjà utilisé sur la page Employés et le centralise pour que
 * toutes les pages signalent succès/erreur de la même façon — au lieu des
 * `alert()` natifs du navigateur, brutaux et hors charte.
 */

export type ToastState = { type: "success" | "error"; msg: string } | null

export function useToast(timeout = 3500) {
    const [toast, setToast] = React.useState<ToastState>(null)
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const showToast = React.useCallback(
        (type: "success" | "error", msg: string) => {
            if (timer.current) clearTimeout(timer.current)
            setToast({ type, msg })
            timer.current = setTimeout(() => setToast(null), timeout)
        },
        [timeout],
    )

    React.useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current)
        },
        [],
    )

    return { toast, showToast }
}

export function Toast({ toast }: { toast: ToastState }) {
    // Le conteneur reste monté en permanence pour que `aria-live` annonce les
    // messages qui apparaissent ; il est transparent aux clics quand il est vide.
    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed top-6 right-6 z-[200] pointer-events-none"
        >
            {toast && (
                <div
                    role="status"
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold ${
                        toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <AlertTriangle className="w-4 h-4" />
                    )}
                    {toast.msg}
                </div>
            )}
        </div>
    )
}
