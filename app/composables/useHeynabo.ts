import type { HouseholdCreate, HouseholdDisplay, InhabitantCreate, InhabitantDisplay, UserDisplay, SystemRole } from '~/composables/useCoreValidation'
import { useCoreValidation } from '~/composables/useCoreValidation'
import { pruneAndCreate, groupBy, chunkArray, type PruneAndCreateResult, type ReconciliationBucket, ReconciliationBucketSchema } from '~/utils/batchUtils'
import { buildResolvedHouseholdMap, type InhabitantPlacement } from '~/composables/useHousehold'
import { isSameDay } from 'date-fns'

const { SystemRoleSchema } = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

export type InhabitantData = Omit<InhabitantCreate, 'householdId'>

// deleteMany/findMany with WHERE IN: D1 caps bound parameters at 100, one per id. Using 90 for safety.
const HEYNABO_ID_BATCH_SIZE = 90

// Curried chunk function for heynaboId arrays (used for batch deletes)
export const chunkHeynaboIds = chunkArray<number>(HEYNABO_ID_BATCH_SIZE)

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

export const isInhabitantDataEqual = (existing: InhabitantDisplay, incoming: InhabitantData): boolean =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl &&
    isSameDayOrBothNull(existing.birthDate, incoming.birthDate)

// Compares Heynabo-owned user fields. TheSlope-owned ALLERGYMANAGER role excluded.
// Existing: UserDisplay (from fetchUsers), Incoming: InhabitantData (from Heynabo)
// Key is inhabitant.heynaboId (stable), not email (can change).
// Note: birthDate is an Inhabitant field, compared in isInhabitantDataEqual, not here.
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
// INHABITANT IMPORT PLAN (ADR-013)
// ========================================================================

const Bucket = ReconciliationBucketSchema.enum
type RoutedMember = { bucket: Exclude<ReconciliationBucket, typeof Bucket.delete>, inhabitant: InhabitantCreate }

const routeMember = (
    member: InhabitantData,
    addressHeynaboId: number,
    resolvedHousehold: HouseholdDisplay,
    placements: Map<number, InhabitantPlacement>
): RoutedMember => {
    const placement = placements.get(member.heynaboId)
    if (!placement) return {bucket: Bucket.create, inhabitant: {...member, householdId: resolvedHousehold.id}}
    if (placement.household.heynaboId !== addressHeynaboId) return {bucket: Bucket.update, inhabitant: {...member, householdId: resolvedHousehold.id}}
    if (!isInhabitantDataEqual(placement.inhabitant, member)) return {bucket: Bucket.update, inhabitant: {...member, householdId: placement.household.id}}
    return {bucket: Bucket.idempotent, inhabitant: {...member, householdId: placement.household.id}}
}

/**
 * The complete inhabitant plan for one Heynabo import.
 *
 * Heynabo is the backend: it owns which members exist and which ADDRESS they live at.
 * Which household at that address holds the inhabitant is TheSlope's decision:
 * - create: member unknown in TheSlope → inserted into the address's resolved household
 * - update: inhabitant found at another address → moved to this address's resolved household
 *   (same row, so orders and allergies follow); or found at this address with changed member
 *   data → updated in the household they are in (placement in the moved-out household survives)
 * - idempotent: found at this address, unchanged
 * - delete: inhabitants Heynabo no longer sends, across ALL households — including the
 *   moved-out household's previous inhabitants
 *
 * Routing covers the addresses TheSlope holds a household for — the import creates
 * households before planning inhabitants.
 */
export const resolveInhabitantImportPlan = (
    incomingHouseholds: HouseholdCreate[],
    existingHouseholds: HouseholdDisplay[]
): PruneAndCreateResult<InhabitantDisplay, InhabitantCreate> => {
    const {resolved, inhabitantPlacements} = buildResolvedHouseholdMap(existingHouseholds)
    const existsInHeynabo = new Set(incomingHouseholds.flatMap(h => h.inhabitants ?? []).map(m => m.heynaboId))

    const routed = incomingHouseholds
        .filter(address => resolved.has(address.heynaboId))
        .flatMap(address => (address.inhabitants ?? []).map(member =>
            routeMember(member, address.heynaboId, resolved.get(address.heynaboId)!, inhabitantPlacements)))
    const byBucket = groupBy<RoutedMember, RoutedMember['bucket']>(r => r.bucket)(routed)
    const bucket = (name: RoutedMember['bucket']) => (byBucket.get(name) ?? []).map(r => r.inhabitant)

    return {
        create: bucket(Bucket.create),
        update: bucket(Bucket.update),
        idempotent: bucket(Bucket.idempotent),
        delete: [...inhabitantPlacements.values()]
            .map(p => p.inhabitant)
            .filter(i => !existsInHeynabo.has(i.heynaboId))
    }
}

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
 * The link to a resident's Heynabo profile, from the Heynabo API address
 * @example
 * // getUserUrl('https://skraaningeni.spaces.heynabo.com/api')(48)
 * // Returns: https://skraaningeni.spaces.heynabo.com/desktop/users/residents/48
 */
export const getUserUrl = (apiUrl: string) => (heynaboId: number): string =>
    apiUrl.replace('/api', `/desktop/users/residents/${heynaboId}`)

/**
 * The link to an event's Heynabo page, from the Heynabo API address
 * @example
 * // getEventUrl('https://skraaningeni.spaces.heynabo.com/api')(123)
 * // Returns: https://skraaningeni.spaces.heynabo.com/desktop/calendar/detail/123/info
 */
export const getEventUrl = (apiUrl: string) => (heynaboEventId: number): string =>
    apiUrl.replace('/api', `/desktop/calendar/detail/${heynaboEventId}/info`)
