import {z} from 'zod'
import {RoleSchema, DinnerStateSchema} from '~~/prisma/generated/zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {WeekDayMap as _WeekDayMap} from '~/types/dateTypes'

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
        serializeWeekDayMapNullable,
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

    /**
     * CookingTeamCreate - Input schema for creating teams (ADR-009)
     * Omits id (auto-generated), includes optional assignments without ids
     */
    const CookingTeamCreateSchema = CookingTeamSchema.extend({
        assignments: CookingTeamAssignmentSchema.omit({ id: true, cookingTeamId: true }).array().optional()
    }).omit({ id: true })

    /**
     * CookingTeamUpdate - Input schema for updating teams (ADR-009)
     * Requires id, all other fields optional
     */
    const CookingTeamUpdateSchema = CookingTeamSchema.partial().required({ id: true })

    /**
     * PrismaTeamUpdateData - Return type for toPrismaUpdateData
     * Derived from CookingTeamDetailSchema, excludes computed fields, serializes affinity
     */
    const PrismaTeamUpdateDataSchema = CookingTeamDetailSchema
        .omit({ id: true, cookingDaysCount: true, dinnerEvents: true, affinity: true })
        .extend({ affinity: z.string().nullable().optional() })
        .partial()

    /**
     * CookingTeamAssignmentCreate - Input schema for creating assignments (ADR-009)
     * Omits id (auto-generated) and cookingTeamId (from URL param)
     */
    const CookingTeamAssignmentCreateSchema = CookingTeamAssignmentSchema.omit({ id: true, cookingTeamId: true })

    // Type definitions (inside composable to avoid circular reference)
    type CookingTeamDisplay = z.infer<typeof CookingTeamDisplaySchema>
    type CookingTeamDetail = z.infer<typeof CookingTeamDetailSchema>
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

    // Serialize individual assignment (for Prisma create/update)
    // ADR-010: Repository calls this before writing to DB
    const serializeCookingTeamAssignment = (assignment: z.infer<typeof CookingTeamAssignmentSchema>) => {
        const {id: _id, cookingTeamId: _teamId, inhabitant: _inhabitant, affinity, ...rest} = assignment
        return {
            ...rest,
            affinity: affinity ? serializeWeekDayMap(affinity) : null
        }
    }

    // Deserialize individual assignment
    const deserializeCookingTeamAssignment = (serialized: Record<string, unknown>): z.infer<typeof CookingTeamAssignmentSchema> => {
        const {deserializeInhabitantDisplay} = useCoreValidation()

        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity as string) : undefined,
            // Deserialize nested inhabitant if present
            inhabitant: serialized.inhabitant ? deserializeInhabitantDisplay(serialized.inhabitant as Record<string, unknown>) : undefined
        }
        return CookingTeamAssignmentSchema.parse(deserialized)
    }

    // Deserialize team Display (for season fetch with CookingTeams)
    const deserializeCookingTeam = (serialized: Record<string, unknown>): CookingTeamDisplay => {
        const assignments = serialized.assignments as Record<string, unknown>[] | undefined
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity as string) : undefined,
            assignments: assignments?.map(assignment => deserializeCookingTeamAssignment(assignment)) || []
        }

        return CookingTeamDisplaySchema.parse(deserialized)
    }

    // Deserialize team Detail (for GET /api/admin/team/[id] endpoint)
    const deserializeCookingTeamDetail = (serialized: Record<string, unknown>): CookingTeamDetail => {
        const assignments = serialized.assignments as Record<string, unknown>[] | undefined
        const dinnerEvents = serialized.dinnerEvents as Record<string, unknown>[] | undefined
        const deserialized = {
            ...serialized,
            affinity: serialized.affinity ? deserializeWeekDayMap(serialized.affinity as string) : undefined,
            assignments: assignments?.map((assignment) => deserializeCookingTeamAssignment(assignment)) || [],
            // Parse dinner events through inline schema to convert ISO date strings to Date objects
            dinnerEvents: dinnerEvents?.map((event) => DinnerEventDisplayInlineSchema.parse(event)) || []
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
     * Accepts: CookingTeamCreate (PUT input) or Partial<CookingTeamDetail> (generic)
     * Excludes: id (auto-generated), cookingDaysCount (computed), dinnerEvents (read-only)
     * Serializes: affinity (WeekDayMap → JSON string)
     */
    const toPrismaCreateData = (team: z.infer<typeof CookingTeamCreateSchema> | Partial<z.infer<typeof CookingTeamDetailSchema>>) => {
        // Extract read-only fields first (they may not exist on CookingTeamCreate)
        const { id: _id, dinnerEvents: _dinnerEvents, ...teamData } = team as Record<string, unknown>

        // Serialize domain types (WeekDayMap → JSON string)
        const serialized = serializeCookingTeam(teamData as CookingTeamDisplay)

        // Exclude computed fields (schema adds defaults)
        const { cookingDaysCount: _cookingDaysCount, ...prismaData } = serialized
        return prismaData
    }

    /**
     * Transform team data for Prisma update operations
     * Accepts: CookingTeamUpdate (POST input) or Partial<CookingTeamDetail> (generic)
     * Handles partial updates - only serializes fields that are present
     */
    const toPrismaUpdateData = (team: z.infer<typeof CookingTeamUpdateSchema> | Partial<z.infer<typeof CookingTeamDetailSchema>>): z.infer<typeof PrismaTeamUpdateDataSchema> => {
        const { id: _id, cookingDaysCount: _cookingDaysCount, dinnerEvents: _dinnerEvents, affinity, assignments, ...rest } = team as Record<string, unknown>

        const result = {
            ...rest,
            affinity: affinity ? serializeWeekDayMap(affinity as _WeekDayMap<boolean>) : affinity as string | null | undefined,
            assignments: assignments as z.infer<typeof CookingTeamAssignmentSchema>[] | undefined
        }

        return PrismaTeamUpdateDataSchema.parse(result)
    }

    // Validation helper for tests
    const validateCookingTeam = (team: unknown) => {
        return CookingTeamDisplaySchema.parse(team)
    }

    // Return schemas and utility functions
    return {
        // Client-facing schemas (ADR-009)
        CookingTeamDisplaySchema,            // For lists (Season.CookingTeams)
        CookingTeamDetailSchema,             // For detail views (CookingTeamCard)
        CookingTeamCreateSchema,             // For PUT operations (ADR-009)
        CookingTeamUpdateSchema,             // For POST operations (ADR-009)
        CookingTeamAssignmentSchema,         // For nested assignments
        CookingTeamAssignmentCreateSchema,   // For creating assignments (ADR-009)
        TeamRoleSchema,                      // For role enums
        CookingTeamSchema,                   // Base schema
        // Validation helper
        validateCookingTeam,
        // Utility functions
        getTeamMemberCounts,
        getAssignmentIdsForRole,
        serializeCookingTeam,
        deserializeCookingTeam,
        deserializeCookingTeamDetail,
        serializeCookingTeamAssignment,
        deserializeCookingTeamAssignment,
        // Prisma transformation functions
        toPrismaCreateData,
        toPrismaUpdateData,
        // WeekDayMap functions for affinity
        createWeekDayMapFromSelection,
        serializeWeekDayMap,
        serializeWeekDayMapNullable,
        deserializeWeekDayMap
    }
}

// Export types (ADR-009)
export type CookingTeamDisplay = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamDisplaySchema']>
export type CookingTeamDetail = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamDetailSchema']>
export type CookingTeamCreate = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamCreateSchema']>
export type CookingTeamUpdate = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamUpdateSchema']>
export type CookingTeamAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentSchema']>
export type CookingTeamAssignmentCreate = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentCreateSchema']>
export type TeamRole = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamRoleSchema']>
