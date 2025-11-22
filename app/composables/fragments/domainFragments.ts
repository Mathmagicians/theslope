import {z} from 'zod'
import {
    SystemRoleSchema,
    RoleSchema,
    TicketTypeSchema,
    DinnerModeSchema,
    DinnerStateSchema,
    OrderStateSchema
} from '~~/prisma/generated/zod'

/**
 * Domain Fragments - Minimal entity schemas for cross-domain reuse
 *
 * Purpose: Break circular dependencies between validation composables
 * Pattern: Each domain composable imports fragments and extends with domain-specific fields
 *
 * ADR-001 Compliance:
 * - Single source of truth for core scalar fields
 * - Fragments contain DOMAIN types (Date objects, parsed arrays)
 * - Serialization/deserialization happens in domain composables
 *
 * Guidelines:
 * - Include ONLY scalar fields (no relations)
 * - Use domain types (Date, not string)
 * - No serialization logic here
 * - Minimal fields needed across multiple domains
 */

// ============================================================================
// CORE DOMAIN FRAGMENTS
// ============================================================================

/**
 * User Fragment - Authentication and system access
 * Used by: useCoreValidation, useBookingValidation (bookedByUser)
 */
export const UserFragmentSchema = z.object({
    id: z.number().int().positive(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    systemRoles: z.array(SystemRoleSchema).default([])
})

/**
 * Inhabitant Fragment - Person living in household
 * Used by: useCoreValidation, useHealthValidation, useBookingValidation, usePlanningValidation
 */
export const InhabitantFragmentSchema = z.object({
    id: z.number().int().positive(),
    heynaboId: z.number().int().positive(),
    userId: z.number().int().positive().nullable().optional(),
    householdId: z.number().int().positive(),
    name: z.string(),
    lastName: z.string(),
    pictureUrl: z.string().nullable().optional(),
    birthDate: z.coerce.date().nullable().optional()
})

/**
 * Household Fragment - Living unit
 * Used by: useCoreValidation, useFinancialValidation
 */
export const HouseholdFragmentSchema = z.object({
    id: z.number().int().positive(),
    heynaboId: z.number().int().positive(),
    pbsId: z.number().int().positive(),
    name: z.string(),
    address: z.string(),
    movedInDate: z.coerce.date(),
    moveOutDate: z.coerce.date().nullable().optional()
})

// ============================================================================
// PLANNING DOMAIN FRAGMENTS
// ============================================================================

/**
 * Season Fragment - Cooking season configuration
 * Used by: usePlanningValidation, useBookingValidation
 */
export const SeasonFragmentSchema = z.object({
    id: z.number().int().positive(),
    shortName: z.string().min(4),
    isActive: z.boolean(),
    ticketIsCancellableDaysBefore: z.number().min(0).max(31),
    diningModeIsEditableMinutesBefore: z.number().min(0).max(1440),
    consecutiveCookingDays: z.number().int().min(1).max(7).default(1)
})

/**
 * CookingTeam Fragment - Team basic info
 * Used by: usePlanningValidation, useBookingValidation
 */
export const CookingTeamFragmentSchema = z.object({
    id: z.number().int().positive(),
    seasonId: z.number().int().positive(),
    name: z.string()
})

/**
 * DinnerEvent Fragment - Scheduled dinner
 * Used by: useBookingValidation, usePlanningValidation, useHealthValidation
 */
export const DinnerEventFragmentSchema = z.object({
    id: z.number().int().positive(),
    date: z.coerce.date(),
    menuTitle: z.string().max(500),
    menuDescription: z.string().nullable(),
    menuPictureUrl: z.string().nullable(),
    state: DinnerStateSchema,
    totalCost: z.number().int().min(0),
    chefId: z.number().int().positive().nullable(),
    cookingTeamId: z.number().int().positive().nullable(),
    heynaboEventId: z.number().int().positive().nullable(),
    seasonId: z.number().int().positive().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
})

// ============================================================================
// BOOKING DOMAIN FRAGMENTS
// ============================================================================

/**
 * Order Fragment - Dinner booking/ticket
 * Used by: useBookingValidation, useFinancialValidation
 */
export const OrderFragmentSchema = z.object({
    id: z.number().int().positive(),
    dinnerEventId: z.number().int().positive(),
    inhabitantId: z.number().int().positive(),
    bookedByUserId: z.number().int().positive().nullable(),
    ticketPriceId: z.number().int().positive(),
    priceAtBooking: z.number().int(),
    dinnerMode: DinnerModeSchema,
    state: OrderStateSchema,
    releasedAt: z.coerce.date().nullable(),
    closedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
})

/**
 * TicketPrice Fragment - Pricing configuration
 * Used by: useBookingValidation, usePlanningValidation
 */
export const TicketPriceFragmentSchema = z.object({
    id: z.number().int().positive(),
    seasonId: z.number().int().positive(),
    ticketType: TicketTypeSchema,
    price: z.number().int(),
    description: z.string().nullable(),
    maximumAgeLimit: z.number().int().nullable()
})

// ============================================================================
// HEALTH DOMAIN FRAGMENTS
// ============================================================================

/**
 * AllergyType Fragment - Catalog of allergens
 * Used by: useHealthValidation, useBookingValidation
 */
export const AllergyTypeFragmentSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string(),
    icon: z.string().nullable().optional()
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserFragment = z.infer<typeof UserFragmentSchema>
export type InhabitantFragment = z.infer<typeof InhabitantFragmentSchema>
export type HouseholdFragment = z.infer<typeof HouseholdFragmentSchema>
export type SeasonFragment = z.infer<typeof SeasonFragmentSchema>
export type CookingTeamFragment = z.infer<typeof CookingTeamFragmentSchema>
export type DinnerEventFragment = z.infer<typeof DinnerEventFragmentSchema>
export type OrderFragment = z.infer<typeof OrderFragmentSchema>
export type TicketPriceFragment = z.infer<typeof TicketPriceFragmentSchema>
export type AllergyTypeFragment = z.infer<typeof AllergyTypeFragmentSchema>