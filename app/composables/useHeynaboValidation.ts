import {z} from "zod";
import type { HouseholdCreateWithInhabitants, InhabitantCreate, UserCreate } from './useCoreValidation'
import { useCoreValidation } from './useCoreValidation'

export const useHeynaboValidation = () => {

    const HeynaboMemberSchema = z.object({
        id: z.number(),
        type: z.string(),
        email: z.string().email().or(z.string().transform((val) => null)).or(z.null()),
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
     * Transforms a HeynaboMember into an InhabitantCreate
     *
     * @param locationId - The Heynabo location ID this member belongs to
     * @param member - The HeynaboMember data from the API
     * @returns InhabitantCreate ready for database creation
     */
    const inhabitantFromMember = (locationId: number, member: HeynaboMember): InhabitantCreate => {
        const inhabitant: InhabitantCreate = {
            heynaboId: member.id,
            householdId: locationId, // Will be overridden when nested in household creation
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
     * @returns Array of InhabitantCreate for this location
     */
    const findInhabitantsByLocation = (locationId: number, members: HeynaboMember[]): InhabitantCreate[] => {
        return members
            .filter(member => member.locationId === locationId)
            .map(member => inhabitantFromMember(locationId, member))
    }

    /**
     * Transforms Heynabo locations and members into TheSlope household data structure
     * Pure function with no side effects - perfect for unit testing
     *
     * @param locations - Array of HeynaboLocation data from API
     * @param members - Array of HeynaboMember data from API
     * @returns Array of HouseholdCreateWithInhabitants ready for database creation
     */
    const createHouseholdsFromImport = (locations: HeynaboLocation[], members: HeynaboMember[]): HouseholdCreateWithInhabitants[] => {
        const households = locations.map(location => {
            const newHousehold: HouseholdCreateWithInhabitants = {
                heynaboId: location.id,
                movedInDate: new Date('2019-06-25'),
                pbsId: location.id, // FIXME - import pbs from csv file
                name: location.address.replace(/[^a-zA-Z]*/g, location.address.substring(0, 1)),
                address: location.address,
                inhabitants: findInhabitantsByLocation(location.id, members)
            }

            return newHousehold
        })

        return households
    }

    return {
        HeynaboMemberSchema,
        HeynaboUserSchema,
        LoggedInHeynaboUserSchema,
        HeynaboLocationSchema,
        // Transformation functions
        mapHeynaboRoleToSystemRole,
        inhabitantFromMember,
        findInhabitantsByLocation,
        createHouseholdsFromImport
    }
}

// Re-export types
export type HeynaboMember = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboMemberSchema']>
export type HeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboUserSchema']>
export type LoggedInHeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['LoggedInHeynaboUserSchema']>
export type HeynaboLocation = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboLocationSchema']>
