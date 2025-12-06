import {z} from 'zod'
import {SystemRoleSchema, DinnerModeSchema} from '~~/prisma/generated/zod'
import {UserFragmentSchema, InhabitantFragmentSchema, HouseholdFragmentSchema} from '~/composables/fragments/domainFragments'
import {useWeekDayMapValidation} from './useWeekDayMapValidation'

/**
 * Core Domain Validation - User, Inhabitant, Household
 *
 * Merges useUserValidation + useHouseholdValidation using fragment pattern
 * to eliminate circular dependencies (ADR-001)
 *
 * Fragment Pattern:
 * - Import minimal fragments from domainFragments.ts
 * - Extend fragments with domain-specific fields
 * - No duplication, no circular dependencies
 */

// Re-export SystemRole type
export type SystemRole = z.infer<typeof SystemRoleSchema>

/**
 * Generate shortName from household address
 * Business rule: First letter of each word (uppercase) + underscore + numeric/alphanumeric suffix
 *
 * Examples:
 * - "Skråningen 31" → "S_31"
 * - "Tvethøjvej 43, 1" → "T_43_1"
 * - "Abbey Road 1 th." → "AR_1_th"
 * - Penny Lane 4, 1 4-> "PL_4_1_4"
 */
export const getHouseholdShortName = (address: string): string => {
    const normalizedDots = address.trim().replace(/\.(?=[\da-zA-Z])/g, ' ')
    const words = normalizedDots.split(/\s+/)

    // Separate text words from numeric/alphanumeric suffix
    const textWords: string[] = []
    const numericParts: string[] = []

    let foundFirstNumber = false

    for (const word of words) {
        // Remove punctuation but keep Unicode letters, digits, and underscores
        // \p{L} = any Unicode letter (including Ø, å, etc.)
        // \p{N} = any Unicode number
        const cleaned = word.replace(/[^\p{L}\p{N}_]/gu, '')

        // If word starts with a digit, it's part of the numeric section
        if (/^\d/.test(cleaned)) {
            foundFirstNumber = true
            numericParts.push(cleaned)
        } else if (foundFirstNumber) {
            // After numbers started, any text is part of numeric section (like "th", "st")
            numericParts.push(cleaned)
        } else {
            // Before numbers, it's a text word
            textWords.push(cleaned)
        }
    }

    // Get first letter of each text word (uppercase)
    const letters = textWords.map(word => word[0]?.toUpperCase() || '').join('')

    return [letters,  ...numericParts].filter( p => p.length >0 ).join('_')
}

