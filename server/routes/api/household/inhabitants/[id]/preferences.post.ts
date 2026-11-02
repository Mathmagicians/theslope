import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {AdminBypassQuerySchema, AllInhabitantsQuerySchema, RouteIdSchema, idParams, useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult, type DinnerMode} from "~/composables/useBookingValidation"
import {fetchHouseholds, fetchInhabitant, updateInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {notifyBookingOutcomesInBackground} from "~~/server/utils/sender/events/waitlist"
import {changedWeekdays, type WeekDayMap} from "~/types/dateTypes"

const {throwH3Error} = eventHandlerHelper

const LOG = '👩‍🏠 > INHABITANT > [PREFERENCES]'

const paramSchema = idParams('id')

const querySchema = AdminBypassQuerySchema.extend({...AllInhabitantsQuerySchema.shape, seasonId: RouteIdSchema.optional()})

/**
 * POST /api/household/inhabitants/[id]/preferences
 * Update inhabitant dinner preferences (for household members); `?allInhabitants=true` is power mode: the draft for
 * every inhabitant of the household, re-scaffolded in one run
 * Requires: authenticated user belongs to same household as inhabitant
 * Its dry run is the GET on the same path (`preferences.get.ts`)
 */
export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let seasonId: number | undefined
    let adminBypass!: boolean
    let allInhabitants!: boolean
    let dinnerPreferences: WeekDayMap<DinnerMode>
    try {
        const {WeekDayMapSchemaOptional} = useCoreValidation()
        const bodySchema = z.object({dinnerPreferences: WeekDayMapSchemaOptional})

        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        adminBypass = query.adminBypass
        allInhabitants = query.allInhabitants
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

        const inhabitants = allInhabitants ? (await fetchHouseholds(d1Client, inhabitant.householdId)).flatMap(household => household.inhabitants) : [inhabitant]
        console.info(`${LOG} User ${user.email} updating preferences for ${allInhabitants ? `the ${inhabitants.length} inhabitants of household ${inhabitant.householdId}` : `inhabitant ${inhabitant.name} ${inhabitant.lastName}`}`)
        // The reply's inhabitant first, then the household's others one write at a time: D1 allows six connections per invocation
        const updatedInhabitant = await updateInhabitant(d1Client, id, {dinnerPreferences})
        for (const other of inhabitants.filter(({id: inhabitantId}) => inhabitantId !== id)) {
            await updateInhabitant(d1Client, other.id, {dinnerPreferences})
        }

        // Re-scaffold the household on the weekdays the draft changes, the DAILY_MAINTENANCE job keeps the rest in step
        const weekdays = changedWeekdays(inhabitants.map(stored => stored.dinnerPreferences), dinnerPreferences)
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
