import {z} from 'zod'
import {isBefore} from 'date-fns'
import {SystemRoleSchema, DinnerModeSchema} from '~~/prisma/generated/zod'
import {IdSchema, UserFragmentSchema, InhabitantFragmentSchema, HouseholdFragmentSchema, AllergyFragmentSchema} from '~/composables/fragments/domainFragments'
import {DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS} from '~/composables/useUserPreferenceValidation'
import {useWeekDayMapValidation} from './useWeekDayMapValidation'

/**
 * Core Domain Validation - User, Inhabitant, Household
 *
 * Built on the fragments of domainFragments.ts, so the validation composables import each other without cycles (ADR-001)
 *
 * Fragment Pattern:
 * - Import minimal fragments from domainFragments.ts
 * - Extend fragments with domain-specific fields
 * - No duplication, no circular dependencies
 */

// Re-export SystemRole type
export type SystemRole = z.infer<typeof SystemRoleSchema>

export {IdSchema}

// A url carries its ids as strings
export const RouteIdSchema = z.coerce.number().int().positive()

export const idParams = <const K extends string>(...names: K[]) =>
    z.object(Object.fromEntries(names.map(name => [name, RouteIdSchema])) as Record<K, typeof RouteIdSchema>)

// A flag in a url's query: only the literal "true" sets it, as z.coerce.boolean() reads the string "false" as true
const QueryFlagValueSchema = z.enum(['true', 'false'])
export const QueryFlagSchema = QueryFlagValueSchema.optional().transform(flag => flag === QueryFlagValueSchema.enum.true)

/** A flag's value in a request's query: a set flag carries "true", an unset one is undefined, which the url leaves out */
export const queryFlag = (isSet: boolean | undefined): z.input<typeof QueryFlagSchema> =>
    isSet ? QueryFlagValueSchema.enum.true : undefined

export const AdminBypassQuerySchema = z.object({
    adminBypass: QueryFlagSchema
})