export const useCoreValidation = () => {
    // Get WeekDayMap schema for dinnerPreferences
    const DinnerMode = DinnerModeSchema.enum
    const {
        WeekDayMapSchemaOptional,
        serializeWeekDayMap,
        deserializeWeekDayMap,
        createWeekDayMapFromSelection,
        createDefaultWeekdayMap,
        maskWeekDayMap
    } = useWeekDayMapValidation({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })

    // ========================================================================
    // USER SCHEMAS - Extend UserFragment with domain-specific fields
    // ========================================================================

    // Email validation accepts two formats:
    // 1. Standard: user@domain.com
    // 2. RFC 5322 with display name: Display Name <user@domain.com>
    const emailSchema = z.union([
        z.string().email(),
        z.string().regex(/^.+\s+<.+@.+\..+>$/)
    ]).transform((val) => {
        // Normalize to standard format by extracting email from angle brackets
        const match = val.match(/<(.+)>/)
        return match ? match[1] : val
    }).pipe(z.string().email())

    // Domain schema - systemRoles as array
    const BaseUserSchema = UserFragmentSchema.extend({
        email: emailSchema,
        phone: z.union([
            z.string().regex(/^\+?[\d\s]+$/, 'Telefonnummer må kun indeholde tal, mellemrum og eventuelt et plus-tegn i starten'),
            z.literal(''),
            z.null()
        ])
            .optional()
            .transform(val => val === '' ? null : val), // Convert empty string to null
        passwordHash: z.string().default('caramba'),
        createdAt: z.coerce.date().optional(),
        updatedAt: z.coerce.date().optional()
    })

    // Serialized schema for database INPUT (create/update operations)
    // Omit auto-generated fields (id, createdAt, updatedAt managed by Prisma)
    const SerializedUserInputSchema = BaseUserSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    }).extend({
        systemRoles: z.string().default('[]') // JSON stringified array
    })

    // Serialized schema for database OUTPUT (read operations)
    // Matches Prisma User model - id, createdAt, updatedAt are always present
    const SerializedUserSchema = SerializedUserInputSchema.extend({
        id: z.number().int().positive(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    // User schema for creation (API input validation)
    const UserCreateSchema = BaseUserSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    })

    // User schema for updates
    const UserUpdateSchema = BaseUserSchema.partial().extend({
        id: z.number().int().positive() // ID is required for updates
    })

    // User schema for API responses
    const UserResponseSchema = BaseUserSchema.required({
        id: true,
        email: true,
        systemRoles: true
    })

    // ========================================================================
    // INHABITANT SCHEMAS - Extend InhabitantFragment with domain-specific fields
    // ========================================================================

    // Base Inhabitant schema for API operations (extends fragment)
    const BaseInhabitantSchema = InhabitantFragmentSchema.extend({
        // Override with more specific validation
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        lastName: z.string().min(1, "Efternavn skal være mindst 1 karakter").max(100, "Efternavn må ikke være længere end 100 karakterer"),
        pictureUrl: z.string().url().optional().nullable(),
        // Add domain-specific field
        dinnerPreferences: WeekDayMapSchemaOptional.optional().nullable()
    })

    // Inhabitant schemas
    const InhabitantCreateSchema = BaseInhabitantSchema.omit({
        id: true
    }).extend({
        user: UserCreateSchema.optional()
    })

    const InhabitantUpdateSchema = BaseInhabitantSchema.partial().extend({
        id: z.number().int().positive()
    })

    // ADR-009: Detail schema for GET/:id + mutations
    const InhabitantDetailSchema = BaseInhabitantSchema.required({
        id: true,
        heynaboId: true,
        householdId: true,
        name: true,
        lastName: true,
        dinnerPreferences: true
    })

    // Minimal inhabitant info for frontend display (team assignments, etc.)
    // Reuses fragment + adds dinnerPreferences
    const InhabitantDisplaySchema = InhabitantFragmentSchema.extend({
        dinnerPreferences: WeekDayMapSchemaOptional.optional().nullable()
    })

    // User display with nested inhabitant (no circular dependency!)
    // householdId kept for UserListItem compatibility (displays inhabitants from user context)
    const UserDisplaySchema = BaseUserSchema.omit({
        passwordHash: true
    }).extend({
        id: z.number().int().positive(), // Make id required
        Inhabitant: InhabitantDisplaySchema.extend({
            userId: z.number().int().positive().nullable().optional()
        }).nullable().optional()
    })

    // Login schema for authentication
    const LoginSchema = z.object({
        email: z.string().email('Indtast den mail, du er registreret med i Heynabo'),
        password: z.string().nonempty('Indtast din Heynabo adgangskode')
    })

    // ========================================================================
    // HOUSEHOLD SCHEMAS - Extend HouseholdFragment with domain-specific fields
    // ========================================================================

    // Base Household schema with field-level validation
    const BaseHouseholdSchema = HouseholdFragmentSchema.extend({
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        address: z.string().min(1, "Adresse skal være mindst 1 karakter").max(200, "Adresse må ikke være længere end 200 karakterer"),
        shortName: z.string().min(1).optional() // Computed server-side from address via getHouseholdShortName()
    })

    // Household schemas
    // ADR-009: Create includes optional inhabitants (lightweight relation, repository handles householdId)
    const HouseholdCreateSchema = BaseHouseholdSchema.omit({ id: true }).extend({
        inhabitants: z.array(InhabitantCreateSchema.omit({ householdId: true })).optional()
    })

    const HouseholdUpdateSchema = BaseHouseholdSchema.partial().extend({
        id: z.number().int().positive()
    })

    const HouseholdResponseSchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true
    })

    // ADR-009: Index endpoint - full household scalars + lightweight inhabitant relation
    const HouseholdDisplaySchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true
    }).extend({
        shortName: z.string().min(1), // Required computed field
        inhabitants: z.array(InhabitantDisplaySchema) // Lightweight relation
    })

    // ADR-009: Detail endpoint - full household with complete inhabitant data
    const HouseholdDetailSchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true,
        shortName: true
    }).extend({
        inhabitants: z.array(InhabitantDetailSchema)
    })

    // ADR-009: User with nested Inhabitant and Household (essential context for auth)
    const UserWithInhabitantSchema = UserDisplaySchema.extend({
        Inhabitant: InhabitantDisplaySchema.extend({
            userId: z.number().int().positive().nullable().optional(),
            householdId: z.number().int().positive(),
            household: BaseHouseholdSchema.required({
                id: true,
                heynaboId: true,
                pbsId: true,
                movedInDate: true,
                name: true,
                address: true,
                shortName: true
            })
        }).nullable()
    })

    // ========================================================================
    // TYPE DEFINITIONS (ADR-009: Display vs Detail pattern)
    // ========================================================================

    // USER TYPES
    // Display: Minimal user info for lists (allergy managers, etc.)
    type _UserDisplay = z.infer<typeof UserDisplaySchema>
    // Detail: Full user with nested inhabitant & household (auth context)
    type _UserDetail = z.infer<typeof UserWithInhabitantSchema>
    // Mutations: Create/update operations
    type UserCreate = z.infer<typeof UserCreateSchema>
    type _UserUpdate = z.infer<typeof UserUpdateSchema>
    // Auth
    type _LoginCredentials = z.infer<typeof LoginSchema>

    // INHABITANT TYPES
    // Display: Minimal inhabitant info for lists (team assignments, bookings)
    type InhabitantDisplay = z.infer<typeof InhabitantDisplaySchema>
    // Detail: Full inhabitant data for GET/:id and mutations (ADR-009)
    type _InhabitantDetail = z.infer<typeof InhabitantDetailSchema>
    // Mutations: Create/update operations
    type _InhabitantCreate = z.infer<typeof InhabitantCreateSchema>
    type _InhabitantUpdate = z.infer<typeof InhabitantUpdateSchema>

    // HOUSEHOLD TYPES
    // Display: Household summary for lists (index endpoint)
    type _HouseholdDisplay = z.infer<typeof HouseholdDisplaySchema>
    // Detail: Full household with inhabitants (detail endpoint)
    type _HouseholdDetail = z.infer<typeof HouseholdDetailSchema>
    // Mutations: Create/update operations
    type _HouseholdCreate = z.infer<typeof HouseholdCreateSchema>
    type _HouseholdUpdate = z.infer<typeof HouseholdUpdateSchema>

    // Internal types (not exported)
    type User = z.infer<typeof BaseUserSchema>
    type SerializedUserInput = z.infer<typeof SerializedUserInputSchema>
    type SerializedUser = z.infer<typeof SerializedUserSchema>
    type _Inhabitant = z.infer<typeof BaseInhabitantSchema>
    type _Household = z.infer<typeof BaseHouseholdSchema>

    // ========================================================================
    // SERIALIZATION FUNCTIONS (ADR-010)
    // ========================================================================

    /**
     * Serialize user for database input (create/update)
     * Converts domain UserCreate to database format (JSON stringified systemRoles)
     * Uses schema validation to strip unwanted fields (defensive programming)
     */
    const serializeUserInput = (user: UserCreate): SerializedUserInput => {
        return SerializedUserInputSchema.parse({
            email: user.email,
            phone: user.phone ?? null,
            passwordHash: user.passwordHash,
            systemRoles: JSON.stringify(user.systemRoles)
        })
    }

    /**
     * Deserialize user from database output (read)
     * Converts database format to domain User (parsed systemRoles array)
     */
    const deserializeUser = (serialized: SerializedUser): User => {
        return {
            ...serialized,
            systemRoles: JSON.parse(serialized.systemRoles)
        }
    }

    /**
     * ADR-010: Deserialize InhabitantDisplay from database format to domain format
     * Converts JSON string dinnerPreferences to WeekDayMap and dates to Date objects
     * Display = lightweight bounded context for lists (ADR-009)
     */
    const deserializeInhabitantDisplay = (serialized: Record<string, unknown>): InhabitantDisplay => {
        const deserialized = {
            ...serialized,
            birthDate: serialized.birthDate ? new Date(serialized.birthDate as string | number | Date) : null,
            dinnerPreferences: serialized.dinnerPreferences
                ? deserializeWeekDayMap(serialized.dinnerPreferences as string)
                : null
        }
        return InhabitantDisplaySchema.parse(deserialized)
    }

    /**
     * ADR-010: Deserialize InhabitantDetail from database format to domain format
     * Detail = full relations for GET/:id and mutations (ADR-009)
     */
    const deserializeInhabitantDetail = (serialized: Record<string, unknown>): z.infer<typeof InhabitantDetailSchema> => {
        const deserialized = {
            ...serialized,
            birthDate: serialized.birthDate ? new Date(serialized.birthDate as string | number | Date) : null,
            dinnerPreferences: serialized.dinnerPreferences
                ? deserializeWeekDayMap(serialized.dinnerPreferences as string)
                : null
        }
        return InhabitantDetailSchema.parse(deserialized)
    }

    /**
     * Deserialize UserWithInhabitant from database output
     * Handles nested inhabitant with household and computes household.shortName
     */
    const deserializeUserWithInhabitant = (serializedUser: Record<string, unknown>): z.infer<typeof UserWithInhabitantSchema> => {
        const inhabitant = serializedUser.Inhabitant as Record<string, unknown> | null
        const household = inhabitant?.household as Record<string, unknown> | null

        return UserWithInhabitantSchema.parse({
            ...serializedUser,
            systemRoles: JSON.parse(serializedUser.systemRoles as string),
            Inhabitant: inhabitant ? {
                ...deserializeInhabitantDisplay(inhabitant),
                household: household ? {
                    ...household,
                    shortName: getHouseholdShortName(household.address as string)
                } : household
            } : null
        })
    }

    const deserializeHouseholdDisplay = (serialized: Record<string, unknown>): z.infer<typeof HouseholdDisplaySchema> => {
        const inhabitants = serialized.inhabitants as Record<string, unknown>[] | undefined
        const deserialized = {
            ...serialized,
            movedInDate: new Date(serialized.movedInDate as string),
            moveOutDate: serialized.moveOutDate ? new Date(serialized.moveOutDate as string) : null,
            shortName: getHouseholdShortName(serialized.address as string),
            inhabitants: inhabitants?.map((inhabitant) => ({
                ...inhabitant,
                birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate as string) : null,
                dinnerPreferences: inhabitant.dinnerPreferences
                    ? deserializeWeekDayMap(inhabitant.dinnerPreferences as string)
                    : null
            }))
        }
        return HouseholdDisplaySchema.parse(deserialized)
    }

    const deserializeHouseholdDetail = (serialized: Record<string, unknown>): z.infer<typeof HouseholdDetailSchema> => {
        const inhabitants = serialized.inhabitants as Record<string, unknown>[] | undefined
        const deserialized = {
            ...serialized,
            movedInDate: new Date(serialized.movedInDate as string),
            moveOutDate: serialized.moveOutDate ? new Date(serialized.moveOutDate as string) : null,
            shortName: getHouseholdShortName(serialized.address as string),
            inhabitants: inhabitants?.map((inhabitant) => deserializeInhabitantDisplay(inhabitant))
        }
        return HouseholdDetailSchema.parse(deserialized)
    }

    /**
     * Merge new user data with existing user, preserving and combining systemRoles
     * Used during Heynabo import to prevent overwriting manually assigned roles
     */
    const mergeUserRoles = (existing: User, incoming: UserCreate): UserCreate => {
        // Merge roles: union of existing + new (no duplicates)
        const mergedRoles = Array.from(new Set([...existing.systemRoles, ...incoming.systemRoles]))

        return {
            ...incoming,
            systemRoles: mergedRoles
        }
    }

    return {
        // Schemas - User
        SystemRoleSchema,
        BaseUserSchema,
        SerializedUserInputSchema,
        SerializedUserSchema,
        UserCreateSchema,
        UserUpdateSchema,
        UserResponseSchema,
        UserDisplaySchema,
        UserWithInhabitantSchema,
        LoginSchema,
        // Schemas - Inhabitant
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantUpdateSchema,
        InhabitantDisplaySchema,
        InhabitantDetailSchema,
        // Schemas - Household
        BaseHouseholdSchema,
        HouseholdCreateSchema,
        HouseholdUpdateSchema,
        HouseholdResponseSchema,
        HouseholdDisplaySchema,
        HouseholdDetailSchema,
        // Functions - User
        serializeUserInput,
        deserializeUser,
        deserializeUserWithInhabitant,
        mergeUserRoles,
        // Functions - Inhabitant
        deserializeInhabitantDisplay,
        deserializeInhabitantDetail,
        // Functions - Household
        deserializeHouseholdDisplay,
        deserializeHouseholdDetail,
        // Functions - WeekDayMap
        serializeWeekDayMap,
        deserializeWeekDayMap,
        createDefaultWeekdayMap,
        createWeekDayMapFromSelection,
        maskWeekDayMap
    }
}

