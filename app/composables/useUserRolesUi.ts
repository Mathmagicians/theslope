/**
 * Pure UI composable for user role display
 *
 * Client-only: reads the auth store and the design system. The server-safe role
 * reconciliation (RoleOwner, ROLE_OWNERSHIP, reconcileUserRoles) lives in
 * useUserRoles, which server code imports.
 */
import type {ComputedRef} from 'vue'
import {useCoreValidation, type SystemRole} from '~/composables/useCoreValidation'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {USER_WORDS} from '~/config/userWords'

export interface RoleConfig {
  label: string
  icon: string
  color: NuxtUIColor
  predicate: ComputedRef<boolean>
}

/**
 * Role labels, icons, colors and visibility predicates for the current session user
 */
export const useUserRolesUi = () => {
  const {SystemRoleSchema} = useCoreValidation()
  const SystemRole = SystemRoleSchema.enum
  const authStore = useAuthStore()
  const {systemRoles, isAdmin, isAllergyManager} = storeToRefs(authStore)
  const {ICONS, COLOR} = useTheSlopeDesignSystem()

  const roleLabels: Record<SystemRole, RoleConfig> = {
    [SystemRole.ADMIN]: {
      label: USER_WORDS.roles[SystemRole.ADMIN],
      icon: ICONS.authorize,
      color: COLOR.primary,
      predicate: isAdmin
    },
    [SystemRole.ALLERGYMANAGER]: {
      label: USER_WORDS.roles[SystemRole.ALLERGYMANAGER],
      icon: ICONS.allergy,
      color: COLOR.success,
      predicate: isAllergyManager
    }
  }

  // A role the session or a user row carries that the app does not know shows no badge
  const getRoleConfig = (role: string): RoleConfig | null => {
    const known = SystemRoleSchema.safeParse(role)
    return known.success ? roleLabels[known.data] : null
  }

  const visibleRoles = computed(() =>
    systemRoles.value.filter(role => getRoleConfig(role)?.predicate.value)
  )

  return {
    getRoleConfig,
    roleLabels,
    visibleRoles
  }
}
