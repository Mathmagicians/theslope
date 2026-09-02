/**
 * Pure UI composable for user role display (ADR-017)
 *
 * Client-only: reads the auth store and the design system. The server-safe role
 * reconciliation (RoleOwnerSchema, ROLE_OWNERSHIP, reconcileUserRoles) stays in
 * useUserRoles, which server code imports.
 */
import type {ComputedRef} from 'vue'
import {useCoreValidation} from '~/composables/useCoreValidation'

type RoleColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface RoleConfig {
  label: string
  icon: string
  color: RoleColor
  predicate: ComputedRef<boolean>
}

/**
 * Role labels, icons, colors and visibility predicates for the current session user
 */
export const useUserRolesUi = () => {
  const {SystemRoleSchema} = useCoreValidation()
  const authStore = useAuthStore()
  const {systemRoles, isAdmin, isAllergyManager} = storeToRefs(authStore)
  const {ICONS} = useTheSlopeDesignSystem()

  /**
   * Get role configuration by role type
   */
  const getRoleConfig = (role: string): RoleConfig | null => {
    switch (role) {
      case SystemRoleSchema.enum.ADMIN:
        return {
          label: 'Admin',
          icon: ICONS.authorize,
          color: 'primary',
          predicate: isAdmin
        }
      case SystemRoleSchema.enum.ALLERGYMANAGER:
        return {
          label: 'Allergichef',
          icon: ICONS.allergy,
          color: 'success',
          predicate: isAllergyManager
        }
      default:
        return null
    }
  }

  // Build role labels object for convenience
  const roleLabels: Record<string, RoleConfig> = {}
  for (const role of Object.values(SystemRoleSchema.enum)) {
    const config = getRoleConfig(role)
    if (config) {
      roleLabels[role] = config
    }
  }

  // Visible roles based on predicates
  const visibleRoles = computed(() =>
    systemRoles.value.filter((role: string) => {
      const config = getRoleConfig(role)
      return config && config.predicate.value
    })
  )

  return {
    getRoleConfig,
    roleLabels,
    visibleRoles
  }
}