// ============================================================================
// PUBLIC TYPE EXPORTS (ADR-009: Display vs Detail pattern)
// ============================================================================

// USER TYPES
// Display: Minimal user info for lists
export type UserDisplay = z.infer<ReturnType<typeof useCoreValidation>['UserDisplaySchema']>
// Detail: Full user with nested inhabitant & household (GET /api/admin/users/:id)
export type UserDetail = z.infer<ReturnType<typeof useCoreValidation>['UserWithInhabitantSchema']>
// Mutations
export type UserCreate = z.infer<ReturnType<typeof useCoreValidation>['UserCreateSchema']>
export type UserUpdate = z.infer<ReturnType<typeof useCoreValidation>['UserUpdateSchema']>
// Auth
export type LoginCredentials = z.infer<ReturnType<typeof useCoreValidation>['LoginSchema']>

// INHABITANT TYPES
// Display: Minimal inhabitant info for lists (GET /api/admin/household/:id/inhabitants)
export type InhabitantDisplay = z.infer<ReturnType<typeof useCoreValidation>['InhabitantDisplaySchema']>
// Detail: Full inhabitant data (GET /api/admin/household/:id/inhabitants/:id)
export type InhabitantDetail = z.infer<ReturnType<typeof useCoreValidation>['InhabitantDetailSchema']>
// Mutations
export type InhabitantCreate = z.infer<ReturnType<typeof useCoreValidation>['InhabitantCreateSchema']>
export type InhabitantUpdate = z.infer<ReturnType<typeof useCoreValidation>['InhabitantUpdateSchema']>

