import {isSameMinute} from 'date-fns'

/**
 * Pure UI composable (ADR-017): client-only, never imported from server/.
 * The page's now: the server's render time on the first render, carried to the browser in the payload, so the browser
 * hydrates the countdowns the server rendered (ADR-007 compliance 10). The first read in the browser starts one interval
 * per app once the app has hydrated; a tick during hydration would render a later minute than the server did. The
 * interval checks every CLOCK_TICK_MS and writes the clock only when the minute turns, the countdowns' smallest unit, so
 * its readers re-render once a minute. Functions that read the time take its value as their `now`.
 */

/** useState key the server render seeds and the interval ticks */
export const CLOCK_STATE = 'clock-now'
export const CLOCK_TICK_MS = 1000

export const useClock = (): Readonly<Ref<Date>> => {
    const now = useState<Date>(CLOCK_STATE, () => new Date())
    const nuxtApp = useNuxtApp()
    if (import.meta.client && !nuxtApp._clockStarted) {
        nuxtApp._clockStarted = true
        onNuxtReady(() => setInterval(() => {
            const next = new Date()
            if (!isSameMinute(next, now.value)) now.value = next
        }, CLOCK_TICK_MS))
    }
    return readonly(now)
}
