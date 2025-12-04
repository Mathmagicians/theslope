import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useCookingTeam } from '~/composables/useCookingTeam'
import { usePlanStore } from '~/stores/plan'
import { setActivePinia, createPinia, storeToRefs } from 'pinia'
import { clearNuxtData } from '#app'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'

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
        name: 'Madhold 2 - Winter 2025',
        assignments: [],
        cookingDaysCount: 0
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
    describe('with store integration', () => {
      it('fetches inhabitants and merges with assignments from store', async () => {
        // Setup mock season with assignments - using factory data for DRY
        const anna = { ...HouseholdFactory.defaultInhabitantData('test-anna'), id: 1, name: 'Anna', lastName: 'Hansen' }
        const bob = { ...HouseholdFactory.defaultInhabitantData('test-bob'), id: 2, name: 'Bob', lastName: 'Jensen' }

        const mockSeason = {
        ...SeasonFactory.defaultSeasonData,
        id: 1,
        shortName: 'Winter 2025',
        isActive: true,
        CookingTeams: [
          {
            id: 1,
            name: 'Madhold 1',
            seasonId: 1,
            affinity: null,
            cookingDaysCount: 0,
            assignments: [
              {
                id: 101,
                role: 'CHEF',
                cookingTeamId: 1,
                inhabitantId: 1,
                inhabitant: anna
              }
            ]
          },
          {
            id: 2,
            name: 'Madhold 2',
            seasonId: 1,
            affinity: null,
            cookingDaysCount: 0,
            assignments: [
              {
                id: 102,
                role: 'COOK',
                cookingTeamId: 2,
                inhabitantId: 2,
                inhabitant: bob
              }
            ]
          }
        ]
      }

        // IMPORTANT: Register specific endpoint FIRST, then generic ones
        // Mock the season detail endpoint (for onSeasonSelect)
        registerEndpoint('/api/admin/season/1', {
          method: 'GET',
          handler: () => mockSeason
        })

        // Mock the seasons list endpoint (prevents console error from store initialization)
        registerEndpoint('/api/admin/season', {
          method: 'GET',
          handler: () => []
        })

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

        // Select the season via store
      const store = usePlanStore()
      const { isSelectedSeasonInitialized } = storeToRefs(store)
      store.onSeasonSelect(1)

      // Wait for season to load (has the CookingTeams data needed for merging)
      await vi.waitFor(() => {
        expect(isSelectedSeasonInitialized.value).toBe(true)
      })

      // Check for errors
      expect(store.selectedSeasonError, 'Season should load without error').toBeFalsy()
      expect(store.selectedSeason, 'Season should be loaded').toBeDefined()

      // Use the composable
      const { useInhabitantsWithAssignments } = useCookingTeam()
      const { inhabitants, pending } = await useInhabitantsWithAssignments()

      // Wait for inhabitants to load with actual data
      await vi.waitFor(() => {
        expect(pending.value).toBe(false)
        expect(inhabitants.value).not.toBeNull()
        expect(inhabitants.value?.length).toBeGreaterThan(0)
      })

      // Verify merged data
      expect(inhabitants.value).toHaveLength(3)

      // Anna should have assignment to Team 1
      const annaResult = inhabitants.value?.find(i => i.id === 1)
      expect(annaResult).toBeDefined()
      expect(annaResult!.CookingTeamAssignment).toHaveLength(1)
      expect(annaResult!.CookingTeamAssignment[0]).toMatchObject({
        id: 101,
        role: 'CHEF',
        cookingTeamId: 1,
        inhabitantId: 1,
        cookingTeam: { id: 1, name: 'Madhold 1' }
      })

      // Bob should have assignment to Team 2
      const bobResult = inhabitants.value?.find(i => i.id === 2)
      expect(bobResult).toBeDefined()
      expect(bobResult!.CookingTeamAssignment).toHaveLength(1)
      expect(bobResult!.CookingTeamAssignment[0]).toMatchObject({
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
    })

    describe('without store integration', () => {
      beforeEach(() => {
        // Mock empty seasons list (prevents console error from store initialization)
        registerEndpoint('/api/admin/season', {
          method: 'GET',
          handler: () => []
        })
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
})