// HOUSEHOLD TYPES (ADR-009: Only Display and Detail - mutations return Detail)
// Display: Household summary for lists (GET /api/admin/household)
export type HouseholdDisplay = z.infer<ReturnType<typeof useCoreValidation>['HouseholdDisplaySchema']>
// Detail: Full household with inhabitants (GET /api/admin/household/:id + mutations)
export type HouseholdDetail = z.infer<ReturnType<typeof useCoreValidation>['HouseholdDetailSchema']>
// Mutations
export type HouseholdCreate = z.infer<ReturnType<typeof useCoreValidation>['HouseholdCreateSchema']>
export type HouseholdUpdate = z.infer<ReturnType<typeof useCoreValidation>['HouseholdUpdateSchema']>

// LEGACY TYPE ALIASES (for backward compatibility during migration - will be removed)
/** @deprecated Use UserDisplay or UserDetail instead */
export type User = UserDetail
/** @deprecated Use UserDetail instead */
export type UserWithInhabitant = UserDetail
/** @deprecated Use InhabitantDetail instead */
export type Inhabitant = InhabitantDetail
/** @deprecated Use InhabitantDetail instead */
export type InhabitantResponse = InhabitantDetail
/** @deprecated Use HouseholdDetail instead */
export type HouseholdResponse = HouseholdDetail
