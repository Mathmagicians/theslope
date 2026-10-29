import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {AdminBypassQuerySchema, RouteIdSchema, idParams, useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult, type DinnerMode} from "~/composables/useBookingValidation"
import {fetchInhabitant, updateInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {notifyBookingOutcomesInBackground} from "~~/server/utils/sender/events/waitlist"
import {changedWeekdays, type WeekDayMap} from "~/types/dateTypes"

const {throwH3Error} = eventHandlerHelper

const LOG = '👩‍🏠 > INHABITANT > [PREFERENCES]'

const paramSchema = idParams('id')

const querySchema = AdminBypassQuerySchema.extend({seasonId: RouteIdSchema.optional()})

/**
 * POST /api/household/inhabitants/[id]/preferences
 * Update inhabitant dinner preferences (for household members)
 * Requires: authenticated user belongs to same household as inhabitant
 * Its dry run is the GET on the same path (`preferences.get.ts`)
 */
export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let seasonId: number | undefined
    let adminBypass!: boolean
    let dinnerPreferences: WeekDayMap<DinnerMode>
    try {
        const {WeekDayMapSchemaOptional} = useCoreValidation()
        const bodySchema = z.object({dinnerPreferences: WeekDayMapSchemaOptional})

        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        adminBypass = query.adminBypass
        const body = await readValidatedBody(event, bodySchema.parse)
        dinnerPreferences = body.dinnerPreferences
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    try {
        // Fetch inhabitant to get householdId for authorization
        const inhabitant = await fetchInhabitant(d1Client, id)
        if (!inhabitant) {
            return throwH3Error(`${LOG} Inhabitant ${id} not found`, new Error('Not found'), 404)
        }

        // Verify user belongs to same household (admin can bypass via ?adminBypass=true)
        const user = await requireHouseholdAccess(event, inhabitant.householdId, adminBypass ? isAdmin : undefined)

        console.info(`${LOG} User ${user.email} updating preferences for inhabitant ${inhabitant.name} ${inhabitant.lastName}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, {dinnerPreferences})

        // Re-scaffold the household on the weekdays the draft changes, the DAILY_MAINTENANCE job keeps the rest in step (ADR-015)
        const weekdays = changedWeekdays(inhabitant.dinnerPreferences, dinnerPreferences)
        console.info(`${LOG} Re-scaffolding household ${updatedInhabitant.householdId} on ${weekdays.join(', ') || 'no weekday'}`)
        const scaffoldResult: ScaffoldResult = await scaffoldPrebookings(d1Client, {
            seasonId,
            householdId: updatedInhabitant.householdId,
            weekdays
        })
        notifyBookingOutcomesInBackground(event, scaffoldResult.outcomes)

        const {InhabitantUpdateResponseSchema} = useBookingValidation()
        setResponseStatus(event, 200)
        return InhabitantUpdateResponseSchema.parse({
            inhabitant: updatedInhabitant,
            scaffoldResult
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error updating preferences for inhabitant ${id}`, error)
    }
})
