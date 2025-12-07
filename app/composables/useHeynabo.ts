import type { HouseholdCreate, InhabitantCreate } from './useCoreValidation'
import { pruneAndCreate } from '~/utils/batchUtils'

// ========================================================================
// EQUALITY FUNCTIONS - Named for testability (not exported)
// ========================================================================

const isHouseholdEqual = (existing: HouseholdCreate, incoming: HouseholdCreate): boolean =>
    existing.name === incoming.name &&
    existing.address === incoming.address &&
    existing.pbsId === incoming.pbsId

const isInhabitantEqual = (
    existing: Omit<InhabitantCreate, 'householdId'>,
    incoming: Omit<InhabitantCreate, 'householdId'>
): boolean =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl

// ========================================================================
// RECONCILIATION FUNCTIONS - Heynabo is source of truth (ADR-013)
// Uses pruneAndCreate pattern (ADR-009) for sync operations
// ========================================================================

/**
 * Reconciles households between existing (local) and incoming (Heynabo) data.
 * Heynabo is source of truth - households not in Heynabo will be marked for deletion.
 * Uses heynaboId as the unique key for matching.
 */
export const reconcileHouseholds = pruneAndCreate<HouseholdCreate, number>(
    h => h.heynaboId,
    isHouseholdEqual
)

/**
 * Reconciles inhabitants between existing (local) and incoming (Heynabo) data.
 * Heynabo is source of truth - inhabitants not in Heynabo will be marked for deletion.
 * Uses heynaboId as the unique key for matching.
 */
export const reconcileInhabitants = pruneAndCreate<Omit<InhabitantCreate, 'householdId'>, number>(
    i => i.heynaboId,
    isInhabitantEqual
)

/**
 * Heynabo Integration Composable
 *
 * Provides utilities for integrating with the Heynabo platform:
 * - User profile links
 * - Event creation (future)
 * - Message posting (future)
 */

export function useHeynabo() {
    const config = useRuntimeConfig()

    /**
     * Construct URL to a Heynabo user profile
     * @param heynaboId - The Heynabo user ID
     * @returns Full URL to user profile in Heynabo, or null if no ID provided
     * @example
     * // Input: heynaboId = 48
     * // API URL: https://skraaningeni.spaces.heynabo.com/api
     * // Returns: https://skraaningeni.spaces.heynabo.com/desktop/users/residents/48
     */
    const getUserUrl = (heynaboId: number): string  => {
        const apiUrl = config.public.HEY_NABO_API
        return apiUrl.replace('/api', `/desktop/users/residents/${heynaboId}`)
    }

    /**
     * Construct URL to a Heynabo event page
     * @param heynaboEventId - The Heynabo event ID
     * @returns Full URL to event page in Heynabo
     * @example
     * // Input: heynaboEventId = 123
     * // API URL: https://skraaningeni.spaces.heynabo.com/api
     * // Returns: https://skraaningeni.spaces.heynabo.com/desktop/calendar/detail/123/info
     */
    const getEventUrl = (heynaboEventId: number): string => {
        const apiUrl = config.public.HEY_NABO_API
        return apiUrl.replace('/api', `/desktop/calendar/detail/${heynaboEventId}/info`)
    }

    return {
        getUserUrl,
        getEventUrl
    }
}
