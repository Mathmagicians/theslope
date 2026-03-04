// POST /api/household/[id]/update - Update household (self-service + admin bypass)

import {defineEventHandler, readValidatedBody, getValidatedRouterParams, getValidatedQuery, setResponseStatus} from "h3"
import {updateHousehold} from "~~/server/data/prismaRepository"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {HouseholdUpdate} from "~/composables/useCoreValidation"
import {useBookingValidation, type HouseholdUpdateResponse} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {rescaffoldOnFieldChange} from "~~/server/utils/scaffoldPrebookings"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

const LOG = '🏠 > HOUSEHOLD > [UPDATE]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('Household ID must be a positive integer')
})

const querySchema = z.object({
    adminBypass: z.coerce.boolean().default(false)
})

/**
 * POST /api/household/[id]/update
 * Update household fields (moveOutDate, etc.)
 * Requires: authenticated user belongs to household (admin can bypass via ?adminBypass=true)
 */
export default defineEventHandler<Promise<HouseholdUpdateResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const {HouseholdUpdateSchema} = useCoreValidation()
    const {HouseholdUpdateResponseSchema} = useBookingValidation()

    let id!: number
    let adminBypass!: boolean
    let householdData!: Partial<HouseholdUpdate>
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        const query = await getValidatedQuery(event, querySchema.parse)
        adminBypass = query.adminBypass
        householdData = await readValidatedBody(event, HouseholdUpdateSchema.omit({id: true}).parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    try {
        const user = await requireHouseholdAccess(event, id, adminBypass ? isAdmin : undefined)

        console.info(`${LOG} User ${user.email} updating household ${id}`)
        const updatedHousehold = await updateHousehold(d1Client, id, householdData)

        const scaffoldResult = await rescaffoldOnFieldChange(d1Client, LOG, id, {
            moveOutDate: householdData.moveOutDate,
            movedInDate: householdData.movedInDate
        })

        console.info(`${LOG} Updated household ${updatedHousehold.name}`)
        setResponseStatus(event, 200)
        return HouseholdUpdateResponseSchema.parse({household: updatedHousehold, scaffoldResult})
    } catch (error) {
        return throwH3Error(`${LOG} Error updating household ${id}`, error)
    }
})
