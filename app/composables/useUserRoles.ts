import type {ComputedRef} from 'vue'

/**
 * Composable for managing user role display and filtering
 * Provides role labels, icons, colors and visibility predicates
 */
export const useUserRoles = () => {
  const {SystemRoleSchema} = useCoreValidation()
  const authStore = useAuthStore()
  const {systemRoles, isAdmin, isAllergyManager} = storeToRefs(authStore)
  const {ICONS} = useTheSlopeDesignSystem()

  type RoleColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

  interface RoleConfig {
    label: string
    icon: string
    color: RoleColor
    predicate: ComputedRef<boolean>
  }

  /**
   * Get role configuration by role type
   */
  const getRoleConfig = (role: string): RoleConfig | null => {
    switch (role) {
      case SystemRoleSchema.enum.ADMIN:
        return {
          label: 'Admin',
          icon: 'i-heroicons-shield-check',
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
    visibleRoles,
    // Export type for consumers
    type: {} as { RoleColor: RoleColor; RoleConfig: RoleConfig }
  }
}
