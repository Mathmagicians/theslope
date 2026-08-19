import type {D1Database} from '@cloudflare/workers-types'
import {fetchDinnerEvents, updateDinnerEvent, updateDinnerEventAllergens} from '~~/server/data/financesRepository'
import {deleteHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {CHEF_LOSS_DINNER_UPDATES} from '~/composables/useBooking'
import {useBookingValidation, type DinnerEventDetail} from '~/composables/useBookingValidation'

const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const LOG = '👩‍🍳 > CHEF_ROLE > [REMOVE]'

/**
 * Takes the chef off a dinner and readies it for a new one: deletes the Heynabo event
 * (best-effort with system token — ADR-013 admin rule), applies CHEF_LOSS_DINNER_UPDATES
 * (the pure field-set from useBooking) and clears the dinner's allergens.
 *
 * Shared by "Meld afbud" (remove-role endpoint), admin inhabitant deletion, and the
 * Heynabo import's deletion path (ADR-013 lifecycle).
 */
export async function removeChefRole(
    d1Client: D1Database,
    dinner: {id: number, heynaboEventId: number | null}
): Promise<{dinner: DinnerEventDetail, heynaboSyncDegraded: boolean}> {
    let heynaboSyncDegraded = false
    if (dinner.heynaboEventId) {
        try {
            await deleteHeynaboEventAsSystem(dinner.heynaboEventId)
        } catch (heynaboError) {
            console.warn(`${LOG} Failed to delete Heynabo event ${dinner.heynaboEventId} for dinner ${dinner.id} (non-blocking)`, heynaboError)
            heynaboSyncDegraded = true
        }
    }
    await updateDinnerEvent(d1Client, dinner.id, CHEF_LOSS_DINNER_UPDATES)
    const updated = await updateDinnerEventAllergens(d1Client, dinner.id, [])
    console.info(`${LOG} Removed chef from dinner ${dinner.id}, reverted to SCHEDULED (heynaboSyncDegraded=${heynaboSyncDegraded})`)
    return {dinner: updated, heynaboSyncDegraded}
}

/**
 * Chef-loss for inhabitants about to be deleted: readies every dinner they chef that is
 * still ahead of consumption. Runs BEFORE the inhabitant rows are deleted — deletion
 * SET-NULLs `chefId`, which would hide the dinners.
 *
 * @returns number of dinners reset
 */
export async function removeChefRoleForInhabitants(d1Client: D1Database, inhabitantIds: number[]): Promise<number> {
    if (inhabitantIds.length === 0) return 0
    const dinners = await fetchDinnerEvents(d1Client, {
        chefIds: inhabitantIds,
        excludeStates: [DinnerState.CONSUMED, DinnerState.CANCELLED]
    })
    for (const dinner of dinners) {
        await removeChefRole(d1Client, dinner)
    }
    return dinners.length
}
