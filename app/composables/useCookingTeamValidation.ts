import {z} from 'zod'

/**
 * Validation schemas for CookingTeam objects
 */
export const useCookingTeamValidation = () => {
  // Base CookingTeam schema
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
    chefs: z.array(CookingTeamAssignmentSchema).default([]),
    cooks: z.array(CookingTeamAssignmentSchema).default([]),
    juniorHelpers: z.array(CookingTeamAssignmentSchema).default([])
  })

  // Member assignment schema for API operations
  const TeamMemberAssignmentSchema = z.object({
    teamId: z.number().int().positive(),
    inhabitantId: z.number().int().positive(),
    role: TeamRoleSchema
  })

  // Bulk member assignment schema
  const BulkMemberAssignmentSchema = z.object({
    teamId: z.number().int().positive(),
    members: z.array(z.object({
      inhabitantId: z.number().int().positive(),
      role: TeamRoleSchema
    })).min(1, 'Der skal tildeles mindst ét medlem')
  })

  // Type definitions
  type CookingTeam = z.infer<typeof CookingTeamSchema>
  type CookingTeamWithMembers = z.infer<typeof CookingTeamWithMembersSchema>
  type TeamMemberAssignment = z.infer<typeof TeamMemberAssignmentSchema>
  type BulkMemberAssignment = z.infer<typeof BulkMemberAssignmentSchema>

  // Validation functions
  const validateCookingTeam = (team: unknown): CookingTeam => {
    return CookingTeamSchema.parse(team)
  }

  const validateCookingTeamWithMembers = (team: unknown): CookingTeamWithMembers => {
    return CookingTeamWithMembersSchema.parse(team)
  }

  const validateMemberAssignment = (assignment: unknown): TeamMemberAssignment => {
    return TeamMemberAssignmentSchema.parse(assignment)
  }

  const validateBulkMemberAssignment = (assignment: unknown): BulkMemberAssignment => {
    return BulkMemberAssignmentSchema.parse(assignment)
  }

  // Utility functions for team member counts
  const getTeamMemberCounts = (team: CookingTeamWithMembers) => {
    return {
      total: team.chefs.length + team.cooks.length + team.juniorHelpers.length,
      chefs: team.chefs.length,
      cooks: team.cooks.length,
      juniorHelpers: team.juniorHelpers.length
    }
  }

  const getAllAssignmentIds = (team: CookingTeamWithMembers) =>  [
        ...team.chefs.map(c => c.id),
        ...team.cooks.map(c => c.id),
        ...team.juniorHelpers.map(c => c.id)
    ]


    const validateTeamComposition = (team: CookingTeamWithMembers) => {
    const counts = getTeamMemberCounts(team)
    const errors: string[] = []

    if (counts.chefs === 0) {
      errors.push('Holdet skal have mindst én køkkenchef')
    }

    return {
      isValid: errors.length === 0,
      errors,
      counts
    }
  }

  // Return schemas and utility functions
  return {
    BaseCookingTeamSchema,
    CookingTeamSchema,
    CookingTeamWithMembersSchema,
    TeamRoleSchema,
    CookingTeamAssignmentSchema,
    TeamMemberAssignmentSchema,
    BulkMemberAssignmentSchema,
    validateCookingTeam,
    validateCookingTeamWithMembers,
    validateMemberAssignment,
    validateBulkMemberAssignment,
    getTeamMemberCounts,
    getAllAssignmentIds,
    validateTeamComposition
  }
}

// Re-export types
export type CookingTeam = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamSchema']>
export type CookingTeamWithMembers = z.infer<ReturnType<typeof useCookingTeamValidation>['CookingTeamWithMembersSchema']>
export type TeamMemberAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamMemberAssignmentSchema']>
export type BulkMemberAssignment = z.infer<ReturnType<typeof useCookingTeamValidation>['BulkMemberAssignmentSchema']>
