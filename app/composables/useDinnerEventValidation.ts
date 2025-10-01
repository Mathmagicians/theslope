import {z} from 'zod'

/**
 * Validation schemas for DinnerEvent entity
 */
export const useDinnerEventValidation = () => {
    // DinnerMode enum schema
    const DinnerModeSchema = z.enum(['TAKEAWAY', 'DINEIN', 'NONE'])

    // Base DinnerEvent schema for API operations
    const BaseDinnerEventSchema = z.object({
        id: z.number().int().positive().optional(),
        date: z.coerce.date(),
        menuTitle: z.string().min(1, "Menu titel skal være mindst 1 karakter").max(200, "Menu titel må ikke være længere end 200 karakterer"),
        menuDescription: z.string().max(500, "Menu beskrivelse må ikke være længere end 500 karakterer").optional().nullable(),
        menuPictureUrl: z.string().url("Menu billede skal være en gyldig URL").optional().nullable(),
        dinnerMode: DinnerModeSchema,
        chefId: z.number().int().positive().optional().nullable(),
        cookingTeamId: z.number().int().positive().optional().nullable(),
        seasonId: z.number().int().positive().optional().nullable(),
        createdAt: z.coerce.date().optional(),
        updatedAt: z.coerce.date().optional()
    })

    // DinnerEvent schema for creation (API input validation)
    const DinnerEventCreateSchema = BaseDinnerEventSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    })

    // DinnerEvent schema for updates
    const DinnerEventUpdateSchema = BaseDinnerEventSchema.partial().extend({
        id: z.number().int().positive() // ID is required for updates
    })

    // DinnerEvent schema for API responses
    const DinnerEventResponseSchema = BaseDinnerEventSchema.required({
        id: true,
        date: true,
        menuTitle: true,
        dinnerMode: true
    })

    // Minimal dinner event info for frontend display (calendar, lists, etc.)
    const DinnerEventDisplaySchema = z.object({
        id: z.number().int().positive(),
        date: z.coerce.date(),
        menuTitle: z.string(),
        dinnerMode: DinnerModeSchema,
        chefId: z.number().int().positive().optional().nullable(),
        cookingTeamId: z.number().int().positive().optional().nullable()
    })

    return {
        DinnerModeSchema,
        BaseDinnerEventSchema,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        DinnerEventResponseSchema,
        DinnerEventDisplaySchema
    }
}

// Re-export types
export type DinnerMode = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerModeSchema']>
export type DinnerEvent = z.infer<ReturnType<typeof useDinnerEventValidation>['BaseDinnerEventSchema']>
export type DinnerEventCreate = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventCreateSchema']>
export type DinnerEventUpdate = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventUpdateSchema']>
export type DinnerEventResponse = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventResponseSchema']>
export type DinnerEventDisplay = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventDisplaySchema']>