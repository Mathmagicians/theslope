import {z} from 'zod'
import {RoleSchema, DinnerStateSchema} from '~~/prisma/generated/zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useCoreValidation, IdSchema} from '~/composables/useCoreValidation'
import {useDutyValidation} from '~/composables/useDutyValidation'

/**
 * Allocation percentage options for team member assignment forms
 */
export const ALLOCATION_PERCENTAGE_OPTIONS = [
    {label: '25%', value: 25},
    {label: '50%', value: 50},
    {label: '100%', value: 100}
]

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
    const {
        InhabitantDisplaySchema,
        SerializedInhabitantSchema,
        deserializeInhabitantDisplay
    } = useCoreValidation()
    const {JokerSlotSchema, SerializedJokerSlotSchema, deserializeJokerSlot} = useDutyValidation()

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
    // inhabitant is required - assignments always have an inhabitant (inhabitantId is NOT NULL in DB)
    const CookingTeamAssignmentSchema = z.object({
        id: z.number().int().positive().optional(),
        cookingTeamId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        role: TeamRoleSchema,
        allocationPercentage: z.number().min(1).max(100).default(100),
        affinity: WeekDayMapSchemaOptional.nullish(),
        inhabitant: InhabitantDisplaySchema  // Required - always included via Prisma include
    })

    // Full CookingTeam schema (base - for create/update)
    const CookingTeamSchema = BaseCookingTeamSchema

    /**
     * CookingTeamDisplay - Lightweight for lists (ADR-009)
     * Used in: Season.CookingTeams for tables/tabs
     * Includes: assignments (for member count) + cookingDaysCount and jokerSlotCount (aggregates)
     */
    const CookingTeamDisplaySchema = CookingTeamSchema.extend({
        id: z.number().int().positive(),
        assignments: z.array(CookingTeamAssignmentSchema).default([]),
        cookingDaysCount: z.number().int().min(0).default(0),  // Aggregate counts from DB
        jokerSlotCount: z.number().int().min(0).default(0)
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
     * Includes: assignments + dinnerEvents (full array for calendar/filtering), jokerSlots
     */
    const CookingTeamDetailSchema = CookingTeamDisplaySchema.extend({
        dinnerEvents: z.array(DinnerEventDisplayInlineSchema).default([]),
        jokerSlots: z.array(JokerSlotSchema)
    })

    /**
     * CookingTeamCreate - Input schema for creating teams (ADR-009)
     * Omits id (auto-generated), includes optional assignments without ids/inhabitant
     * inhabitant is populated via Prisma include on response, not sent in request
     */
    const CookingTeamCreateSchema = CookingTeamSchema.extend({
        assignments: CookingTeamAssignmentSchema.omit({ id: true, cookingTeamId: true, inhabitant: true }).array().optional()
    }).omit({ id: true })

    /**
     * CookingTeamUpdate - Input schema for updating teams (ADR-009)
     * Requires id, all other fields optional
     */
    const CookingTeamUpdateSchema = CookingTeamSchema.partial().required({ id: true })

    /**
     * CreateTeamsResponse - Operation result envelope for PUT /api/admin/team (ADR-009)
     * Team creation also assigns affinities and cooking teams to the season's dinner events,
     * so the response reports what the operation did, not only the entities it created.
     */
    const CreateTeamsResponseSchema = z.object({
        teams: z.array(CookingTeamDetailSchema),
        eventsAssigned: z.number().int().min(0)
    })

    // Operation result of POST /api/admin/season/[id]/assign-team-affinities (ADR-009)
    const AssignTeamAffinitiesResponseSchema = z.object({
        seasonId: IdSchema,
        teamCount: z.number().int().min(0),
        teams: z.array(CookingTeamDetailSchema)
    })

    /**
     * PrismaTeamUpdateData - Return type for toPrismaUpdateData
     * The columns a team update sets, its affinity serialized; the id stays in the where clause
     */
    const PrismaTeamUpdateDataSchema = CookingTeamUpdateSchema
        .omit({ id: true, affinity: true })
        .extend({ affinity: z.string().nullable().optional() })
    type CookingTeamUpdate = z.infer<typeof CookingTeamUpdateSchema>
    type PrismaTeamUpdateData = z.infer<typeof PrismaTeamUpdateDataSchema>

    /**
     * CookingTeamAssignmentCreate - Input schema for creating assignments (ADR-009)
     * Omits id (auto-generated) and inhabitant (populated via Prisma include on response)
     * Keeps cookingTeamId (sent in request body)
     */
    const CookingTeamAssignmentCreateSchema = CookingTeamAssignmentSchema.omit({ id: true, inhabitant: true })

    /**
     * CookingTeamAssignmentUpdate - Input schema for updating an assignment's seat (ADR-009)
     * The seat fields only, each optional; the allocation drops its create default, so an omitted
     * allocation leaves the stored one as it is
     */
    const CookingTeamAssignmentUpdateSchema = CookingTeamAssignmentSchema
        .pick({ role: true, affinity: true })
        .extend({ allocationPercentage: CookingTeamAssignmentSchema.shape.allocationPercentage.unwrap() })
        .partial()

    /**
     * Plan describing the writes required to assign a role on a dinner.
     * Pure decision output of `decideRoleAssignmentWrites` (useCookingTeam).
     * - nextChefId: the desired post-operation value of DinnerEvent.chefId.
     *   Caller compares to current and writes only on diff.
     *   Captures three intents in one field: promote (= inhabitantId),
     *   demote (= null when the inhabitant was the dinner's chef and now isn't),
     *   leave-alone (= currentDinnerChefId).
     * - assignment: the team-membership upsert payload (always present).
     */
    const RoleAssignmentPlanSchema = z.object({
        nextChefId: IdSchema.nullable(),
        assignment: CookingTeamAssignmentCreateSchema
    })

    // Type definitions (inside composable to avoid circular reference)
    type CookingTeamDisplay = z.infer<typeof CookingTeamDisplaySchema>
    type CookingTeamDetail = z.infer<typeof CookingTeamDetailSchema>

    type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>

    // Database rows (ADR-010): the affinity travels as JSON and an assignment carries its inhabitant's row; a team read
    // counts its dinners and joker slots in `_count`, and a season create reads its teams without assignments or counts
    const SerializedCookingTeamAssignmentSchema = CookingTeamAssignmentSchema.extend({
        affinity: z.string().nullable(),
        inhabitant: SerializedInhabitantSchema
    })

    const SerializedCookingTeamDisplaySchema = CookingTeamSchema.extend({
        id: IdSchema,
        affinity: z.string().nullable(),
        assignments: z.array(SerializedCookingTeamAssignmentSchema).optional(),
        _count: z.object({dinners: z.number().int().min(0), jokerSlots: z.number().int().min(0)}).optional()
    })

    // The Detail read adds the team's joker slot rows and its dinners, which the repository deserializes: a dinner's
    // cost sums its expense rows in useBookingValidation, which imports this composable
    const SerializedCookingTeamDetailSchema = SerializedCookingTeamDisplaySchema.extend({
        dinnerEvents: z.array(DinnerEventDisplayInlineSchema),
        jokerSlots: z.array(SerializedJokerSlotSchema).optional()
    })

    type SerializedCookingTeamAssignment = z.infer<typeof SerializedCookingTeamAssignmentSchema>
    type SerializedCookingTeamDisplay = z.infer<typeof SerializedCookingTeamDisplaySchema>
    type SerializedCookingTeamDetail = z.infer<typeof SerializedCookingTeamDetailSchema>

    // Serialized schema for CookingTeamCreate (Prisma nested create)
    // Handles assignments without inhabitant/cookingTeamId (ADR-009)
    const SerializedCookingTeamCreateSchema = CookingTeamCreateSchema.transform((team) => ({
        seasonId: team.seasonId,
        name: team.name,
        affinity: team.affinity ? serializeWeekDayMap(team.affinity) : null,
        assignments: team.assignments?.map(a => ({
            inhabitantId: a.inhabitantId,
            role: a.role,
            allocationPercentage: a.allocationPercentage,
            affinity: a.affinity ? serializeWeekDayMap(a.affinity) : null
        }))
    }))
    type SerializedCookingTeamCreate = z.infer<typeof SerializedCookingTeamCreateSchema>

    type CookingTeamCreateInput = z.infer<typeof CookingTeamCreateSchema>
    const serializeCookingTeamCreate = (team: CookingTeamCreateInput): SerializedCookingTeamCreate =>
        SerializedCookingTeamCreateSchema.parse(team)

    // Deserialize individual assignment
    const deserializeCookingTeamAssignment = ({affinity, inhabitant, ...assignment}: SerializedCookingTeamAssignment): CookingTeamAssignment =>
        CookingTeamAssignmentSchema.parse({
            ...assignment,
            affinity: affinity ? deserializeWeekDayMap(affinity) : undefined,
            inhabitant: deserializeInhabitantDisplay(inhabitant)
        })

    // A team row's columns as domain values: the affinity parsed, the assignments deserialized, the counts from `_count`
    const deserializeCookingTeamColumns = ({affinity, assignments, _count, ...team}: SerializedCookingTeamDisplay) => ({
        ...team,
        affinity: affinity ? deserializeWeekDayMap(affinity) : undefined,
        assignments: assignments?.map(deserializeCookingTeamAssignment) ?? [],
        cookingDaysCount: _count?.dinners ?? 0,
        jokerSlotCount: _count?.jokerSlots ?? 0
    })

    // Deserialize team Display (for season fetch with CookingTeams, DinnerEventDetail.cookingTeam)
    const deserializeCookingTeamDisplay = (serialized: SerializedCookingTeamDisplay): CookingTeamDisplay =>
        CookingTeamDisplaySchema.parse(deserializeCookingTeamColumns(serialized))

    // Deserialize team Detail (for GET /api/admin/team/[id] endpoint); a read without joker slots returns none
    const deserializeCookingTeamDetail = ({dinnerEvents, jokerSlots, ...team}: SerializedCookingTeamDetail): CookingTeamDetail =>
        CookingTeamDetailSchema.parse({
            ...deserializeCookingTeamColumns(team),
            dinnerEvents,
            jokerSlots: jokerSlots?.map(deserializeJokerSlot) ?? []
        })

    /**
     * Transform team data for Prisma create operations
     * Serializes: affinity (WeekDayMap → JSON string)
     */
    const toPrismaCreateData = (team: CookingTeamCreateInput): SerializedCookingTeamCreate => {
        return serializeCookingTeamCreate(team)
    }

    /**
     * Transform a team update for Prisma: only the fields the update carries; an affinity left out stays undefined
     * (no change) and null clears it
     */
    const toPrismaUpdateData = ({id: _id, affinity, ...columns}: CookingTeamUpdate): PrismaTeamUpdateData =>
        PrismaTeamUpdateDataSchema.parse({...columns, affinity: affinity ? serializeWeekDayMap(affinity) : affinity})

    // Return schemas and utility functions
    return {
        // Client-facing schemas (ADR-009)
        CookingTeamDisplaySchema,            // For lists (Season.CookingTeams)
        CookingTeamDetailSchema,             // For detail views (CookingTeamCard)
        CookingTeamCreateSchema,             // For PUT operations (ADR-009)
        CookingTeamUpdateSchema,             // For POST operations (ADR-009)
        CreateTeamsResponseSchema,           // Operation result for PUT /api/admin/team (ADR-009)
        AssignTeamAffinitiesResponseSchema,  // Operation result for POST /api/admin/season/[id]/assign-team-affinities (ADR-009)
        CookingTeamAssignmentSchema,         // For nested assignments
        CookingTeamAssignmentCreateSchema,   // For creating assignments (ADR-009)
        CookingTeamAssignmentUpdateSchema,   // For updating an assignment (ADR-009)
        RoleAssignmentPlanSchema,            // Plan output from decideRoleAssignmentWrites
        TeamRoleSchema,                      // For role enums
        CookingTeamSchema,                   // Base schema
        DinnerEventDisplayInlineSchema,      // A team's dinners
        // Database rows (ADR-010)
        SerializedCookingTeamAssignmentSchema,
        SerializedCookingTeamDisplaySchema,
        SerializedCookingTeamDetailSchema,
        // Utility functions
        serializeCookingTeamCreate,
        SerializedCookingTeamCreateSchema,
        deserializeCookingTeamDisplay,
        deserializeCookingTeamDetail,
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
export type CreateTeamsResponse = z.infer<ReturnType<typeof useCookingTeamValidation>['CreateTeamsResponseSchema']>
export type CookingTeamAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentSchema']>
export type CookingTeamAssignmentCreate = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentCreateSchema']>
export type CookingTeamAssignmentUpdate = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamAssignmentUpdateSchema']>
export type RoleAssignmentPlan = z.infer<ReturnType<typeof useCookingTeamValidation>['RoleAssignmentPlanSchema']>
export type TeamRole = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamRoleSchema']>
export type DinnerEventDisplayInline = z.infer<ReturnType<typeof useCookingTeamValidation>['DinnerEventDisplayInlineSchema']>
// Database rows (ADR-010)
export type SerializedCookingTeamDisplay = z.infer<ReturnType<typeof useCookingTeamValidation>['SerializedCookingTeamDisplaySchema']>
export type SerializedCookingTeamDetail = z.infer<ReturnType<typeof useCookingTeamValidation>['SerializedCookingTeamDetailSchema']>
