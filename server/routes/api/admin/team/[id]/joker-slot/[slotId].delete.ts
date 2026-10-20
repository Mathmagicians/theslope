// DELETE /api/admin/team/[id]/joker-slot/[slotId] - Delete a team's joker slot

import {defineEventHandler, getValidatedRouterParams} from "h3"
import {idParams} from '~/composables/useCoreValidation'
import {deleteJokerSlot} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id', 'slotId')

/**
 * Returns: the deleted slot's id (ADR-009)
 * @throws 400 - Invalid team or slot ID
 * @throws 404 - Slot not found on this team
 */
export default defineEventHandler(async (event): Promise<number> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let teamId!: number
    let slotId!: number
    try {
        ({id: teamId, slotId} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        return throwH3Error('🃏 > JOKER_SLOT > [DELETE] Input validation error', error)
    }

    try {
        const deletedId = await deleteJokerSlot(d1Client, teamId, slotId)
        console.info(`🃏 > JOKER_SLOT > [DELETE] Deleted joker slot ${deletedId} on team ${teamId}`)
        return deletedId
    } catch (error) {
        return throwH3Error(`🃏 > JOKER_SLOT > [DELETE] Error deleting joker slot ${slotId} on team ${teamId}`, error)
    }
})
