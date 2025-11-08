import {z} from 'zod'
import {useHouseholdValidation} from './useHouseholdValidation'

/**
 * Validation schemas for Allergy and AllergyType entities
 * Following ADR-001: Zod schemas in composables for shared validation
 */
export const useAllergyValidation = () => {
    // Import InhabitantDisplay from household validation
    const {InhabitantDisplaySchema} = useHouseholdValidation()

    // Base AllergyType schema (global catalog managed by admin)
    const BaseAllergyTypeSchema = z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        description: z.string().min(1, "Beskrivelse skal være mindst 1 karakter").max(500, "Beskrivelse må ikke være længere end 500 karakterer"),
        icon: z.string().max(50, "Ikon må ikke være længere end 50 karakterer").optional().nullable()
    })

    // AllergyType CRUD schemas
    const AllergyTypeCreateSchema = BaseAllergyTypeSchema.omit({
        id: true
    })

    const AllergyTypeUpdateSchema = BaseAllergyTypeSchema.partial().extend({
        id: z.number().int().positive()
    })

    const AllergyTypeResponseSchema = BaseAllergyTypeSchema.required({
        id: true,
        name: true,
        description: true
    })

    // Base Allergy schema (user-managed per household)
    const BaseAllergySchema = z.object({
        id: z.number().int().positive().optional(),
        inhabitantId: z.number().int().positive(),
        allergyTypeId: z.number().int().positive(),
        inhabitantComment: z.string().max(500, "Kommentar må ikke være længere end 500 karakterer").optional().nullable(),
        createdAt: z.coerce.date().optional(),
        updatedAt: z.coerce.date().optional()
    })

    // Allergy CRUD schemas
    const AllergyCreateSchema = BaseAllergySchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    })

    const AllergyUpdateSchema = BaseAllergySchema.partial().extend({
        id: z.number().int().positive()
    }).omit({
        createdAt: true,
        updatedAt: true
    })

    const AllergyResponseSchema = BaseAllergySchema.required({
        id: true,
        inhabitantId: true,
        allergyTypeId: true
    })

    // Allergy with nested AllergyType (for displaying allergy with type info)
    const AllergyWithTypeSchema = AllergyResponseSchema.extend({
        allergyType: AllergyTypeResponseSchema
    })

    // Allergy with full relations (allergyType + inhabitant) - used by household/inhabitant endpoints
    const AllergyWithRelationsSchema = AllergyResponseSchema.extend({
        allergyType: AllergyTypeResponseSchema,
        inhabitant: InhabitantDisplaySchema
    })

    // AllergyType with nested Inhabitants (for admin master-detail view)
    // Shows which inhabitants have this allergy type (lightweight)
    const AllergyTypeWithInhabitantsSchema = AllergyTypeResponseSchema.extend({
        inhabitants: z.array(InhabitantDisplaySchema.extend({
            householdName: z.string(), // Display which household the inhabitant belongs to
            inhabitantComment: z.string().optional().nullable() // Display the comment from Allergy
        }))
    })

    // Inhabitant with their allergies (for household busy-parent view)
    // Groups allergies by inhabitant for household view
    const InhabitantWithAllergiesSchema = InhabitantDisplaySchema.extend({
        allergies: z.array(AllergyWithTypeSchema)
    })

    return {
        BaseAllergyTypeSchema,
        AllergyTypeCreateSchema,
        AllergyTypeUpdateSchema,
        AllergyTypeResponseSchema,
        AllergyTypeWithInhabitantsSchema,
        BaseAllergySchema,
        AllergyCreateSchema,
        AllergyUpdateSchema,
        AllergyResponseSchema,
        AllergyWithTypeSchema,
        AllergyWithRelationsSchema,
        InhabitantWithAllergiesSchema
    }
}

// Re-export types
export type AllergyType = z.infer<ReturnType<typeof useAllergyValidation>['BaseAllergyTypeSchema']>
export type AllergyTypeCreate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeCreateSchema']>
export type AllergyTypeUpdate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeUpdateSchema']>
export type AllergyTypeResponse = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeResponseSchema']>
export type AllergyTypeWithInhabitants = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeWithInhabitantsSchema']>

export type Allergy = z.infer<ReturnType<typeof useAllergyValidation>['BaseAllergySchema']>
export type AllergyCreate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyCreateSchema']>
export type AllergyUpdate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyUpdateSchema']>
export type AllergyResponse = z.infer<ReturnType<typeof useAllergyValidation>['AllergyResponseSchema']>
export type AllergyWithType = z.infer<ReturnType<typeof useAllergyValidation>['AllergyWithTypeSchema']>
export type AllergyWithRelations = z.infer<ReturnType<typeof useAllergyValidation>['AllergyWithRelationsSchema']>
export type InhabitantWithAllergies = z.infer<ReturnType<typeof useAllergyValidation>['InhabitantWithAllergiesSchema']>
