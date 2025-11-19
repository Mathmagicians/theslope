import {z} from 'zod'
import {RoleSchema, DinnerStateSchema} from '~~/prisma/generated/zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
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
    const {InhabitantDisplaySchema} = useCoreValidation()

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

    // Full CookingTeam schema (base - for create/update)
    const CookingTeamSchema = BaseCookingTeamSchema

    /**
     * CookingTeamDisplay - Lightweight for lists (ADR-009)
     * Used in: Season.CookingTeams for tables/tabs
     * Includes: assignments (for member count) + cookingDaysCount (aggregate)
     */
    const CookingTeamDisplaySchema = CookingTeamSchema.extend({
        assignments: z.array(CookingTeamAssignmentSchema).default([]),
        cookingDaysCount: z.number().int().min(0).default(0)  // Aggregate count from DB
    })

    /**
     * Inline DinnerEventDisplay schema - minimal fields to avoid circular dependency with useBookingValidation
     * Following pattern from HouseholdSummarySchema which defines inline InhabitantDisplaySchema
     */
    const DinnerEventDisplayInlineSchema = z.object({
        id: z.number().int().positive(),
        date: z.coerce.date(),
        menuTitle: z.string().max(500),
        menuDescription: z.string().nullable(),
        menuPictureUrl: z.string().nullable(),
        state: DinnerStateSchema,
        totalCost: z.number().int().min(0),
        chefId: z.number().int().positive().nullable(),
        cookingTeamId: z.number().int().positive().nullable(),
        heynaboEventId: z.number().int().positive().nullable(),
        seasonId: z.number().int().positive().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    /**
     * CookingTeamDetail - Full detail with relations (ADR-009)
     * Used in: CookingTeamCard detail view (EDIT/MONITOR modes)
     * Includes: assignments + dinnerEvents (full array for calendar/filtering)
     */
    const CookingTeamDetailSchema = CookingTeamDisplaySchema.extend({
        dinnerEvents: z.array(DinnerEventDisplayInlineSchema).default([])
    })

    // Type definitions (inside composable to avoid circular reference)
    type CookingTeam = z.infer<typeof CookingTeamSchema>
    type CookingTeamDisplay = z.infer<typeof CookingTeamDisplaySchema>
    type CookingTeamDetail = z.infer<typeof CookingTeamDetailSchema>
    type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>
    type TeamRole = z.infer<typeof TeamRoleSchema>

    // Transform schema for serialization (converts WeekDayMap to JSON string)
    const SerializedCookingTeamAssignmentSchema = CookingTeamAssignmentSchema.transform((assignment) => ({
        ...assignment,
        affinity: assignment.affinity ? serializeWeekDayMap(assignment.affinity) : null
    }))

    const SerializedCookingTeamDisplaySchema = CookingTeamDisplaySchema.transform((team) => ({
        ...team,
        affinity: team.affinity ? serializeWeekDayMap(team.affinity) : null,
        assignments: team.assignments?.map(assignment => SerializedCookingTeamAssignmentSchema.parse(assignment)) || []
    }))

    type SerializedCookingTeamDisplay = z.infer<typeof SerializedCookingTeamDisplaySchema>

    // Serialize team Display (for season fetch)
    const serializeCookingTeam = (team: CookingTeamDisplay): SerializedCookingTeamDisplay => {
        return SerializedCookingTeamDisplaySchema.parse(team)
    }

    // Deserialize individual assignment
    const deserializeCookingTeamAssignment = (serialized: any): CookingTeamAssignment => {
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity) : undefined
        }
        return CookingTeamAssignmentSchema.parse(deserialized)
    }

    // Deserialize team Display (for season fetch with CookingTeams)
    const deserializeCookingTeam = (serialized: SerializedCookingTeamDisplay): CookingTeamDisplay => {
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity) : undefined,
            assignments: serialized.assignments?.map(assignment => deserializeCookingTeamAssignment(assignment)) || []
        }

        return CookingTeamDisplaySchema.parse(deserialized)
    }

    // Deserialize team Detail (for GET /api/admin/team/[id] endpoint)
    const deserializeCookingTeamDetail = (serialized: any): CookingTeamDetail => {
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity) : undefined,
            assignments: serialized.assignments?.map((assignment: any) => deserializeCookingTeamAssignment(assignment)) || [],
            dinnerEvents: serialized.dinnerEvents || []
        }

        return CookingTeamDetailSchema.parse(deserialized)
    }

    // Utility functions for team member counts
    const getTeamMemberCounts = (team: CookingTeamDisplay): number => {
        return team.assignments.length
    }

    const getAssignmentIdsForRole = (team: CookingTeamDisplay, role?: TeamRole) =>
        (role ? team.assignments.filter(c => c.role === role) : team.assignments)
            .map(c => c.inhabitantId)

    /**
     * Transform team data for Prisma create operations
     * Excludes: id (auto-generated), cookingDaysCount (computed), dinnerEvents (read-only)
     * Serializes: affinity (WeekDayMap → JSON string)
     */
    const toPrismaCreateData = (team: Partial<CookingTeamDetail>) => {
        // Serialize domain types (WeekDayMap → JSON string)
        const serialized = serializeCookingTeam(team as CookingTeamDisplay)

        // Extract only Prisma-valid fields (exclude computed/read-only)
        const { id, cookingDaysCount, dinnerEvents, ...prismaData } = serialized

        return prismaData
    }

    /**
     * Transform team data for Prisma update operations
     * Same as create but all fields optional
     */
    const toPrismaUpdateData = (team: Partial<CookingTeamDetail>) => {
        return toPrismaCreateData(team)
    }

    // Validation helper for tests
    const validateCookingTeam = (team: unknown) => {
        return CookingTeamDisplaySchema.parse(team)
    }

    // Return schemas and utility functions - ONLY expose Display and Detail patterns
    return {
        // Client-facing schemas (ADR-009)
        CookingTeamDisplaySchema,     // For lists (Season.CookingTeams)
        CookingTeamDetailSchema,      // For detail views (CookingTeamCard)
        CookingTeamAssignmentSchema,  // For nested assignments
        TeamRoleSchema,               // For role enums
        CookingTeamSchema,            // For create/update
        // Validation helper
        validateCookingTeam,
        // Utility functions
        getTeamMemberCounts,
        getAssignmentIdsForRole,
        serializeCookingTeam,
        deserializeCookingTeam,
        deserializeCookingTeamDetail,
        deserializeCookingTeamAssignment,
        // Prisma transformation functions
        toPrismaCreateData,
        toPrismaUpdateData,
        // WeekDayMap functions for affinity
        createWeekDayMapFromSelection,
        serializeWeekDayMap,
        deserializeWeekDayMap
    }
}

// Export types - ONLY Display and Detail patterns for entities (ADR-009)
export type CookingTeamDisplay = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamDisplaySchema']>
export type CookingTeamDetail = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamDetailSchema']>
export type CookingTeamAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentSchema']>
export type TeamRole = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamRoleSchema']>
