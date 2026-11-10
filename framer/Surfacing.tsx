// Artwork "surfacing" from the koi pond portfolio: the piece nearest the middle of the
// screen (or the one under the pointer) comes into focus while the others sit dim and
// blurred under the water, and the lead koi circles whichever piece has surfaced.
// Apply withSurfacing to each artwork frame. It styles the frame's children named
// "Artwork" and "Caption".
import { forwardRef, useEffect, useRef, useState, type ComponentType } from "react"

const SURFACING_BAND = 0.42
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

type PondState = { surfacedElement: HTMLElement | null; pointedElement?: HTMLElement | null }
const pondGlobal = globalThis as unknown as { __koiPondState?: PondState }

type Registry = {
    elements: Set<HTMLElement>
    listeners: Set<() => void>
    scrolled: HTMLElement | null
    pointed: HTMLElement | null
    detach?: () => void
}
const registryGlobal = globalThis as unknown as { __koiSurfacing?: Registry }

function registry(): Registry {
    return (registryGlobal.__koiSurfacing ??= {
        elements: new Set(),
        listeners: new Set(),
        scrolled: null,
        pointed: null,
    })
}

function surfaced(reg: Registry) {
    return reg.pointed ?? reg.scrolled
}

function notify(reg: Registry) {
    const pond = pondGlobal.__koiPondState
    if (pond) {
        pond.surfacedElement = surfaced(reg)
        pond.pointedElement = reg.pointed
    }
    reg.listeners.forEach((listener) => listener())
}

function nearestToCenter(elements: Set<HTMLElement>) {
    const viewportCenter = window.innerHeight / 2
    let nearest: HTMLElement | null = null
    let nearestGap = window.innerHeight * SURFACING_BAND
    for (const element of elements) {
        const rect = element.getBoundingClientRect()
        const gap = Math.abs(rect.top + rect.height / 2 - viewportCenter)
        if (gap < nearestGap) {
            nearestGap = gap
            nearest = element
        }
    }
    return nearest
}

function attach(reg: Registry) {
    if (reg.detach) return
    let frame = 0
    const update = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
            const next = nearestToCenter(reg.elements)
            if (next === reg.scrolled) return
            reg.scrolled = next
            notify(reg)
        })
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    reg.detach = () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("scroll", update)
        window.removeEventListener("resize", update)
        reg.detach = undefined
    }
}

function styleChildren(element: HTMLElement, isSurfaced: boolean, reducedMotion: boolean) {
    const transition = reducedMotion ? "none" : undefined
    const artwork = element.querySelector<HTMLElement>('[data-framer-name="Artwork"]')
    if (artwork) {
        artwork.style.transition = transition ?? `filter 1s ${EASE}, transform 1s ${EASE}`
        artwork.style.filter = isSurfaced ? "none" : "blur(4px) brightness(0.5) saturate(0.5)"
        artwork.style.transform = isSurfaced ? "scale(1)" : "scale(0.97)"
    }
    const caption = element.querySelector<HTMLElement>('[data-framer-name="Caption"]')
    if (caption) {
        caption.style.transition = transition ?? "opacity 0.7s ease"
        caption.style.opacity = isSurfaced ? "1" : "0.35"
    }
}

export function withSurfacing(Component: ComponentType<any>): ComponentType<any> {
    return forwardRef<any, any>(function SurfacingOverride(props, forwardedRef) {
        const { style, onPointerEnter, onPointerLeave, ...rest } = props
        const elementRef = useRef<HTMLElement | null>(null)
        const [, rerender] = useState(0)

        useEffect(() => {
            const element = elementRef.current
            if (!element || typeof window === "undefined") return
            const reg = registry()
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            const listener = () => {
                styleChildren(element, surfaced(reg) === element, reducedMotion)
                rerender((count) => count + 1)
            }
            reg.elements.add(element)
            reg.listeners.add(listener)
            attach(reg)
            listener()
            window.dispatchEvent(new Event("scroll"))
            return () => {
                reg.elements.delete(element)
                reg.listeners.delete(listener)
                if (reg.scrolled === element) reg.scrolled = null
                if (reg.pointed === element) reg.pointed = null
                if (reg.elements.size === 0) reg.detach?.()
            }
        }, [])

        const setRef = (node: HTMLElement | null) => {
            elementRef.current = node
            if (typeof forwardedRef === "function") forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
        }

        return (
            <Component
                {...rest}
                ref={setRef}
                style={{ ...style }}
                onPointerEnter={(event: PointerEvent) => {
                    const reg = registry()
                    reg.pointed = elementRef.current
                    notify(reg)
                    onPointerEnter?.(event)
                }}
                onPointerLeave={(event: PointerEvent) => {
                    const reg = registry()
                    if (reg.pointed === elementRef.current) reg.pointed = null
                    notify(reg)
                    onPointerLeave?.(event)
                }}
            />
        )
    })
}
