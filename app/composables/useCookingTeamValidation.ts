import {z} from 'zod'
import {RoleSchema} from '~~/prisma/generated/zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useHouseholdValidation} from '~/composables/useHouseholdValidation'
import type {WeekDayMap} from '~/types/dateTypes'

/**
 * Role display labels (Danish)
 */
export const ROLE_LABELS = {
    CHEF: 'Chefkok',
    COOK: 'Kok',
    JUNIORHELPER: 'Kokkespire'
} as const

/**
 * Role icons for visual distinction
 */
export const ROLE_ICONS = {
    CHEF: '👨‍🍳',
    COOK: '👥',
    JUNIORHELPER: '🌱‍👩‍🍳'
} as const

/**
 * Validation schemas for CookingTeam objects
 */
export const useCookingTeamValidation = () => {
    // Get WeekDayMap utilities with explicit boolean options for affinity
    const {
        WeekDayMapSchemaOptional,
        serializeWeekDayMap,
        deserializeWeekDayMap,
        createWeekDayMapFromSelection
    } = useWeekDayMapValidation<boolean>({
        valueSchema: z.boolean(),
        defaultValue: false
    })

    // Get Inhabitant display schema for nested relations
    const {InhabitantDisplaySchema} = useHouseholdValidation()

    // Use generated Role schema from Prisma (aliased as TeamRoleSchema for backward compatibility)
    const TeamRoleSchema = RoleSchema

    // Define schemas
    const BaseCookingTeamSchema = z.object({
        id: z.number().int().positive().optional(),
        seasonId: z.number().int().positive(), name: z.string().min(1, "Team navn skal være mindst 1 tegn langt")
            .max(100, "Team navn må ikke være længere end 100 tegn"),
        affinity: WeekDayMapSchemaOptional.nullish()
    })

    // Base team assignment schema (uses cookingTeamId to match database)
    const CookingTeamAssignmentSchema = z.object({
        id: z.number().int().positive().optional(),
        cookingTeamId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        role: TeamRoleSchema,
        allocationPercentage: z.number().min(1).max(100).default(100),
        affinity: WeekDayMapSchemaOptional.nullish(),
        inhabitant: InhabitantDisplaySchema.optional()  // Nested inhabitant from Prisma includes
    })

    // Full CookingTeam schema
    const CookingTeamSchema = BaseCookingTeamSchema

    // Team with members schema (no composition validation)
    const CookingTeamWithMembersSchema = CookingTeamSchema.extend({
        assignments: z.array(CookingTeamAssignmentSchema).default([])
    })

    // Type definitions (inside composable to avoid circular reference)
    type CookingTeam = z.infer<typeof CookingTeamSchema>
    type CookingTeamWithMembers = z.infer<typeof CookingTeamWithMembersSchema>
    type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>
    type TeamRole = z.infer<typeof TeamRoleSchema>

    // Transform schema for serialization (converts WeekDayMap to JSON string)
    const SerializedCookingTeamAssignmentSchema = CookingTeamAssignmentSchema.transform((assignment) => ({
        ...assignment,
        affinity: assignment.affinity ? serializeWeekDayMap(assignment.affinity) : null
    }))

    const SerializedCookingTeamWithMembersSchema = CookingTeamWithMembersSchema.transform((team) => ({
        ...team,
        affinity: team.affinity ? serializeWeekDayMap(team.affinity) : null,
        assignments: team.assignments?.map(assignment => SerializedCookingTeamAssignmentSchema.parse(assignment)) || []
    }))

    type SerializedCookingTeam = z.infer<typeof SerializedCookingTeamWithMembersSchema>

    // Serialize aggregate root (team + nested assignments)
    const serializeCookingTeam = (team: CookingTeamWithMembers): SerializedCookingTeam => {
        return SerializedCookingTeamWithMembersSchema.parse(team)
    }

    // Deserialize individual assignment
    const deserializeCookingTeamAssignment = (serialized: any): CookingTeamAssignment => {
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity) : undefined
        }
        return CookingTeamAssignmentSchema.parse(deserialized)
    }

    // Deserialize aggregate root (team + nested assignments)
    const deserializeCookingTeam = (serialized: SerializedCookingTeam): CookingTeamWithMembers => {
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity) : undefined,
            assignments: serialized.assignments?.map(assignment => deserializeCookingTeamAssignment(assignment)) || []
        }

        return CookingTeamWithMembersSchema.parse(deserialized)
    }

    // Validation functions
    const validateCookingTeam = (team: unknown): CookingTeam => {
        return CookingTeamSchema.parse(team)
    }

    const validateCookingTeamWithMembers = (team: unknown): CookingTeamWithMembers => {
        return CookingTeamWithMembersSchema.parse(team)
    }

    const validateMemberAssignment = (assignment: unknown): CookingTeamAssignment => {
        return CookingTeamAssignmentSchema.parse(assignment)
    }

    // Utility functions for team member counts
    const getTeamMemberCounts = (team: CookingTeamWithMembers): number => {
        return team.assignments.length
    }

    const getAssignmentIdsForRole = (team: CookingTeamWithMembers, role?: TeamRole) =>
        (role ? team.assignments.filter(c => c.role === role) : team.assignments)
            .map(c => c.inhabitantId)


    // Return schemas and utility functions
    return {
        BaseCookingTeamSchema,
        CookingTeamSchema,
        CookingTeamWithMembersSchema,
        SerializedCookingTeamWithMembersSchema,
        TeamRoleSchema,
        CookingTeamAssignmentSchema,
        validateCookingTeam,
        validateCookingTeamWithMembers,
        validateMemberAssignment,
        getTeamMemberCounts,
        getAssignmentIdsForRole,
        serializeCookingTeam,
        deserializeCookingTeam,
        deserializeCookingTeamAssignment,
        // Export configured WeekDayMap functions for team affinity
        createWeekDayMapFromSelection,
        serializeWeekDayMap,
        deserializeWeekDayMap
    }
}

// Re-export types
export type CookingTeam = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamSchema']>
export type CookingTeamWithMembers = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamWithMembersSchema']>
export type SerializedCookingTeam = z.infer<ReturnType<typeof useCookingTeamValidation>['SerializedCookingTeamWithMembersSchema']>
export type CookingTeamAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentSchema']>
export type TeamRole = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamRoleSchema']>
