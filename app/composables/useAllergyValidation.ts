import {z} from 'zod'

/**
 * Validation schemas for Allergy and AllergyType entities
 * Following ADR-001: Zod schemas in composables for shared validation
 */
export const useAllergyValidation = () => {
    // Inline InhabitantDisplay schema to avoid circular dependency with useHouseholdValidation
    // This is the minimal structure needed for displaying inhabitant info in allergy context
    const InhabitantDisplaySchema = z.object({
        id: z.number().int().positive(),
        heynaboId: z.number().int().positive(),
        name: z.string(),
        lastName: z.string(),
        pictureUrl: z.string().nullable().optional(),
        birthDate: z.coerce.date().nullable().optional()
    })

    // Base AllergyType schema (global catalog managed by admin)
    const BaseAllergyTypeSchema = z.object({
        name: z.string().min(1, "Navn skal være mindst 1 karakter").max(100, "Navn må ikke være længere end 100 karakterer"),
        description: z.string().min(1, "Beskrivelse skal være mindst 1 karakter").max(500, "Beskrivelse må ikke være længere end 500 karakterer"),
        icon: z.string().max(50, "Ikon må ikke være længere end 50 karakterer").optional().nullable()
    })

    // AllergyType CRUD schemas
    const AllergyTypeCreateSchema = BaseAllergyTypeSchema

    const AllergyTypeUpdateSchema = BaseAllergyTypeSchema.partial().extend({
        id: z.number().int().positive()
    })

    const AllergyTypeDisplaySchema = BaseAllergyTypeSchema.extend({
        id: z.number().int().positive()
    })

    // AllergyType with nested Inhabitants (for admin allergies  master-detail view)
    // Shows which inhabitants have this allergy type (lightweight)
    const AllergyTypeDetailSchema = AllergyTypeDisplaySchema.extend({
        inhabitants: z.array(InhabitantDisplaySchema.extend({
            householdName: z.string(), // Display which household the inhabitant belongs to
            inhabitantComment: z.string().optional().nullable() // Display the comment from Allergy
        }))
    })

    // Base Allergy schema for Display (includes allergyType - ADR-09 lightweight relation)
    const BaseAllergySchema = z.object({
        id: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        allergyTypeId: z.number().int().positive(),
        inhabitantComment: z.string().max(500, "Kommentar må ikke være længere end 500 karakterer").optional().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        allergyType: AllergyTypeDisplaySchema // ADR-09: Essential lightweight relation
    })

    // Allergy CRUD schemas - omit relation fields for input operations
    const AllergyCreateSchema = BaseAllergySchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        allergyType: true // Omit for create - only send allergyTypeId
    })

    const AllergyUpdateSchema = BaseAllergySchema.partial().extend({
        id: z.number().int().positive()
    }).omit({
        createdAt: true,
        updatedAt: true,
        allergyType: true // Omit for update - only send allergyTypeId
    })

    // AllergyDisplay = BaseAllergySchema (already includes allergyType)
    const AllergyDisplaySchema = BaseAllergySchema

    // Allergy with full relations (allergyType + inhabitant) - used by household/inhabitant endpoints
    const AllergyDetailSchema = AllergyDisplaySchema.extend({
        allergyType: AllergyTypeDisplaySchema,
        inhabitant: InhabitantDisplaySchema
    })


    return {
        // AllergyType
        AllergyTypeCreateSchema,
        AllergyTypeUpdateSchema,
        AllergyTypeDisplaySchema,
        AllergyTypeDetailSchema,
        // Allergy
        AllergyCreateSchema,
        AllergyUpdateSchema,
        AllergyDisplaySchema,
        AllergyDetailSchema
    }
}

// Re-export types
export type AllergyTypeDisplay = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeDisplaySchema']>
export type AllergyTypeCreate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeCreateSchema']>
export type AllergyTypeUpdate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeUpdateSchema']>
export type AllergyTypeDetail = z.infer<ReturnType<typeof useAllergyValidation>['AllergyTypeDetailSchema']>

export type AllergyCreate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyCreateSchema']>
export type AllergyUpdate = z.infer<ReturnType<typeof useAllergyValidation>['AllergyUpdateSchema']>
export type AllergyDisplay = z.infer<ReturnType<typeof useAllergyValidation>['AllergyDisplaySchema']>
export type AllergyDetail = z.infer<ReturnType<typeof useAllergyValidation>['AllergyDetailSchema']>
