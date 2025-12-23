// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useUserRoles} from '~/composables/useUserRoles'

// Mock state that can be mutated between tests
const mockAuthState = {
  systemRoles: [] as string[],
  isAdmin: false,
  isAllergyManager: false
}

const SystemRoleEnum = {
  ADMIN: 'ADMIN',
  ALLERGYMANAGER: 'ALLERGYMANAGER'
}

// Mock Nuxt auto-imports
mockNuxtImport('useAuthStore', () => {
  return () => ({
    systemRoles: ref(mockAuthState.systemRoles),
    isAdmin: ref(mockAuthState.isAdmin),
    isAllergyManager: ref(mockAuthState.isAllergyManager)
  })
})

mockNuxtImport('useCoreValidation', () => {
  return () => ({
    SystemRoleSchema: {
      enum: SystemRoleEnum
    }
  })
})

describe('useUserRoles', () => {
  // Helper to reset and configure mock state
  const setupMocks = (config: {
    systemRoles?: string[]
    isAdmin?: boolean
    isAllergyManager?: boolean
  } = {}) => {
    mockAuthState.systemRoles = config.systemRoles ?? []
    mockAuthState.isAdmin = config.isAdmin ?? false
    mockAuthState.isAllergyManager = config.isAllergyManager ?? false
  }

  beforeEach(() => {
    setupMocks()
  })

  it.each([
    {roleKey: 'ADMIN'},
    {roleKey: 'ALLERGYMANAGER'}
  ])('should return role config for $roleKey', ({roleKey}) => {
    const {getRoleConfig} = useUserRoles()

    const config = getRoleConfig(SystemRoleEnum[roleKey as keyof typeof SystemRoleEnum])

    expect(config).toBeDefined()
    expect(config?.label).toBeTruthy()
    expect(config?.icon).toBeTruthy()
    expect(config?.color).toBeTruthy()
    expect(config?.predicate).toBeDefined()
  })

  it('should return null for unknown role (default case)', () => {
    const {getRoleConfig} = useUserRoles()

    const config = getRoleConfig('UNKNOWN_ROLE')

    expect(config).toBeNull()
  })

  it('should build roleLabels object with all known roles', () => {
    const {roleLabels} = useUserRoles()

    expect(roleLabels[SystemRoleEnum.ADMIN]).toBeDefined()
    expect(roleLabels[SystemRoleEnum.ALLERGYMANAGER]).toBeDefined()
  })

  it.each([
    {
      description: 'only show ADMIN when only isAdmin is true',
      isAdmin: true,
      isAllergyManager: false,
      expectedCount: 1,
      shouldInclude: [SystemRoleEnum.ADMIN],
      shouldExclude: [SystemRoleEnum.ALLERGYMANAGER]
    },
    {
      description: 'only show ALLERGYMANAGER when only isAllergyManager is true',
      isAdmin: false,
      isAllergyManager: true,
      expectedCount: 1,
      shouldInclude: [SystemRoleEnum.ALLERGYMANAGER],
      shouldExclude: [SystemRoleEnum.ADMIN]
    },
    {
      description: 'show all roles when all predicates are true',
      isAdmin: true,
      isAllergyManager: true,
      expectedCount: 2,
      shouldInclude: [SystemRoleEnum.ADMIN, SystemRoleEnum.ALLERGYMANAGER],
      shouldExclude: []
    },
    {
      description: 'show no roles when no predicates are true',
      isAdmin: false,
      isAllergyManager: false,
      expectedCount: 0,
      shouldInclude: [],
      shouldExclude: [SystemRoleEnum.ADMIN, SystemRoleEnum.ALLERGYMANAGER]
    }
  ])('should $description', ({isAdmin, isAllergyManager, expectedCount, shouldInclude, shouldExclude}) => {
    setupMocks({
      systemRoles: [SystemRoleEnum.ADMIN, SystemRoleEnum.ALLERGYMANAGER],
      isAdmin,
      isAllergyManager
    })

    const {visibleRoles} = useUserRoles()

    expect(visibleRoles.value).toHaveLength(expectedCount)

    shouldInclude.forEach(role => {
      expect(visibleRoles.value).toContain(role)
    })

    shouldExclude.forEach(role => {
      expect(visibleRoles.value).not.toContain(role)
    })
  })
})
