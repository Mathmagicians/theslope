import {z} from 'zod'
import {SystemRoleSchema} from '~~/prisma/generated/zod'

/**
 * Validation schemas and serialization functions for User objects
 */
export const useUserValidation = () => {
    // Base User schema for API operations
    const BaseUserSchema = z.object({
        id: z.number().int().positive().optional(),
        email: z.string().email('Email-adressen er ikke gyldig'),
        phone: z.string()
            .regex(/^\+?\d+$/, 'Telefonnummer må kun indeholde tal og eventuelt et plus-tegn i starten')
            .nullable()
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

    // Login schema for authentication
    const LoginSchema = z.object({
        email: z.string().email('Indtast den mail, du er registreret med i Heynabo'),
        password: z.string().nonempty('Indtast din Heynabo adgangskode')
    })

    // ADR-009: User with nested Inhabitant and Household (essential context for auth)
    // Inline schemas to avoid circular dependency with useHouseholdValidation
    const UserWithInhabitantSchema = BaseUserSchema.required({
        id: true,
        email: true,
        systemRole: true
    }).extend({
        Inhabitant: z.object({
            id: z.number().int().positive(),
            heynaboId: z.number().int().positive(),
            userId: z.number().int().positive().nullable(),
            householdId: z.number().int().positive(),
            pictureUrl: z.string().url().nullable(),
            name: z.string(),
            lastName: z.string(),
            birthDate: z.coerce.date().nullable(),
            household: z.object({
                id: z.number().int().positive(),
                heynaboId: z.number().int().positive(),
                pbsId: z.number().int().positive(),
                movedInDate: z.coerce.date(),
                moveOutDate: z.coerce.date().nullable(),
                name: z.string(),
                address: z.string(),
                shortName: z.string()
            })
        }).nullable()
    })

    // Type definitions
    type User = z.infer<typeof BaseUserSchema>
    type UserCreate = z.infer<typeof UserCreateSchema>
    type UserUpdate = z.infer<typeof UserUpdateSchema>
    type UserResponse = z.infer<typeof UserResponseSchema>
    type UserDisplay = z.infer<typeof UserDisplaySchema>
    type UserWithInhabitant = z.infer<typeof UserWithInhabitantSchema>
    type LoginCredentials = z.infer<typeof LoginSchema>

    return {
        BaseUserSchema,
        UserCreateSchema,
        UserUpdateSchema,
        UserResponseSchema,
        UserDisplaySchema,
        UserWithInhabitantSchema,
        LoginSchema
    }
}

// Re-export types
export type User = z.infer<ReturnType<typeof useUserValidation>['BaseUserSchema']>
export type UserCreate = z.infer<ReturnType<typeof useUserValidation>['UserCreateSchema']>
export type UserUpdate = z.infer<ReturnType<typeof useUserValidation>['UserUpdateSchema']>
export type UserResponse = z.infer<ReturnType<typeof useUserValidation>['UserResponseSchema']>
export type UserDisplay = z.infer<ReturnType<typeof useUserValidation>['UserDisplaySchema']>
export type UserWithInhabitant = z.infer<ReturnType<typeof useUserValidation>['UserWithInhabitantSchema']>
export type LoginCredentials = z.infer<ReturnType<typeof useUserValidation>['LoginSchema']>
