/**
 * Build a household URL with PBS disambiguation query parameter.
 *
 * Phase 2 of the move-out-date feature: when shortName is no longer unique
 * (Phase 3 drops @unique on heynaboId), URLs need ?pbs=X to resolve unambiguously.
 * Old URLs without ?pbs still work via single-match fallback in the store.
 *
 * @param shortName - Household shortName (used as path segment)
 * @param pbsId - Stable unique household identifier (always unique)
 * @param tab - Optional tab name (bookings, members, allergies, economy, settings)
 * @returns URL string like /household/S_31/bookings?pbs=12345
 */
export const getHouseholdUrl = (shortName: string, pbsId: number, tab?: string): string => {
    const encoded = encodeURIComponent(shortName)
    const path = tab ? `/household/${encoded}/${tab}` : `/household/${encoded}`
    return `${path}?pbs=${pbsId}`
}
