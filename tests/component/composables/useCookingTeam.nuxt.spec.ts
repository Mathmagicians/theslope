import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useCookingTeam } from '~/composables/useCookingTeam'
import { usePlanStore } from '~/stores/plan'
import { setActivePinia, createPinia } from 'pinia'
import { clearNuxtData } from '#app'

describe('useCookingTeam', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearNuxtData() // Clear useFetch cache
  })

  describe('createDefaultTeamName', () => {
    it('creates correct team name format', () => {
      const { createDefaultTeamName } = useCookingTeam()
      const name = createDefaultTeamName('Winter 2025', 3)
      expect(name).toBe('Madhold 3 - Winter 2025')
    })
  })

  describe('getDefaultCookingTeam', () => {
    it('creates default team with generated name', () => {
      const { getDefaultCookingTeam } = useCookingTeam()
      const team = getDefaultCookingTeam(1, 'Winter 2025', 2)

      expect(team).toEqual({
        seasonId: 1,
        name: 'Madhold 2 - Winter 2025'
      })
    })

    it('allows overriding default values', () => {
      const { getDefaultCookingTeam } = useCookingTeam()
      const team = getDefaultCookingTeam(1, 'Winter 2025', 1, { name: 'Custom Team' })

      expect(team.name).toBe('Custom Team')
      expect(team.seasonId).toBe(1)
    })
  })

  describe('useInhabitantsWithAssignments', () => {
    it('fetches inhabitants and merges with assignments from store', async () => {
      // Setup mock API response for inhabitants
      const mockInhabitants = [
        { id: 1, name: 'Anna', lastName: 'Hansen', pictureUrl: null },
        { id: 2, name: 'Bob', lastName: 'Jensen', pictureUrl: null },
        { id: 3, name: 'Charlie', lastName: 'Nielsen', pictureUrl: null }
      ]

      registerEndpoint('/api/admin/household/inhabitants', {
        method: 'GET',
        handler: () => mockInhabitants
      })

      // Setup mock season with assignments
      const mockSeason = {
        id: 1,
        shortName: 'Winter 2025',
        seasonDates: JSON.stringify({ start: '2025-01-01', end: '2025-03-31' }),
        isActive: true,
        cookingDays: JSON.stringify({ MONDAY: true, TUESDAY: true, WEDNESDAY: true, THURSDAY: true, FRIDAY: false, SATURDAY: false, SUNDAY: false }),
        holidays: JSON.stringify([]),
        ticketIsCancellableDaysBefore: 10,
        diningModeIsEditableMinutesBefore: 90,
        CookingTeams: [
          {
            id: 1,
            name: 'Madhold 1',
            seasonId: 1,
            assignments: [
              {
                id: 101,
                role: 'CHEF',
                cookingTeamId: 1,
                inhabitantId: 1,
                inhabitant: { id: 1, name: 'Anna', lastName: 'Hansen', pictureUrl: null }
              }
            ]
          },
          {
            id: 2,
            name: 'Madhold 2',
            seasonId: 1,
            assignments: [
              {
                id: 102,
                role: 'COOK',
                cookingTeamId: 2,
                inhabitantId: 2,
                inhabitant: { id: 2, name: 'Bob', lastName: 'Jensen', pictureUrl: null }
              }
            ]
          }
        ]
      }

      // Mock the season endpoint
      registerEndpoint('/api/admin/season/1', {
        method: 'GET',
        handler: () => mockSeason
      })

      // Select the season via store
      const store = usePlanStore()
      await store.onSeasonSelect(1)

      // Use the composable
      const { useInhabitantsWithAssignments } = useCookingTeam()
      const { inhabitants, pending, refresh } = await useInhabitantsWithAssignments()

      // Wait for async data to load
      await vi.waitFor(() => {
        expect(pending.value).toBe(false)
      })

      // Verify merged data
      expect(inhabitants.value).toHaveLength(3)

      // Anna should have assignment to Team 1
      const anna = inhabitants.value?.find(i => i.id === 1)
      expect(anna?.CookingTeamAssignment).toHaveLength(1)
      expect(anna?.CookingTeamAssignment?.[0]).toMatchObject({
        id: 101,
        role: 'CHEF',
        cookingTeamId: 1,
        inhabitantId: 1,
        cookingTeam: { id: 1, name: 'Madhold 1' }
      })

      // Bob should have assignment to Team 2
      const bob = inhabitants.value?.find(i => i.id === 2)
      expect(bob?.CookingTeamAssignment).toHaveLength(1)
      expect(bob?.CookingTeamAssignment?.[0]).toMatchObject({
        id: 102,
        role: 'COOK',
        cookingTeamId: 2,
        inhabitantId: 2,
        cookingTeam: { id: 2, name: 'Madhold 2' }
      })

      // Charlie should have no assignment
      const charlie = inhabitants.value?.find(i => i.id === 3)
      expect(charlie?.CookingTeamAssignment).toBeUndefined()
    })

    it('returns empty array when no season selected', async () => {
      // Setup mock API response
      registerEndpoint('/api/admin/household/inhabitants', {
        method: 'GET',
        handler: () => []
      })

      // Store has no selected season (no onSeasonSelect called)
      const { useInhabitantsWithAssignments } = useCookingTeam()
      const { inhabitants, pending } = await useInhabitantsWithAssignments()

      await vi.waitFor(() => {
        expect(pending.value).toBe(false)
      })

      // Should still return inhabitants, just without assignments
      expect(inhabitants.value).toEqual([])
    })

    it('exposes refresh function', async () => {
      registerEndpoint('/api/admin/household/inhabitants', {
        method: 'GET',
        handler: () => []
      })

      const { useInhabitantsWithAssignments } = useCookingTeam()
      const { refresh } = await useInhabitantsWithAssignments()

      expect(refresh).toBeDefined()
      expect(typeof refresh).toBe('function')
    })
  })
})