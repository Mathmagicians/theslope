import {z} from 'zod'
import { DinnerModeSchema, DinnerStateSchema } from '~~/prisma/generated/zod'
import { useCookingTeamValidation } from '~/composables/useCookingTeamValidation'
import { useOrderValidation } from '~/composables/useOrderValidation'
import { useHouseholdValidation } from '~/composables/useHouseholdValidation'

/**
 * Validation schemas for DinnerEvent entity
 */
export const useDinnerEventValidation = () =>{
    // Get schemas for nested relations (no circular dependency after household fix)
    const {CookingTeamWithMembersSchema} = useCookingTeamValidation()
    const {OrderDetailSchema} = useOrderValidation()
    const {InhabitantDisplaySchema} = useHouseholdValidation()

    // Base DinnerEvent schema for API operations
    const BaseDinnerEventSchema = z.object({
        id: z.number().int().positive().optional(),
        date: z.coerce.date(),
        menuTitle: z.string().min(1, "Menu titel skal være mindst 1 karakter").max(200, "Menu titel må ikke være længere end 200 karakterer"),
        menuDescription: z.string().max(500, "Menu beskrivelse må ikke være længere end 500 karakterer").optional().nullable(),
        menuPictureUrl: z.string().url("Menu billede skal være en gyldig URL").optional().nullable(),
        state: DinnerStateSchema,
        totalCost: z.number().int().min(0, "Total kostpris må ikke være negativ"),
        heynaboEventId: z.number().int().positive().optional().nullable(),
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

    // DinnerEvent schema for API responses (basic fields only)
    const DinnerEventResponseSchema = BaseDinnerEventSchema.required({
        id: true,
        date: true,
        menuTitle: true,
        dinnerMode: true
    })

    // DinnerEvent detail schema with comprehensive relations (ADR-009)
    const DinnerEventDetailSchema = DinnerEventResponseSchema.extend({
        chef: InhabitantDisplaySchema.optional().nullable(),
        cookingTeam: CookingTeamWithMembersSchema.optional().nullable(),
        tickets: z.array(OrderDetailSchema).optional()
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
        DinnerStateSchema,
        BaseDinnerEventSchema,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        DinnerEventResponseSchema,
        DinnerEventDetailSchema,
        DinnerEventDisplaySchema
    }
}

// Re-export types
export type DinnerMode = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerModeSchema']>
export type DinnerState = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerStateSchema']>
export type DinnerEvent = z.infer<ReturnType<typeof useDinnerEventValidation>['BaseDinnerEventSchema']>
export type DinnerEventCreate = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventCreateSchema']>
export type DinnerEventUpdate = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventUpdateSchema']>
export type DinnerEventResponse = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventResponseSchema']>
export type DinnerEventDetail = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventDetailSchema']>
export type DinnerEventDisplay = z.infer<ReturnType<typeof useDinnerEventValidation>['DinnerEventDisplaySchema']>