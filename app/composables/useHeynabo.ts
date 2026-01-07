import type { HouseholdCreate, HouseholdDisplay, InhabitantCreate, UserDisplay, SystemRole } from '~/composables/useCoreValidation'
import { useCoreValidation } from '~/composables/useCoreValidation'
import { pruneAndCreate } from '~/utils/batchUtils'
import { isSameDay } from 'date-fns'

const { SystemRoleSchema } = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

type InhabitantData = Omit<InhabitantCreate, 'householdId'>

// ========================================================================
// EQUALITY FUNCTIONS - Named for testability (not exported)
// ========================================================================

// Compare nullable dates by day only (ignore time component)
const isSameDayOrBothNull = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (a == null && b == null) return true
    if (a == null || b == null) return false
    return isSameDay(a, b)
}

// Normalize phone: treat empty string as null (Heynabo returns "" for no phone)
const normalizePhone = (phone: string | null | undefined): string | null =>
    phone === '' || phone == null ? null : phone

const isSamePhone = (a: string | null | undefined, b: string | null | undefined): boolean =>
    normalizePhone(a) === normalizePhone(b)

// Verifies Heynabo master data has not changed. TheSlope master data (pbsId) not included.
const isHouseholdEqual = (existing: HouseholdCreate, incoming: HouseholdCreate): boolean =>
    existing.name === incoming.name &&
    existing.address === incoming.address

const isInhabitantEqual = (existing: InhabitantData, incoming: InhabitantData): boolean =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl &&
    isSameDayOrBothNull(existing.birthDate, incoming.birthDate)

// Compares Heynabo-owned user fields. TheSlope-owned ALLERGYMANAGER role excluded.
// Existing: UserDisplay (from fetchUsers), Incoming: InhabitantData (from Heynabo)
// Key is inhabitant.heynaboId (stable), not email (can change).
// Note: birthDate is an Inhabitant field, compared in isInhabitantEqual, not here.
const isUserEqual = (existing: UserDisplay, incoming: InhabitantData): boolean => {
    if (!incoming.user) return false // Incoming has no user, existing does → delete
    const hasAdminRole = (roles: SystemRole[] | undefined) => roles?.includes(SystemRole.ADMIN) ?? false
    return existing.email === incoming.user.email &&
        isSamePhone(existing.phone, incoming.user.phone) &&
        hasAdminRole(existing.systemRoles) === hasAdminRole(incoming.user.systemRoles)
}

// ========================================================================
// RECONCILIATION FUNCTIONS - Heynabo is source of truth (ADR-013)
// Uses pruneAndCreate pattern (ADR-009) for sync operations
// ========================================================================

/**
 * Reconciles households between existing (local) and incoming (Heynabo) data.
 * Heynabo is source of truth - households not in Heynabo will be marked for deletion.
 * Uses heynaboId as the unique key for matching.
 */
export const reconcileHouseholds = pruneAndCreate<HouseholdCreate, HouseholdCreate, number>(
    h => h.heynaboId,
    isHouseholdEqual
)

/**
 * Reconciles inhabitants between existing (local) and incoming (Heynabo) data.
 * Heynabo is source of truth - inhabitants not in Heynabo will be marked for deletion.
 * Uses heynaboId as the unique key for matching.
 */
export const reconcileInhabitants = pruneAndCreate<InhabitantData, InhabitantData, number>(
    i => i.heynaboId,
    isInhabitantEqual
)

/**
 * Reconciles users between existing (UserDisplay from DB) and incoming (InhabitantData from Heynabo).
 * Heynabo is source of truth for email, phone, ADMIN role.
 * TheSlope-owned ALLERGYMANAGER role is preserved during updates.
 * Uses inhabitant.heynaboId as the stable key (email can change).
 */
export const reconcileUsers = pruneAndCreate<UserDisplay, InhabitantData, number>(
    u => u.Inhabitant?.heynaboId ?? 0,
    isUserEqual,
    i => i.heynaboId
)

// ========================================================================
// MERGE FUNCTIONS - Preserve TheSlope-owned fields during UPDATE
// ========================================================================

/**
 * Merges incoming Heynabo household data with existing TheSlope-owned fields.
 * Heynabo-owned: name, address, inhabitants
 * TheSlope-owned (preserved): pbsId, movedInDate, moveOutDate
 */
export const mergeHouseholdForUpdate = (incoming: HouseholdCreate, existing: HouseholdDisplay): HouseholdCreate => ({
    ...incoming,
    pbsId: existing.pbsId,
    movedInDate: existing.movedInDate,
    moveOutDate: existing.moveOutDate
})

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
