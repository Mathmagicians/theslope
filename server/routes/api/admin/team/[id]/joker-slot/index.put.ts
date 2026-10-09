// PUT /api/admin/team/[id]/joker-slot - Create a joker slot on a team

import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {z} from 'zod'
import {createJokerSlot} from "~~/server/data/prismaRepository"
import {useDutyValidation, type JokerSlot, type JokerSlotCreate} from "~/composables/useDutyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper
const {JokerSlotCreateSchema} = useDutyValidation()

const paramSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

/**
 * Returns: the created JokerSlot (ADR-009), 201; GET /api/admin/team/[id] carries it in jokerSlots
 * @throws 400 - Invalid team ID or slot
 * @throws 404 - Team not found
 */
export default defineEventHandler(async (event): Promise<JokerSlot> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let teamId!: number
    let slot!: JokerSlotCreate
    try {
        ({id: teamId} = await getValidatedRouterParams(event, paramSchema.parse))
        slot = await readValidatedBody(event, JokerSlotCreateSchema.parse)
    } catch (error) {
        return throwH3Error('🃏 > JOKER_SLOT > [PUT] Input validation error', error)
    }

    try {
        const created = await createJokerSlot(d1Client, teamId, slot)
        console.info(`🃏 > JOKER_SLOT > [PUT] Created joker slot ${created.id} on team ${teamId}`)
        setResponseStatus(event, 201)
        return created
    } catch (error) {
        return throwH3Error(`🃏 > JOKER_SLOT > [PUT] Error creating joker slot on team ${teamId}`, error)
    }
})
