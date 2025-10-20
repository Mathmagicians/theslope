import {z} from 'zod'
import {useUserValidation} from './useUserValidation'

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
        // Remove trailing punctuation (commas, periods)
        const cleaned = word.replace(/[,.;:]+$/g, '')

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

    // Join numeric parts (in case there are multiple)
    const numbers = numericParts.join('_')

    return letters && numbers ? `${letters}_${numbers}` : address
}

/**
 * Validation schemas for Household aggregate and its entities (Inhabitants)
 */
export const useHouseholdValidation = () => {
    const {UserCreateSchema} = useUserValidation()
    // Base Household schema for API operations
    const BaseHouseholdSchema = z.object({
        id: z.number().int().positive().optional(),
        heynaboId: z.number().int().positive(),
        pbsId: z.number().int().positive(),
        movedInDate: z.coerce.date(),
        moveOutDate: z.coerce.date().optional().nullable(),
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        address: z.string().min(1, "Adresse skal være mindst 1 karakter").max(200, "Adresse må ikke være længere end 200 karakterer"),
        shortName: z.string().optional() // Computed from address via getHouseholdShortName()
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
        birthDate: z.coerce.date().optional().nullable()
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
        lastName: true
    })

    // Minimal inhabitant info for frontend display (team assignments, etc.)
    const InhabitantDisplaySchema = z.object({
        id: z.number().int().positive(),
        name: z.string(),
        lastName: z.string(),
        pictureUrl: z.string().optional().nullable()
    })

    // Household with nested inhabitants for creation (used by repository)
    const HouseholdCreateWithInhabitantsSchema = HouseholdCreateSchema.extend({
        inhabitants: z.array(InhabitantCreateSchema.omit({ householdId: true })).optional()
    })

    return {
        BaseHouseholdSchema,
        HouseholdCreateSchema,
        HouseholdUpdateSchema,
        HouseholdResponseSchema,
        HouseholdCreateWithInhabitantsSchema,
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantUpdateSchema,
        InhabitantResponseSchema,
        InhabitantDisplaySchema
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