/** The query of a change to a household's data: an override carries `adminBypass=true`, the household's own change nothing (ADR-004) */
export const adminBypassQuery = (adminBypass: boolean): z.input<typeof AdminBypassQuerySchema> =>
    ({adminBypass: queryFlag(adminBypass)})

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
    // ROLE OWNERSHIP SCHEMA (business logic in useUserRoles.ts)
    // ========================================================================

    /**
     * Role ownership enum - defines which system owns each role
     * HN = Heynabo (external system, owns ADMIN)
     * TS = TheSlope (this system, owns ALLERGYMANAGER and future roles)
     */
    const RoleOwnerSchema = z.enum(['HN', 'TS'])

    /**
     * Result of role reconciliation - contains reconciled roles and admin change tracking
     * Used by reconcileUserRoles in useUserRoles.ts
     */
    const ReconcileResultSchema = z.object({
        roles: z.array(SystemRoleSchema),
        adminAdded: z.boolean(),
        adminRemoved: z.boolean()
    })

    // ========================================================================
    // USER SCHEMAS - Extend UserFragment with domain-specific fields
    // ========================================================================

    // Email validation accepts two formats:
    // 1. Standard: user@domain.com
    // 2. RFC 5322 with display name: Display Name <user@domain.com>
    const emailSchema = z.union([
        z.email(),
        z.string().regex(/^.+\s+<.+@.+\..+>$/)
    ]).transform((val) => {
        // Normalize to standard format by extracting email from angle brackets
        const match = val.match(/<(.+)>/)
        return match ? match[1] : val
    }).pipe(z.email())

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
        systemRoles: z.string().default('[]'), // JSON stringified array
        notificationChannels: z.string().default(JSON.stringify(DEFAULT_NOTIFICATION_CHANNELS)), // JSON stringified array
        appearance: z.string().default(JSON.stringify(DEFAULT_APPEARANCE)) // JSON stringified object
    })

    // Serialized schema for database OUTPUT (read operations)
    // Matches Prisma User model - id, createdAt, updatedAt are always present
    const SerializedUserSchema = SerializedUserInputSchema.extend({
        id: z.number().int().positive(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    // User schema for creation (API input validation); a user's channels and appearance are the user's own save, so an
    // import or an upsert may leave them out and a new user gets the defaults
    const UserCreateSchema = BaseUserSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    }).partial({notificationChannels: true, appearance: true})

    // User schema for updates
    const UserUpdateSchema = BaseUserSchema.partial().extend({
        id: z.number().int().positive()
    })

    // ========================================================================
    // INHABITANT SCHEMAS - Extend InhabitantFragment with domain-specific fields
    // ========================================================================

    // Base Inhabitant schema for API operations (extends fragment)
    const BaseInhabitantSchema = InhabitantFragmentSchema.extend({
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        lastName: z.string().min(1, "Efternavn skal være mindst 1 karakter").max(100, "Efternavn må ikke være længere end 100 karakterer"),
        pictureUrl: z.url().optional().nullable(),
        dinnerPreferences: WeekDayMapSchemaOptional.optional().nullable()
    })

    // Inhabitant schemas. The create takes no preferences: the season initialises them, the preference write changes them
    const InhabitantCreateSchema = BaseInhabitantSchema.omit({
        id: true,
        dinnerPreferences: true
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
    const InhabitantDisplaySchema = InhabitantFragmentSchema.extend({
        dinnerPreferences: WeekDayMapSchemaOptional.optional().nullable()
    })

    // Database row: the dinner preferences travel as JSON (ADR-010)
    const SerializedInhabitantSchema = InhabitantFragmentSchema.extend({
        dinnerPreferences: z.string().nullable()
    })

    // The user rows the reads return: the display read leaves the Heynabo token out and selects the inhabitant's
    // scalars; the detail read includes the inhabitant with its household
    const SerializedUserDisplaySchema = SerializedUserSchema.omit({passwordHash: true}).extend({
        Inhabitant: InhabitantFragmentSchema.nullish()
    })

    const SerializedUserDetailSchema = SerializedUserSchema.extend({
        Inhabitant: SerializedInhabitantSchema.extend({household: HouseholdFragmentSchema}).nullish()
    })

    // User display with nested inhabitant (no circular dependency!)
    // householdId kept for UserListItem compatibility (displays inhabitants from user context)
    const UserDisplaySchema = BaseUserSchema.omit({
        passwordHash: true
    }).extend({
        id: z.number().int().positive(),
        Inhabitant: InhabitantDisplaySchema.extend({
            userId: z.number().int().positive().nullable().optional()
        }).nullable().optional()
    })

    // Login schema for authentication
    const LoginSchema = z.object({
        email: z.email('Indtast den mail, du er registreret med i Heynabo'),
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

    /**
     * Household create form - UI form validation schema factory.
     * Used by HouseholdCreateForm.vue for UForm validation.
     *
     * Takes runtime sibling move-out constraints (closure over caller state) and enforces
     * new movedInDate >= every sibling moveOutDate. Pass `[]` when no constraints apply.
     *
     * Derived from HouseholdCreateSchema (reuses address min/max from BaseHouseholdSchema).
     * Overrides pbsId with z.coerce.number() for HTML number input string → number.
     * movedInDate is strict z.date() — z.coerce.date() would coerce null to 1970-01-01.
     * (PBS uniqueness is a cross-field rule handled by the component's validate() function.)
     */
    const HouseholdCreateFormSchema = (siblingMoveOutConstraints: Date[] = []) =>
        HouseholdCreateSchema
            .pick({pbsId: true, address: true, movedInDate: true})
            .extend({
                pbsId: z.coerce.number({error: 'PBS skal være et tal'})
                    .int({message: 'PBS skal være et helt tal'})
                    .positive({message: 'PBS skal være positivt'}),
                movedInDate: z.date({error: 'Du skal sætte en indflytningsdato for den nye familie'})
            })
            .refine(
                (data) => siblingMoveOutConstraints.every(c => !isBefore(data.movedInDate, c)),
                {message: 'Ny familie kan ikke flytte ind, så længe den forrige ikke er flyttet ud', path: ['movedInDate']}
            )

    // ADR-009: Index endpoint - full household scalars + lightweight inhabitant relation
    const HouseholdDisplaySchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true,
        moveOutDate: true
    }).extend({
        shortName: z.string().min(1), // Required computed field
        inhabitants: z.array(InhabitantDisplaySchema) // Lightweight relation
    })

    // ADR-009: Detail endpoint - full household with complete inhabitant data and each inhabitant's allergies
    const HouseholdDetailSchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true,
        moveOutDate: true,
        shortName: true
    }).extend({
        inhabitants: z.array(InhabitantDetailSchema.extend({
            allergies: z.array(AllergyFragmentSchema).optional()
        }))
    })

    // Database rows: a household with its inhabitants; the detail read loads each inhabitant's allergies with their type
    const SerializedHouseholdDisplaySchema = HouseholdFragmentSchema.extend({
        inhabitants: z.array(SerializedInhabitantSchema)
    })

    const SerializedHouseholdDetailSchema = HouseholdFragmentSchema.extend({
        inhabitants: z.array(SerializedInhabitantSchema.extend({allergies: z.array(AllergyFragmentSchema)}))
    })

    // ADR-009: User detail with nested Inhabitant and Household (essential context for auth)
    const UserDetailSchema = UserDisplaySchema.extend({
        Inhabitant: InhabitantDisplaySchema.extend({
            userId: z.number().int().positive().nullable().optional(),
            householdId: z.number().int().positive(),
            household: BaseHouseholdSchema.required({
                id: true,
                heynaboId: true,
                pbsId: true,
                movedInDate: true,
                moveOutDate: true,
                name: true,
                address: true,
                shortName: true
            })
        }).nullable()
    })

    // User session schema - extends UserDetail with passwordHash for auth purposes
    // passwordHash stores Heynabo token for session management (not actual password)
    const UserSessionSchema = UserDetailSchema.extend({
        passwordHash: z.string()
    })

    // ========================================================================
    // TYPE DEFINITIONS (the public types are exported below the composable)
    // ========================================================================

    type UserCreate = z.infer<typeof UserCreateSchema>
    type InhabitantDisplay = z.infer<typeof InhabitantDisplaySchema>

    type SerializedUserInput = z.infer<typeof SerializedUserInputSchema>
    type SerializedInhabitant = z.infer<typeof SerializedInhabitantSchema>

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
            systemRoles: JSON.stringify(user.systemRoles),
            notificationChannels: JSON.stringify(user.notificationChannels ?? DEFAULT_NOTIFICATION_CHANNELS),
            appearance: JSON.stringify(user.appearance ?? DEFAULT_APPEARANCE)
        })
    }

    /**
     * Serialize the columns a partial update by id writes (ADR-012): a field the update leaves out carries `skip`, the
     * repository's Prisma.skip, and its column stays as stored; a null phone clears the phone
     */
    const serializeUserUpdate = <Skip>(user: Partial<UserCreate>, skip: Skip) => ({
        email: user.email !== undefined ? user.email : skip,
        phone: user.phone !== undefined ? user.phone : skip,
        passwordHash: user.passwordHash !== undefined ? user.passwordHash : skip,
        systemRoles: user.systemRoles !== undefined ? JSON.stringify(user.systemRoles) : skip,
        notificationChannels: user.notificationChannels !== undefined ? JSON.stringify(user.notificationChannels) : skip,
        appearance: user.appearance !== undefined ? JSON.stringify(user.appearance) : skip
    })

    // The JSON columns of a User row as domain values
    const deserializeUserColumns = (serializedUser: z.infer<typeof SerializedUserDisplaySchema>) => ({
        systemRoles: JSON.parse(serializedUser.systemRoles),
        notificationChannels: JSON.parse(serializedUser.notificationChannels),
        appearance: JSON.parse(serializedUser.appearance)
    })

    // An Inhabitant row's columns as domain values: the preferences parsed, a missing birth date null
    const deserializeInhabitantColumns = (serialized: SerializedInhabitant) => ({
        ...serialized,
        birthDate: serialized.birthDate ?? null,
        dinnerPreferences: serialized.dinnerPreferences ? deserializeWeekDayMap(serialized.dinnerPreferences) : null
    })

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

    /** ADR-010: an Inhabitant row as InhabitantDetail, for GET/:id and the mutations (ADR-009) */
    const deserializeInhabitantDetail = (serialized: SerializedInhabitant): z.infer<typeof InhabitantDetailSchema> =>
        InhabitantDetailSchema.parse(deserializeInhabitantColumns(serialized))

    const deserializeUserDisplay = (serializedUser: z.infer<typeof SerializedUserDisplaySchema>): z.infer<typeof UserDisplaySchema> => UserDisplaySchema.parse({
        ...serializedUser,
        ...deserializeUserColumns(serializedUser)
    })

    // The household of the user's inhabitant carries its shortName, computed from the address
    const deserializeUserDetail = (serializedUser: z.infer<typeof SerializedUserDetailSchema>): z.infer<typeof UserDetailSchema> => {
        const inhabitant = serializedUser.Inhabitant
        return UserDetailSchema.parse({
            ...serializedUser,
            ...deserializeUserColumns(serializedUser),
            Inhabitant: inhabitant ? {
                ...deserializeInhabitantColumns(inhabitant),
                household: {...inhabitant.household, shortName: getHouseholdShortName(inhabitant.household.address)}
            } : null
        })
    }

    // A household row's columns as domain values: the shortName computed from the address, a missing move-out date null;
    // the schema the caller parses with keeps what its read loaded beyond them (the detail's allergies)
    const deserializeHouseholdColumns = (serialized: z.infer<typeof SerializedHouseholdDisplaySchema>) => ({
        ...serialized,
        moveOutDate: serialized.moveOutDate ?? null,
        shortName: getHouseholdShortName(serialized.address),
        inhabitants: serialized.inhabitants.map(deserializeInhabitantColumns)
    })

    const deserializeHouseholdDisplay = (serialized: z.infer<typeof SerializedHouseholdDisplaySchema>): z.infer<typeof HouseholdDisplaySchema> =>
        HouseholdDisplaySchema.parse(deserializeHouseholdColumns(serialized))

    const deserializeHouseholdDetail = (serialized: z.infer<typeof SerializedHouseholdDetailSchema>): z.infer<typeof HouseholdDetailSchema> =>
        HouseholdDetailSchema.parse(deserializeHouseholdColumns(serialized))

    return {
        // Shared building blocks
        IdSchema,
        // Schemas - Role Ownership
        RoleOwnerSchema,
        ReconcileResultSchema,
        // Schemas - User
        SystemRoleSchema,
        BaseUserSchema,
        SerializedUserInputSchema,
        SerializedUserSchema,
        SerializedUserDisplaySchema,
        SerializedUserDetailSchema,
        UserCreateSchema,
        UserUpdateSchema,
        UserDisplaySchema,
        UserDetailSchema,
        UserSessionSchema,
        LoginSchema,
        // Schemas - Inhabitant
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantUpdateSchema,
        InhabitantDisplaySchema,
        InhabitantDetailSchema,
        SerializedInhabitantSchema,
        // Schemas - Household
        BaseHouseholdSchema,
        HouseholdCreateSchema,
        HouseholdCreateFormSchema,
        HouseholdUpdateSchema,
        HouseholdDisplaySchema,
        HouseholdDetailSchema,
        SerializedHouseholdDisplaySchema,
        SerializedHouseholdDetailSchema,
        // Functions - User
        serializeUserInput,
        serializeUserUpdate,
        deserializeUserDisplay,
        deserializeUserDetail,
        // Functions - Inhabitant
        deserializeInhabitantDisplay,
        deserializeInhabitantDetail,
        // Functions - Household
        deserializeHouseholdDisplay,
        deserializeHouseholdDetail,
        // WeekDayMap of dinner modes
        WeekDayMapSchemaOptional,
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
export type UserDetail = z.infer<ReturnType<typeof useCoreValidation>['UserDetailSchema']>
// Session: UserDetail + passwordHash for auth/session (stores Heynabo token)
export type UserSession = z.infer<ReturnType<typeof useCoreValidation>['UserSessionSchema']>
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
export type HouseholdCreateFormData = z.infer<ReturnType<ReturnType<typeof useCoreValidation>['HouseholdCreateFormSchema']>>
export type HouseholdUpdate = z.infer<ReturnType<typeof useCoreValidation>['HouseholdUpdateSchema']>

// ROLE OWNERSHIP TYPES
// ReconcileResult: Result of role reconciliation with admin change tracking
export type ReconcileResult = z.infer<ReturnType<typeof useCoreValidation>['ReconcileResultSchema']>
