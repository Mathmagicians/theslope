import {z} from 'zod'
import {useUserValidation} from './useUserValidation'
import {useWeekDayMapValidation} from './useWeekDayMapValidation'
import {useDinnerEventValidation} from './useDinnerEventValidation'

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
    const words = address.trim().split(/\s+/)

    // Separate text words from numeric/alphanumeric suffix
    const textWords: string[] = []
    const numericParts: string[] = []

    let foundFirstNumber = false

    for (const word of words) {
        // Remove all non-word characters (keep letters, digits, underscore)
        const cleaned = word.replace(/\W/g, '')

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

/**
 * Validation schemas for Household aggregate and its entities (Inhabitants)
 */
export const useHouseholdValidation = () => {
    const {UserCreateSchema} = useUserValidation()
    const {DinnerModeSchema} = useDinnerEventValidation()

    // Extract enum constants from Zod schema
    const DinnerMode = DinnerModeSchema.enum

    const {
        WeekDayMapSchemaOptional,
        serializeWeekDayMap,
        deserializeWeekDayMap,
        createWeekDayMapFromSelection,
        createDefaultWeekdayMap
    } = useWeekDayMapValidation({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })
    // Base Household schema for API operations
    const BaseHouseholdSchema = z.object({
        id: z.number().int().positive().optional(),
        heynaboId: z.number().int().positive(),
        pbsId: z.number().int().positive(),
        movedInDate: z.coerce.date(),
        moveOutDate: z.coerce.date().optional().nullable(),
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        address: z.string().min(1, "Adresse skal være mindst 1 karakter").max(200, "Adresse må ikke være længere end 200 karakterer"),
        shortName: z.string().min(1).optional() // Computed server-side from address via getHouseholdShortName()
    })

    // Base Inhabitant schema for API operations
    const BaseInhabitantSchema = z.object({
        id: z.number().int().positive().optional(),
        heynaboId: z.number().int().positive(),
        userId: z.number().int().positive().optional().nullable(),
        householdId: z.number().int().positive(),
        pictureUrl: z.string().url().optional().nullable(),
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        lastName: z.string().min(1, "Efternavn skal være mindst 1 karakter").max(100, "Efternavn må ikke være længere end 100 karakterer"),
        birthDate: z.coerce.date().optional().nullable(),
        dinnerPreferences: WeekDayMapSchemaOptional.optional().nullable()
    })

    // Household schemas
    const HouseholdCreateSchema = BaseHouseholdSchema.omit({
        id: true
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

    // Inhabitant schemas
    const InhabitantCreateSchema = BaseInhabitantSchema.omit({
        id: true
    }).extend({
        user: UserCreateSchema.optional()
    })

    const InhabitantUpdateSchema = BaseInhabitantSchema.partial().extend({
        id: z.number().int().positive()
    })

    const InhabitantResponseSchema = BaseInhabitantSchema.required({
        id: true,
        heynaboId: true,
        householdId: true,
        name: true,
        lastName: true,
        dinnerPreferences: true
    })

    // Minimal inhabitant info for frontend display (team assignments, etc.)
    // Includes birthDate to distinguish children vs adults
    // Includes heynaboId for profile links (ADR-009)
    const InhabitantDisplaySchema = z.object({
        id: z.number().int().positive(),
        heynaboId: z.number().int().positive(),
        name: z.string(),
        lastName: z.string(),
        pictureUrl: z.string().optional().nullable(),
        birthDate: z.coerce.date().optional().nullable()
    })

    // Household with nested inhabitants for creation (used by repository)
    const HouseholdCreateWithInhabitantsSchema = HouseholdCreateSchema.extend({
        inhabitants: z.array(InhabitantCreateSchema.omit({ householdId: true })).optional()
    })

    // ADR-009: Index endpoint - full household scalars + lightweight inhabitant relation
    // "Lightweight" means minimal inhabitant fields (InhabitantDisplay), not fewer household fields
    const HouseholdSummarySchema = BaseHouseholdSchema.required({
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
    const HouseholdWithInhabitantsSchema = BaseHouseholdSchema.required({
        id: true,
        heynaboId: true,
        pbsId: true,
        name: true,
        address: true,
        movedInDate: true,
        shortName: true
    }).extend({
        inhabitants: z.array(InhabitantResponseSchema)
    })

    // Internal type definitions (used within composable)
    type Inhabitant = z.infer<typeof BaseInhabitantSchema>
    type HouseholdSummary = z.infer<typeof HouseholdSummarySchema>
    type HouseholdWithInhabitants = z.infer<typeof HouseholdWithInhabitantsSchema>

    /**
     * ADR-010: Deserialize Inhabitant from database format to domain format
     * Converts JSON string dinnerPreferences to WeekDayMap and dates to Date objects
     */
    const deserializeInhabitant = (serialized: any): Inhabitant => {
        const deserialized = {
            ...serialized,
            birthDate: serialized.birthDate ? new Date(serialized.birthDate) : null,
            dinnerPreferences: serialized.dinnerPreferences
                ? deserializeWeekDayMap(serialized.dinnerPreferences)
                : null
        }
        return BaseInhabitantSchema.parse(deserialized)
    }

    const deserializeHouseholdSummary = (serialized: any): HouseholdSummary => {
        const deserialized = {
            ...serialized,
            movedInDate: new Date(serialized.movedInDate),
            moveOutDate: serialized.moveOutDate ? new Date(serialized.moveOutDate) : null,
            shortName: getHouseholdShortName(serialized.address),
            inhabitants: serialized.inhabitants?.map((inhabitant: any) => ({
                ...inhabitant,
                birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null
            }))
        }
        return HouseholdSummarySchema.parse(deserialized)
    }

    const deserializeHouseholdWithInhabitants = (serialized: any): HouseholdWithInhabitants => {
        const deserialized = {
            ...serialized,
            movedInDate: new Date(serialized.movedInDate),
            moveOutDate: serialized.moveOutDate ? new Date(serialized.moveOutDate) : null,
            shortName: getHouseholdShortName(serialized.address),
            inhabitants: serialized.inhabitants?.map((inhabitant: any) => deserializeInhabitant(inhabitant))
        }
        return HouseholdWithInhabitantsSchema.parse(deserialized)
    }

    return {
        BaseHouseholdSchema,
        HouseholdCreateSchema,
        HouseholdUpdateSchema,
        HouseholdResponseSchema,
        HouseholdCreateWithInhabitantsSchema,
        HouseholdSummarySchema,
        HouseholdWithInhabitantsSchema,
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantUpdateSchema,
        InhabitantResponseSchema,
        InhabitantDisplaySchema,
        serializeWeekDayMap,
        deserializeWeekDayMap,
        deserializeInhabitant,
        deserializeHouseholdSummary,
        deserializeHouseholdWithInhabitants,
        createDefaultWeekdayMap
    }
}

// Re-export types
export type Household = z.infer<ReturnType<typeof useHouseholdValidation>['BaseHouseholdSchema']>
export type HouseholdCreate = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdCreateSchema']>
export type HouseholdUpdate = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdUpdateSchema']>
export type HouseholdResponse = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdResponseSchema']>
export type HouseholdCreateWithInhabitants = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdCreateWithInhabitantsSchema']>

export type Inhabitant = z.infer<ReturnType<typeof useHouseholdValidation>['BaseInhabitantSchema']>
export type InhabitantCreate = z.infer<ReturnType<typeof useHouseholdValidation>['InhabitantCreateSchema']>
export type InhabitantUpdate = z.infer<ReturnType<typeof useHouseholdValidation>['InhabitantUpdateSchema']>
export type InhabitantResponse = z.infer<ReturnType<typeof useHouseholdValidation>['InhabitantResponseSchema']>
export type InhabitantDisplay = z.infer<ReturnType<typeof useHouseholdValidation>['InhabitantDisplaySchema']>

// ADR-009: Index vs Detail endpoint types
export type HouseholdSummary = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdSummarySchema']>
export type HouseholdWithInhabitants = z.infer<ReturnType<typeof useHouseholdValidation>['HouseholdWithInhabitantsSchema']>
