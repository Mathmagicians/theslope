// DELETE /api/admin/team/[id]/joker-slot/[slotId] - Delete a team's joker slot

import {defineEventHandler, getValidatedRouterParams} from "h3"
import {z} from 'zod'
import {deleteJokerSlot} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

const paramSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer'),
    slotId: z.coerce.number().int().positive('Joker slot ID must be a positive integer')
})

/**
 * Returns: the deleted count (ADR-009)
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
        const deleted = await deleteJokerSlot(d1Client, teamId, slotId)
        console.info(`🃏 > JOKER_SLOT > [DELETE] Deleted ${deleted} joker slot(s) on team ${teamId}`)
        return deleted
    } catch (error) {
        return throwH3Error(`🃏 > JOKER_SLOT > [DELETE] Error deleting joker slot ${slotId} on team ${teamId}`, error)
    }
})
