"use client"

import * as React from "react"

/**
 * Accessibilité clavier des fenêtres modales.
 *
 * - Échap ferme la modale.
 * - Le focus est « piégé » : Tab/Shift+Tab bouclent à l'intérieur de la fenêtre.
 * - À l'ouverture, le focus se place sur le premier élément focusable (ou le
 *   panneau lui-même) ; à la fermeture, il revient sur l'élément déclencheur.
 *
 * À brancher sur le PANNEAU de la modale (pas le fond), avec `role="dialog"`,
 * `aria-modal="true"`, `tabIndex={-1}` et un `aria-label`/`aria-labelledby`.
 *
 * `onClose` est lu via une ref : l'effet ne dépend que de `open`, donc le focus
 * initial ne se redéclenche pas à chaque rendu (ce qui volerait le focus pendant
 * la saisie d'un formulaire).
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
    const ref = React.useRef<T>(null)
    const onCloseRef = React.useRef(onClose)
    onCloseRef.current = onClose

    React.useEffect(() => {
        if (!open) return
        const node = ref.current
        const previouslyFocused = document.activeElement as HTMLElement | null

        const getFocusable = (): HTMLElement[] =>
            node
                ? Array.from(
                      node.querySelectorAll<HTMLElement>(
                          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
                      ),
                  ).filter(el => el.offsetParent !== null)
                : []

        // Focus initial à l'ouverture.
        const initial = getFocusable()
        ;(initial[0] ?? node)?.focus()

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault()
                onCloseRef.current()
                return
            }
            if (e.key === "Tab") {
                const items = getFocusable()
                if (items.length === 0) {
                    e.preventDefault()
                    return
                }
                const first = items[0]
                const last = items[items.length - 1]
                const activeEl = document.activeElement as HTMLElement
                if (e.shiftKey && activeEl === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && activeEl === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            previouslyFocused?.focus?.()
        }
    }, [open])

    return ref
}
