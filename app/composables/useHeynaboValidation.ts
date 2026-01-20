import {z} from "zod";
import type { HouseholdCreate, InhabitantCreate, UserCreate, UserDisplay } from './useCoreValidation'
import { useCoreValidation } from './useCoreValidation'

export const useHeynaboValidation = () => {

    // ========================================================================
    // HEYNABO API SCHEMAS - External data validation
    // ========================================================================

    const HeynaboMemberSchema = z.object({
        id: z.number(),
        type: z.string(),
        email: z.string().email().or(z.string().transform(() => null)).or(z.null()),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string().nullable(),
        emergencyContact: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        description: z.string().nullable(),
        uiStorage: z.string().nullable(),
        role: z.string(),
        roles: z.array(z.string()).nullable().transform((v) => v ?? []),
        avatar: z.string().url().nullable(),
        alias: z.string().nullable(),
        locationId: z.number(),
        isFirstLogin: z.boolean(),
        lastLogin: z.string(),
        inviteSent: z.string().nullable(),
        created: z.string()
    })

    const HeynaboUserSchema = HeynaboMemberSchema.extend({
        email: z.string().email()
    })

    const LoggedInHeynaboUserSchema = HeynaboUserSchema.extend({
        token: z.string().nonempty(),
    })

    const HeynaboLocationSchema = z.object({
        id: z.number(),
        type: z.string(),
        address: z.string(),
        street: z.string(),
        streetNumber: z.union([z.string(), z.number()]).nullable(),
        floor: z.string().nullable(),
        ext: z.string().nullable(),
        map: z.string().nullable(),
        city: z.string().nullable(),
        zipCode: z.string().nullable(),
        typeId: z.number(),
        hidden: z.boolean()
    })

    type HeynaboMember = z.infer<typeof HeynaboMemberSchema>
    type HeynaboLocation = z.infer<typeof HeynaboLocationSchema>

    // Get SystemRole enum from useCoreValidation (ADR-001 compliance)
    const { SystemRoleSchema } = useCoreValidation()
    const SystemRole = SystemRoleSchema.enum

    /**
     * Transformation functions for Heynabo data import
     * Pure functions with no side effects - unit testable
     */

    /**
     * Maps Heynabo role to TheSlope SystemRole enum values
     *
     * @param heynaboRole - The role string from Heynabo API
     * @returns Array of SystemRole enum values
     */
    const mapHeynaboRoleToSystemRole = (heynaboRole: string): typeof SystemRole[keyof typeof SystemRole][] => {
        // Only 'admin' role gets ADMIN system role
        if (['admin', 'full'].includes(heynaboRole) && heynaboRole === 'admin') {
            return [SystemRole.ADMIN]
        }
        return []
    }

    /**
     * Transforms a HeynaboMember into an InhabitantCreate (without householdId - repository handles it)
     *
     * @param member - The HeynaboMember data from the API
     * @returns InhabitantCreate without householdId, ready for nested household creation
     */
    const inhabitantFromMember = (member: HeynaboMember): Omit<InhabitantCreate, 'householdId'> => {
        const inhabitant: Omit<InhabitantCreate, 'householdId'> = {
            heynaboId: member.id,
            pictureUrl: member.avatar,
            name: member.firstName,
            lastName: member.lastName,
            birthDate: member.dateOfBirth ? new Date(member.dateOfBirth) : null
        }

        // Only create user if member has email and is not 'limited' role
        if (member.email && member.role !== 'limited') {
            // Domain format - saveUser in repository will serialize (ADR-010 pattern)
            const userDomain: UserCreate = {
                email: member.email,
                phone: member.phone,
                passwordHash: 'removeme',
                systemRoles: mapHeynaboRoleToSystemRole(member.role)
            }
            inhabitant.user = userDomain
        }

        return inhabitant
    }

    /**
     * Finds and transforms all members belonging to a specific location
     *
     * @param locationId - The Heynabo location ID to filter by
     * @param members - Array of all HeynaboMember data
     * @returns Array of InhabitantCreate without householdId for this location
     */
    const findInhabitantsByLocation = (locationId: number, members: HeynaboMember[]): Omit<InhabitantCreate, 'householdId'>[] => {
        return members
            .filter(member => member.locationId === locationId)
            .map(member => inhabitantFromMember(member))
    }

    /**
     * Transforms Heynabo locations and members into TheSlope household data structure
     * Pure function with no side effects - perfect for unit testing
     *
     * @param locations - Array of HeynaboLocation data from API
     * @param members - Array of HeynaboMember data from API
     * @returns Array of HouseholdCreate ready for database creation
     */
    const createHouseholdsFromImport = (locations: HeynaboLocation[], members: HeynaboMember[]): HouseholdCreate[] => {
        const households = locations.map(location => {
            const newHousehold: HouseholdCreate = {
                heynaboId: location.id,
                movedInDate: new Date(), // Date of first import (preserved on subsequent imports)
                pbsId: location.id, // Default initial value (preserved on subsequent imports)
                name: location.address.replace(/[^a-zA-Z]*/g, location.address.substring(0, 1)),
                address: location.address,
                inhabitants: findInhabitantsByLocation(location.id, members)
            }

            return newHousehold
        })

        return households
    }

    // ========================================================================
    // SANITY CHECK SCHEMA - Validates import result
    // ========================================================================

    const { UserDisplaySchema } = useCoreValidation()

    const SanityCheckResultSchema = z.object({
        passed: z.boolean().default(true),
        orphanUsers: z.array(UserDisplaySchema).default([]),
        // Count comparisons: DB vs Heynabo
        householdsInDb: z.number().default(0),
        householdsInHeynabo: z.number().default(0),
        householdsMismatch: z.boolean().default(false),
        inhabitantsInDb: z.number().default(0),
        inhabitantsInHeynabo: z.number().default(0),
        inhabitantsMismatch: z.boolean().default(false),
        usersInDb: z.number().default(0),
        usersInHeynabo: z.number().default(0),
        usersMismatch: z.boolean().default(false)
    })

    /**
     * Sanity check: Verify HN import integrity
     * Compares counts: DB vs Heynabo for households, inhabitants, users
     *
     * @param dbCounts - Counts from DB after import { households, inhabitants, users }
     * @param users - Array of UserDisplay to check for orphans
     * @param incomingHouseholds - HN import data (source of truth)
     * @returns SanityCheckResult with counts and mismatch flags
     */
    const sanityCheck = (
        dbCounts: { households: number; inhabitants: number; users: number },
        users: UserDisplay[],
        incomingHouseholds: HouseholdCreate[]
    ): z.infer<typeof SanityCheckResultSchema> => {
        // Count expected from Heynabo
        const householdsInHeynabo = incomingHouseholds.length
        const inhabitantsInHeynabo = incomingHouseholds.reduce(
            (sum, h) => sum + (h.inhabitants?.length || 0), 0
        )
        const usersInHeynabo = incomingHouseholds.reduce(
            (sum, h) => sum + (h.inhabitants?.filter(i => i.user)?.length || 0), 0
        )

        // Build set of emails that SHOULD have inhabitant (from HN data)
        const expectedUserEmails = new Set<string>()
        for (const household of incomingHouseholds) {
            for (const inhabitant of household.inhabitants || []) {
                if (inhabitant.user?.email) {
                    expectedUserEmails.add(inhabitant.user.email)
                }
            }
        }

        // Find orphans: users from HN (in expectedUserEmails) that don't have Inhabitant
        const orphanUsers = users.filter(u =>
            expectedUserEmails.has(u.email) &&
            u.Inhabitant === null
        )

        // Check mismatches
        const householdsMismatch = dbCounts.households !== householdsInHeynabo
        const inhabitantsMismatch = dbCounts.inhabitants !== inhabitantsInHeynabo
        const usersMismatch = dbCounts.users !== usersInHeynabo

        const passed = orphanUsers.length === 0 &&
            !householdsMismatch &&
            !inhabitantsMismatch &&
            !usersMismatch

        return SanityCheckResultSchema.parse({
            passed,
            orphanUsers,
            householdsInDb: dbCounts.households,
            householdsInHeynabo,
            householdsMismatch,
            inhabitantsInDb: dbCounts.inhabitants,
            inhabitantsInHeynabo,
            inhabitantsMismatch,
            usersInDb: dbCounts.users,
            usersInHeynabo,
            usersMismatch
        })
    }

    // ========================================================================
    // HEYNABO IMPORT RESPONSE SCHEMA - Summary of sync operation (ADR-009: batch ops use lightweight types)
    // Reports all 4 reconciliation outcomes (create, update, idempotent, delete) for each entity type
    // ========================================================================

    const HeynaboImportResponseSchema = z.object({
        jobRunId: z.number().int().positive(),
        // Households: all 4 outcomes
        householdsCreated: z.number(),
        householdsUpdated: z.number().default(0),
        householdsIdempotent: z.number().default(0),
        householdsDeleted: z.number(),
        // Inhabitants: all 4 outcomes
        inhabitantsCreated: z.number(),
        inhabitantsUpdated: z.number().default(0),
        inhabitantsIdempotent: z.number().default(0),
        inhabitantsDeleted: z.number(),
        // Users: all 4 outcomes + linked + admin tracking
        usersCreated: z.number(),
        usersUpdated: z.number().default(0),
        usersIdempotent: z.number().default(0),
        usersDeleted: z.number().default(0),
        usersLinked: z.number().default(0),
        adminsAdded: z.number().default(0),
        adminsRemoved: z.number().default(0),
        sanityCheck: SanityCheckResultSchema.default({})
    })

    return {
        HeynaboMemberSchema,
        HeynaboUserSchema,
        LoggedInHeynaboUserSchema,
        HeynaboLocationSchema,
        HeynaboImportResponseSchema,
        SanityCheckResultSchema,
        // Transformation functions
        mapHeynaboRoleToSystemRole,
        inhabitantFromMember,
        findInhabitantsByLocation,
        createHouseholdsFromImport,
        sanityCheck
    }
}

// Re-export types
export type HeynaboMember = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboMemberSchema']>
export type HeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboUserSchema']>
export type LoggedInHeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['LoggedInHeynaboUserSchema']>
export type HeynaboLocation = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboLocationSchema']>
export type HeynaboImportResponse = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboImportResponseSchema']>
export type SanityCheckResult = z.infer<ReturnType<typeof useHeynaboValidation>['SanityCheckResultSchema']>
