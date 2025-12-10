// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, vi} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import UserProfileCard from '~/components/user/UserProfileCard.vue'
import {UserFactory} from '../e2e/testDataFactories/userFactory'
import type {SystemRole} from '~/composables/useCoreValidation'

// Mock user session state
const mockSessionState = {
  user: null as any
}

// Mock useUserSession for auth store
mockNuxtImport('useUserSession', () => {
  return () => ({
    loggedIn: computed(() => !!mockSessionState.user),
    user: computed(() => mockSessionState.user),
    session: ref(null),
    clear: vi.fn(),
    fetch: vi.fn()
  })
})

describe('UserProfileCard', () => {
  const testSalt = 'test-profile-card'

  beforeAll(() => {
    // Initialize Pinia once for all tests (required for storeToRefs in useUserRoles)
    setActivePinia(createPinia())
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionState.user = null
  })

  describe('Business Logic: Action Button Visibility', () => {
    it.each([
      {
        scenario: 'not show logout button when showActions is false',
        showActions: false,
        isCurrentUser: true,
        shouldShowButton: false
      },
      {
        scenario: 'not show logout button when viewing another user',
        showActions: true,
        isCurrentUser: false,
        shouldShowButton: false
      },
      {
        scenario: 'show logout button only for current user when showActions is true',
        showActions: true,
        isCurrentUser: true,
        shouldShowButton: true
      }
    ])('should $scenario', async ({showActions, isCurrentUser, shouldShowButton}) => {
      const user = UserFactory.defaultUserWithInhabitant(testSalt)
      user.id = 42

      // Set up mock session state
      if (isCurrentUser) {
        mockSessionState.user = user
      } else {
        const otherUser = UserFactory.defaultUserWithInhabitant(`${testSalt}-other`)
        otherUser.id = 99
        mockSessionState.user = otherUser
      }

      const wrapper = await mountSuspended(UserProfileCard, {
        props: {user, showActions}
      })

      const logoutButton = wrapper.find('button[name="logout-button"]')
      expect(logoutButton.exists()).toBe(shouldShowButton)
    })
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
    it('should handle user without Inhabitant household data', async () => {
      const user = UserFactory.defaultUserWithInhabitant(testSalt)
      // Test edge case: shortName can be null from API despite type
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
