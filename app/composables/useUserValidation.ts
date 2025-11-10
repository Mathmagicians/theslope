import {z} from 'zod'
import {SystemRoleSchema} from '~~/prisma/generated/zod'

// Re-export SystemRole type
export type SystemRole = z.infer<typeof SystemRoleSchema>

/**
 * Validation schemas and serialization functions for User objects
 * Following ADR-010: Domain-Driven Serialization Architecture
 */
export const useUserValidation = () => {
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
    })

    // Domain schema - systemRoles as array
    const BaseUserSchema = z.object({
        id: z.number().int().positive().optional(),
        email: emailSchema,
        phone: z.union([
            z.string().regex(/^\+?[\d\s]+$/, 'Telefonnummer må kun indeholde tal, mellemrum og eventuelt et plus-tegn i starten'),
            z.literal(''),
            z.null()
        ])
            .optional()
            .transform(val => val === '' ? null : val), // Convert empty string to null
        passwordHash: z.string().default('caramba'),
        systemRoles: z.array(SystemRoleSchema).default([]), // Array of roles
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

    // Shared Inhabitant schema with all scalar properties
    // NOTE: Duplicated from InhabitantDisplaySchema in useHouseholdValidation
    // Cannot import directly due to circular dependency (useHouseholdValidation imports useUserValidation)
    // IMPORTANT: Keep in sync with InhabitantDisplaySchema - verified by unit test
    const InhabitantScalarsSchema = z.object({
        id: z.number().int().positive(),
        heynaboId: z.number().int().positive(),
        name: z.string(),
        lastName: z.string(),
        pictureUrl: z.string().url().or(z.literal('')).nullable(),
        birthDate: z.coerce.date().nullable(),
        userId: z.number().int().positive().nullable(),
        householdId: z.number().int().positive()
    })

    // Minimal user info for frontend display (allergy managers with avatar)
    // Reuses BaseUserSchema and InhabitantScalarsSchema (without userId/householdId)
    const UserDisplaySchema = BaseUserSchema.omit({
        passwordHash: true
    }).extend({
        id: z.number().int().positive(), // Make id required (BaseUserSchema has it optional)
        Inhabitant: InhabitantScalarsSchema.omit({
            userId: true,
            householdId: true
        }).nullable().optional()
    })

    // Login schema for authentication
    const LoginSchema = z.object({
        email: z.string().email('Indtast den mail, du er registreret med i Heynabo'),
        password: z.string().nonempty('Indtast din Heynabo adgangskode')
    })

    // ADR-009: User with nested Inhabitant and Household (essential context for auth)
    // Extends UserDisplaySchema to add userId, householdId, and household relation to Inhabitant
    const UserWithInhabitantSchema = UserDisplaySchema.extend({
        Inhabitant: InhabitantScalarsSchema.extend({
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
    type SerializedUserInput = z.infer<typeof SerializedUserInputSchema>
    type SerializedUser = z.infer<typeof SerializedUserSchema>
    type UserCreate = z.infer<typeof UserCreateSchema>
    type UserUpdate = z.infer<typeof UserUpdateSchema>
    type UserResponse = z.infer<typeof UserResponseSchema>
    type UserDisplay = z.infer<typeof UserDisplaySchema>
    type UserWithInhabitant = z.infer<typeof UserWithInhabitantSchema>
    type LoginCredentials = z.infer<typeof LoginSchema>

    // Serialization functions (database ⟷ domain)

    /**
     * Serialize user for database input (create/update)
     * Converts domain UserCreate to database format (JSON stringified systemRoles)
     */
    const serializeUserInput = (user: UserCreate): SerializedUserInput => {
        return {
            ...user,
            systemRoles: JSON.stringify(user.systemRoles)
        }
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
     * Merge new user data with existing user, preserving and combining systemRoles
     * Used during Heynabo import to prevent overwriting manually assigned roles
     *
     * @param existing - Existing user from database (domain format)
     * @param incoming - New user data (domain format)
     * @returns Merged user with union of roles
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
        serializeUserInput,
        deserializeUser,
        mergeUserRoles
    }
}

// Re-export types
export type User = z.infer<ReturnType<typeof useUserValidation>['BaseUserSchema']>
export type SerializedUser = z.infer<ReturnType<typeof useUserValidation>['SerializedUserSchema']>
export type UserCreate = z.infer<ReturnType<typeof useUserValidation>['UserCreateSchema']>
export type UserUpdate = z.infer<ReturnType<typeof useUserValidation>['UserUpdateSchema']>
export type UserResponse = z.infer<ReturnType<typeof useUserValidation>['UserResponseSchema']>
export type UserDisplay = z.infer<ReturnType<typeof useUserValidation>['UserDisplaySchema']>
export type UserWithInhabitant = z.infer<ReturnType<typeof useUserValidation>['UserWithInhabitantSchema']>
export type LoginCredentials = z.infer<ReturnType<typeof useUserValidation>['LoginSchema']>
