import type {SystemRole, ReconcileResult} from '~/composables/useCoreValidation'
import {z} from 'zod'
import {SystemRoleSchema} from '~~/prisma/generated/zod'

// ============================================================================
// MODULE-LEVEL EXPORTS (Server-safe, explicit imports only - ADR-017)
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

// Role display (labels, icons, colors, auth-store visibility) lives in the pure UI
// composable useUserRolesUi (ADR-017) - this module stays importable from server/.
