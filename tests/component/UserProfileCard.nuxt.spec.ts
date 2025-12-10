// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import UserProfileCard from '~/components/user/UserProfileCard.vue'
import {UserFactory} from '../e2e/testDataFactories/userFactory'
import type {SystemRole} from '~/composables/useCoreValidation'

describe('UserProfileCard', () => {
  const testSalt = 'test-profile-card'

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Business Logic: Role Badge Filtering', () => {
    it.each([
      {
        scenario: 'display badges for known roles',
        roles: ['ADMIN', 'ALLERGYMANAGER'] as const,
        shouldInclude: ['Admin', 'Allergichef'],
        shouldExclude: []
      },
      {
        scenario: 'not display badges for unknown roles',
        roles: ['UNKNOWN_ROLE'],
        shouldInclude: [],
        shouldExclude: ['UNKNOWN_ROLE']
      },
      {
        scenario: 'not display badge section when no roles',
        roles: [],
        shouldInclude: [],
        shouldExclude: []
      }
    ])('should $scenario', async ({roles, shouldInclude, shouldExclude}) => {
      const user = UserFactory.defaultUserWithInhabitant(testSalt)
      user.systemRoles = roles as SystemRole[]

      const wrapper = await mountSuspended(UserProfileCard, {
        props: {user}
      })

      const text = wrapper.text()
      shouldInclude.forEach(label => expect(text).toContain(label))
      shouldExclude.forEach(label => expect(text).not.toContain(label))
    })
  })

  describe('Business Logic: Optional Data Handling', () => {
    it('should handle user without household shortName', async () => {
      const user = UserFactory.defaultUserWithInhabitant(testSalt)
      // Test edge case: shortName can be null from API
      Object.assign(user.Inhabitant!.household, {shortName: null})
      user.phone = null

      const wrapper = await mountSuspended(UserProfileCard, {
        props: {user}
      })

      // Household link should not be rendered when shortName is null
      const householdLink = wrapper.find('a[href="/household"]')
      expect(householdLink.exists()).toBe(false)
    })
  })
})
