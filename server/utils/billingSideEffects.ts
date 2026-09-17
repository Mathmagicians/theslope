/**
 * What a closed billing period still needs (ADR-015: the monthly run converges every period, a re-run redoes
 * only what is missing or stale). A side effect is current when its version equals the period's content
 * version — a period whose content changed (catch-up billing bumps the version) gets a fresh archive and mail.
 */
import type {BillingSideEffectStamps} from '~/composables/useBillingValidation'

export type BillingSideEffectPlan = {archive: boolean, notify: boolean}

export const decideBillingSideEffects = ({version, archivedVersion, notifiedVersion}: BillingSideEffectStamps): BillingSideEffectPlan => ({
    archive: archivedVersion < version,
    notify: notifiedVersion < version
})
