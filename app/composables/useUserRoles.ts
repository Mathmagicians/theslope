import type {ComputedRef} from 'vue'
import type {SystemRole, ReconcileResult} from '~/composables/useCoreValidation'
import {z} from 'zod'
import {SystemRoleSchema} from '~~/prisma/generated/zod'

// ============================================================================
// MODULE-LEVEL EXPORTS (Server-safe, no client dependencies)
// ============================================================================

/**
 * Role ownership schema - which system owns which role
 * HN = Heynabo (external), TS = TheSlope (local)
 */
export const RoleOwnerSchema = z.enum(['HN', 'TS'])
export const RoleOwner = RoleOwnerSchema.enum
export type RoleOwnerValue = z.infer<typeof RoleOwnerSchema>

/**
 * Maps each SystemRole to its owning system
 * HN (Heynabo) owns ADMIN - synced from external system
 * TS (TheSlope) owns ALLERGYMANAGER - managed locally
 */
export const ROLE_OWNERSHIP: Record<SystemRole, RoleOwnerValue> = {
  [SystemRoleSchema.enum.ADMIN]: RoleOwner.HN,
  [SystemRoleSchema.enum.ALLERGYMANAGER]: RoleOwner.TS
}

/**
 * Reconcile user roles based on caller ownership (PURE FUNCTION - server-safe)
 * - Caller's owned roles: replaced with incoming
 * - Other system's roles: preserved from existing
 *
 * @param existing - Current roles on the user
 * @param incoming - New roles from the caller
 * @param caller - Which system is making the change (HN or TS)
 * @returns ReconcileResult with reconciled roles and admin change tracking
 */
export const reconcileUserRoles = (
  existing: SystemRole[],
  incoming: SystemRole[],
  caller: RoleOwnerValue
): ReconcileResult => {
  // Preserve roles owned by the other system
  const preservedRoles = existing.filter(role => ROLE_OWNERSHIP[role] !== caller)
  // Take incoming roles owned by the caller
  const callerRoles = incoming.filter(role => ROLE_OWNERSHIP[role] === caller)
  // Combine and deduplicate
  const reconciled = Array.from(new Set([...preservedRoles, ...callerRoles]))

  // Track ADMIN changes for audit purposes
  const hadAdmin = existing.includes(SystemRoleSchema.enum.ADMIN)
  const hasAdmin = reconciled.includes(SystemRoleSchema.enum.ADMIN)

  return {
    roles: reconciled,
    adminAdded: !hadAdmin && hasAdmin,
    adminRemoved: hadAdmin && !hasAdmin
  }
}

// ============================================================================
// COMPOSABLE (Client-side only - UI display, auth store integration)
// ============================================================================

/**
 * Composable for managing user role display and UI integration
 * Provides role labels, icons, colors, visibility predicates
 * NOTE: reconcileUserRoles is exported at module level for server-side use
 */
export const useUserRoles = () => {
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
    // Role reconciliation
    ROLE_OWNERSHIP,
    reconcileUserRoles,
    // Role display
    getRoleConfig,
    roleLabels,
    visibleRoles
  }
}
