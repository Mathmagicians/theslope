import {z} from 'zod'
import {
    SystemRoleSchema,
    RoleSchema as _RoleSchema,
    TicketTypeSchema,
    DinnerModeSchema,
    DinnerStateSchema,
    OrderStateSchema,
    NotificationChannelSchema,
    LedgerEntryTypeSchema
} from '~~/prisma/generated/zod'
import {AppearanceSchema, DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS} from '~/composables/useUserPreferenceValidation'

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
 * Positive integer ID - single source of truth for entity ids (ADR-001), re-exported by useCoreValidation.
 * Use IdSchema for required ids, IdSchema.nullable() for FK fields.
 */
export const IdSchema = z.number().int().positive()

/**
 * User Fragment - Authentication, system access and own settings
 * Used by: useCoreValidation, useBookingValidation (bookedByUser)
 *
 * notificationChannels and appearance carry the column defaults, so application code reads
 * `user.appearance.palette` without a fallback (ADR-010: the repository holds the JSON strings).
 */
export const UserFragmentSchema = z.object({
    id: IdSchema,
    email: z.email(),
    phone: z.string().nullable().optional(),
    systemRoles: z.array(SystemRoleSchema).default([]),
    notificationChannels: z.array(NotificationChannelSchema).default(DEFAULT_NOTIFICATION_CHANNELS),
    appearance: AppearanceSchema.default(DEFAULT_APPEARANCE)
})

/**
 * Inhabitant Fragment - Person living in household
 * Used by: useCoreValidation, useHealthValidation, useBookingValidation, usePlanningValidation
 */
export const InhabitantFragmentSchema = z.object({
    id: IdSchema,
    heynaboId: IdSchema,
    userId: IdSchema.nullable().optional(),
    householdId: IdSchema,
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
    id: IdSchema,
    heynaboId: IdSchema,
    pbsId: IdSchema,
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
    id: IdSchema,
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
    id: IdSchema,
    seasonId: IdSchema,
    name: z.string()
})

/**
 * DinnerEvent Fragment - Scheduled dinner
 * Used by: useBookingValidation, usePlanningValidation, useHealthValidation
 */
export const DinnerEventFragmentSchema = z.object({
    id: IdSchema,
    date: z.coerce.date(),
    menuTitle: z.string().max(500),
    menuDescription: z.string().nullable(),
    menuPictureUrl: z.string().nullable(),
    state: DinnerStateSchema,
    totalCost: z.number().int().min(0),
    chefId: IdSchema.nullable(),
    cookingTeamId: IdSchema.nullable(),
    heynaboEventId: IdSchema.nullable(),
    seasonId: IdSchema.nullable(),
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
    id: IdSchema,
    dinnerEventId: IdSchema,
    inhabitantId: IdSchema,
    bookedByUserId: IdSchema.nullable(),
    ticketPriceId: IdSchema,
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
    id: IdSchema,
    seasonId: IdSchema,
    ticketType: TicketTypeSchema,
    price: z.number().int(),
    description: z.string().nullable(),
    maximumAgeLimit: z.number().int().nullable()
})

// ============================================================================
// LEDGER DOMAIN FRAGMENTS
// ============================================================================

/**
 * Payer Snapshot - the user who reported a ledger row, as they were when it was written; outlives the user row.
 * The id is null only on the rows the roster migration mapped from the legacy dinner cost column (email SYSTEM).
 * Used by: useBillingValidation (Expense)
 */
export const PayerSnapshotSchema = z.object({
    id: z.number().int().nullable(),
    email: z.string(),
    // The name the card writes for people (formatNameWithInitials); absent on the rows the migration mapped
    name: z.string().optional()
})

/**
 * Expense Fragment - a cost paid from the kitchen's money; a REGULAR row belongs to a dinner, an ADHOC row to the pool
 * Used by: useBillingValidation (the ledger home), useBookingValidation (DinnerEventDetail.expenses)
 * The two transforms live beside the fragment so both composables share them without importing each other (ADR-010)
 */
export const ExpenseFragmentSchema = z.object({
    id: IdSchema,
    type: LedgerEntryTypeSchema,
    dinnerEventId: IdSchema.nullable(),
    // The reporting user; SetNull once their user row is gone, the snapshot keeps them
    paidByUserId: IdSchema.nullable(),
    paidBy: PayerSnapshotSchema,
    amount: z.number().int(),
    description: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
})

export const SerializedExpenseFragmentSchema = ExpenseFragmentSchema.omit({paidBy: true}).extend({
    userSnapshot: z.string()
})

// The payer snapshot is a JSON column; a create shape serializes the same way as a full row
export const serializeExpense = <T extends {paidBy: z.infer<typeof PayerSnapshotSchema>}>({paidBy, ...row}: T): Omit<T, 'paidBy'> & {userSnapshot: string} =>
    ({...row, userSnapshot: JSON.stringify(paidBy)})

export const deserializeExpense = (row: Record<string, unknown>): z.infer<typeof ExpenseFragmentSchema> => {
    const {userSnapshot, ...rest} = row
    return ExpenseFragmentSchema.parse({...rest, paidBy: PayerSnapshotSchema.parse(JSON.parse(String(userSnapshot)))})
}

// ============================================================================
// HEALTH DOMAIN FRAGMENTS
// ============================================================================

/**
 * AllergyType Fragment - Catalog of allergens
 * Used by: useAllergyValidation (AllergyTypeDisplay), useCoreValidation (via the Allergy fragment)
 */
export const AllergyTypeFragmentSchema = z.object({
    id: IdSchema,
    name: z.string(),
    description: z.string(),
    icon: z.string().nullable().optional()
})

/**
 * Allergy Fragment - An inhabitant's allergy with its type, as an `allergies.include.allergyType` read loads it
 * Used by: useAllergyValidation (AllergyDisplay), useCoreValidation (HouseholdDetail inhabitants)
 */
export const AllergyFragmentSchema = z.object({
    id: IdSchema,
    inhabitantId: IdSchema,
    allergyTypeId: IdSchema,
    inhabitantComment: z.string().nullable().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    allergyType: AllergyTypeFragmentSchema
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
export type AllergyFragment = z.infer<typeof AllergyFragmentSchema>
export type PayerSnapshot = z.infer<typeof PayerSnapshotSchema>
export type ExpenseFragment = z.infer<typeof ExpenseFragmentSchema>
export type SerializedExpenseFragment = z.infer<typeof SerializedExpenseFragmentSchema>