import {z} from 'zod'

// Define schemas outside the composable
const BaseCookingTeamSchema = z.object({
    id: z.number().int().positive().optional(),
    seasonId: z.number().int().positive(),
    name: z.string().min(1, "Team navn skal være mindst 1 karakter").max(100, "Team navn må ikke være længere end 100 karakterer")
})

// Team member role schema
const TeamRoleSchema = z.enum(['CHEF', 'COOK', 'JUNIORHELPER'])

// Team assignment schema
const CookingTeamAssignmentSchema = z.object({
    id: z.number().int().positive().optional(),
    inhabitantId: z.number().int().positive(),
    role: TeamRoleSchema
})

// Full CookingTeam schema
const CookingTeamSchema = BaseCookingTeamSchema

// Team with members schema (no composition validation)
const CookingTeamWithMembersSchema = CookingTeamSchema.extend({
    assignments: z.array(CookingTeamAssignmentSchema).default([])
})

// Bulk member assignment schema
const BulkMemberAssignmentSchema = z.object({
    teamId: z.number().int().positive(),
    members: z.array(z.object({
        inhabitantId: z.number().int().positive(),
        role: TeamRoleSchema
    })).min(1, 'Der skal tildeles mindst ét medlem')
})

// Export types early
export type CookingTeam = z.infer<typeof CookingTeamSchema>
export type CookingTeamWithMembers = z.infer<typeof CookingTeamWithMembersSchema>
export type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>
export type BulkMemberAssignment = z.infer<typeof BulkMemberAssignmentSchema>
export type TeamRole = z.infer<typeof TeamRoleSchema>

/**
 * Validation schemas for CookingTeam objects
 */
export const useCookingTeamValidation = () => {

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

    const validateBulkMemberAssignment = (assignment: unknown): BulkMemberAssignment => {
        return BulkMemberAssignmentSchema.parse(assignment)
    }

    // Utility functions for team member counts
    const getTeamMemberCounts = (team: CookingTeamWithMembers):number => {
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
        TeamRoleSchema,
        CookingTeamAssignmentSchema,
        BulkMemberAssignmentSchema,
        validateCookingTeam,
        validateCookingTeamWithMembers,
        validateMemberAssignment,
        validateBulkMemberAssignment,
        getTeamMemberCounts,
        getAssignmentIdsForRole
    }
}
