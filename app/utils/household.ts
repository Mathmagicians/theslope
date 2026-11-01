import type {RouteLocation, RouteLocationRaw} from 'vue-router'

/** The tabs of a household's page, each its URL's last segment */
export const HOUSEHOLD_TAB = {
    bookings: 'bookings',
    members: 'members',
    allergies: 'allergies',
    economy: 'economy',
    settings: 'settings'
} as const
export type HouseholdTab = typeof HOUSEHOLD_TAB[keyof typeof HOUSEHOLD_TAB]

/**
 * Build a household URL with PBS disambiguation query parameter.
 *
 * Phase 2 of the move-out-date feature: when shortName is no longer unique
 * (Phase 3 drops @unique on heynaboId), URLs need ?pbs=X to resolve unambiguously.
 * Old URLs without ?pbs still work via single-match fallback in the store.
 *
 * @param shortName - Household shortName (used as path segment)
 * @param pbsId - Stable unique household identifier (always unique)
 * @param tab - Optional tab of HOUSEHOLD_TAB
 * @returns URL string like /household/S_31/bookings?pbs=12345
 */
export const getHouseholdUrl = (shortName: string, pbsId: number, tab?: HouseholdTab): string => {
    const encoded = encodeURIComponent(shortName)
    const path = tab ? `/household/${encoded}/${tab}` : `/household/${encoded}`
    return `${path}?pbs=${pbsId}`
}

/**
 * A household's page without a tab opens its bookings with the whole query. As the page's route redirect it replaces
 * the URL the page was asked by; the path stays as the router encoded it
 */
export const householdBookingsRedirect = (to: RouteLocation): RouteLocationRaw =>
    ({path: `${to.path.replace(/\/$/, '')}/${HOUSEHOLD_TAB.bookings}`, query: to.query})
