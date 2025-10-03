import { describe, it, expect } from 'vitest'
import { useCookingTeamValidation, type CookingTeam, type CookingTeamWithMembers } from '~/composables/useCookingTeamValidation'

describe('useCookingTeamValidation', () => {
  // Get validation utilities
  const {
    CookingTeamSchema,
    CookingTeamWithMembersSchema,
    TeamRoleSchema,
    validateCookingTeam,
    validateCookingTeamWithMembers,
    getTeamMemberCounts
  } = useCookingTeamValidation()

  describe('CookingTeamSchema', () => {
    it('should accept valid team data', () => {
      const validTeam = {
        seasonId: 1,
        name: "Team Alpha"
      }

      const result = CookingTeamSchema.safeParse(validTeam)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.seasonId).toBe(1)
        expect(result.data.name).toBe("Team Alpha")
      }
    })

    it('should accept team data with optional id', () => {
      const validTeamWithId = {
        id: 42,
        seasonId: 1,
        name: "Team Beta"
      }

      const result = CookingTeamSchema.safeParse(validTeamWithId)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(42)
      }
    })

    it('should reject team with missing seasonId', () => {
      const invalidTeam = {
        name: "Team Gamma"
      }

      const result = CookingTeamSchema.safeParse(invalidTeam)
      expect(result.success).toBe(false)
    })

    it('should reject team with empty name', () => {
      const invalidTeam = {
        seasonId: 1,
        name: ""
      }

      const result = CookingTeamSchema.safeParse(invalidTeam)
      expect(result.success).toBe(false)
    })

    it('should reject team with name too long', () => {
      const invalidTeam = {
        seasonId: 1,
        name: "a".repeat(101) // 101 characters, exceeds max of 100
      }

      const result = CookingTeamSchema.safeParse(invalidTeam)
      expect(result.success).toBe(false)
    })

    it('should reject team with invalid seasonId', () => {
      const invalidTeam = {
        seasonId: -1,
        name: "Team Delta"
      }

      const result = CookingTeamSchema.safeParse(invalidTeam)
      expect(result.success).toBe(false)
    })
  })

  describe('TeamRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(TeamRoleSchema.safeParse('CHEF').success).toBe(true)
      expect(TeamRoleSchema.safeParse('COOK').success).toBe(true)
      expect(TeamRoleSchema.safeParse('JUNIORHELPER').success).toBe(true)
    })

    it('should reject invalid roles', () => {
      expect(TeamRoleSchema.safeParse('INVALID').success).toBe(false)
      expect(TeamRoleSchema.safeParse('chef').success).toBe(false) // lowercase
      expect(TeamRoleSchema.safeParse('').success).toBe(false)
    })
  })

  describe('CookingTeamWithMembersSchema', () => {
    it('should accept team with empty member arrays (defaults)', () => {
      const teamWithoutMembers = {
        seasonId: 1,
        name: "Team Empty"
      }

      const result = CookingTeamWithMembersSchema.safeParse(teamWithoutMembers)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.assignments).toEqual([])
      }
    })

    it('should accept team with valid members', () => {
      const teamWithMembers = {
        seasonId: 1,
        name: "Team Full",
        assignments: [
          { teamId: 1, inhabitantId: 1, role: 'CHEF' as const },
          { teamId: 1, inhabitantId: 2, role: 'COOK' as const },
          { teamId: 1, inhabitantId: 3, role: 'COOK' as const },
          { teamId: 1, inhabitantId: 4, role: 'JUNIORHELPER' as const }
        ]
      }

      const result = CookingTeamWithMembersSchema.safeParse(teamWithMembers)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.assignments).toHaveLength(4)
      }
    })

    it('should reject team with invalid member role', () => {
      const teamWithInvalidRole = {
        seasonId: 1,
        name: "Team Invalid",
        assignments: [
          { teamId: 1, inhabitantId: 1, role: 'INVALID_ROLE' }
        ]
      }

      const result = CookingTeamWithMembersSchema.safeParse(teamWithInvalidRole)
      expect(result.success).toBe(false)
    })
  })

  describe('validation functions', () => {
    it('validateCookingTeam should validate basic team data', () => {
      const validTeam = {
        seasonId: 1,
        name: "Test Team"
      }

      expect(() => validateCookingTeam(validTeam)).not.toThrow()
      const result = validateCookingTeam(validTeam)
      expect(result.seasonId).toBe(1)
      expect(result.name).toBe("Test Team")
    })

    it('validateCookingTeam should throw on invalid data', () => {
      const invalidTeam = {
        seasonId: "not a number",
        name: "Test Team"
      }

      expect(() => validateCookingTeam(invalidTeam)).toThrow()
    })

    it('validateCookingTeamWithMembers should validate team with members', () => {
      const teamWithMembers = {
        seasonId: 1,
        name: "Test Team",
        assignments: []
      }

      expect(() => validateCookingTeamWithMembers(teamWithMembers)).not.toThrow()
      const result = validateCookingTeamWithMembers(teamWithMembers)
      expect(result.assignments).toEqual([])
    })
  })

  describe('utility functions', () => {
    describe('getTeamMemberCounts', () => {
      it('should count team members correctly', () => {
        const team: CookingTeamWithMembers = {
          seasonId: 1,
          name: "Test Team",
          assignments: [
            { teamId: 1, inhabitantId: 1, role: 'CHEF' },
            { teamId: 1, inhabitantId: 2, role: 'COOK' },
            { teamId: 1, inhabitantId: 3, role: 'COOK' },
            { teamId: 1, inhabitantId: 4, role: 'JUNIORHELPER' }
          ]
        }

        const counts = getTeamMemberCounts(team)
        expect(counts).toBe(4)
      })

      it('should handle empty team', () => {
        const emptyTeam: CookingTeamWithMembers = {
          seasonId: 1,
          name: "Empty Team",
          assignments: []
        }

        const counts = getTeamMemberCounts(emptyTeam)
        expect(counts).toBe(0)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle team names with whitespace', () => {
      const teamWithSpaces = {
        seasonId: 1,
        name: "  Team with spaces  "
      }

      const result = CookingTeamSchema.safeParse(teamWithSpaces)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("  Team with spaces  ")
      }
    })

    it('should handle maximum valid name length', () => {
      const maxLengthTeam = {
        seasonId: 1,
        name: "a".repeat(100) // exactly 100 characters
      }

      const result = CookingTeamSchema.safeParse(maxLengthTeam)
      expect(result.success).toBe(true)
    })

    it('should handle team members with optional IDs', () => {
      const teamWithMemberIds = {
        seasonId: 1,
        name: "Team with Member IDs",
        assignments: [
          { id: 1, teamId: 1, inhabitantId: 10, role: 'CHEF' as const },
          { id: 2, teamId: 1, inhabitantId: 20, role: 'COOK' as const }
        ]
      }

      const result = CookingTeamWithMembersSchema.safeParse(teamWithMemberIds)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.assignments[0].id).toBe(1)
        expect(result.data.assignments[1].id).toBe(2)
      }
    })
  })
})