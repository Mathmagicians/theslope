import {z} from 'zod'
import {SystemRoleSchema} from '~~/prisma/generated/zod'

/**
 * Validation schemas and serialization functions for User and Inhabitant objects
 */
export const useUserValidation = () => {
    // Base User schema for API operations
    const BaseUserSchema = z.object({
        id: z.number().int().positive().optional(),
        email: z.string().email('Email-adressen er ikke gyldig'),
        phone: z.string()
            .regex(/^\+?\d+$/, 'Telefonnummer må kun indeholde tal og eventuelt et plus-tegn i starten')
            .optional(),
        passwordHash: z.string().default('caramba'),
        systemRole: SystemRoleSchema.default('USER'),
        createdAt: z.coerce.date().optional(),
        updatedAt: z.coerce.date().optional()
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
        systemRole: true
    })

    // Minimal user info for frontend display
    const UserDisplaySchema = z.object({
        id: z.number().int().positive(),
        email: z.string().email(),
        systemRole: SystemRoleSchema,
        phone: z.string().optional()
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

    // Inhabitant schema for creation (API input validation)
    const InhabitantCreateSchema = BaseInhabitantSchema.omit({
        id: true
    })

    // Inhabitant schema for updates
    const InhabitantUpdateSchema = BaseInhabitantSchema.partial().extend({
        id: z.number().int().positive() // ID is required for updates
    })

    // Inhabitant schema for API responses
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

    // Type definitions
    type User = z.infer<typeof BaseUserSchema>
    type UserCreate = z.infer<typeof UserCreateSchema>
    type UserUpdate = z.infer<typeof UserUpdateSchema>
    type UserResponse = z.infer<typeof UserResponseSchema>
    type UserDisplay = z.infer<typeof UserDisplaySchema>

    type Inhabitant = z.infer<typeof BaseInhabitantSchema>
    type InhabitantCreate = z.infer<typeof InhabitantCreateSchema>
    type InhabitantUpdate = z.infer<typeof InhabitantUpdateSchema>
    type InhabitantResponse = z.infer<typeof InhabitantResponseSchema>
    type InhabitantDisplay = z.infer<typeof InhabitantDisplaySchema>

    return {
        BaseUserSchema,
        UserCreateSchema,
        UserUpdateSchema,
        UserResponseSchema,
        UserDisplaySchema,
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantUpdateSchema,
        InhabitantResponseSchema,
        InhabitantDisplaySchema
    }
}

// Re-export types
export type User = z.infer<ReturnType<typeof useUserValidation>['BaseUserSchema']>
export type UserCreate = z.infer<ReturnType<typeof useUserValidation>['UserCreateSchema']>
export type UserUpdate = z.infer<ReturnType<typeof useUserValidation>['UserUpdateSchema']>
export type UserResponse = z.infer<ReturnType<typeof useUserValidation>['UserResponseSchema']>
export type UserDisplay = z.infer<ReturnType<typeof useUserValidation>['UserDisplaySchema']>

export type Inhabitant = z.infer<ReturnType<typeof useUserValidation>['BaseInhabitantSchema']>
export type InhabitantCreate = z.infer<ReturnType<typeof useUserValidation>['InhabitantCreateSchema']>
export type InhabitantUpdate = z.infer<ReturnType<typeof useUserValidation>['InhabitantUpdateSchema']>
export type InhabitantResponse = z.infer<ReturnType<typeof useUserValidation>['InhabitantResponseSchema']>
export type InhabitantDisplay = z.infer<ReturnType<typeof useUserValidation>['InhabitantDisplaySchema']>