import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, setResponseStatus} from "h3"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getRequiredUser} from "~~/server/utils/authorizationHelper"
import {RouteIdSchema, idParams, useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult, type DinnerMode} from "~/composables/useBookingValidation"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {changedWeekdays, type WeekDayMap} from "~/types/dateTypes"

const {throwH3Error} = eventHandlerHelper

const LOG = '👩‍🏠 > INHABITANT > [PREFERENCES PREVIEW]'

const paramSchema = idParams('id')

const {WeekDayMapSchemaOptional, deserializeWeekDayMap} = useCoreValidation()
const querySchema = z.object({
    // The draft as `serializeWeekDayMap` writes it
    dinnerPreferences: z.preprocess(value => typeof value === 'string' ? deserializeWeekDayMap(value) : value, WeekDayMapSchemaOptional),
    seasonId: RouteIdSchema.optional()
})

/**
 * GET /api/household/inhabitants/[id]/preferences?dinnerPreferences=<serialized draft>&seasonId=S
 * The dry run of the preference save: the reply the save of the draft would give, with the stored inhabitant; nothing
 * is written and no mail goes out
 *
 * Requires: authenticated user; any member reads any household's (ADR-004)
 */
export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const d1Client = event.context.cloudflare.env.DB

    let id!: number
    let seasonId: number | undefined
    let dinnerPreferences!: WeekDayMap<DinnerMode>
    try {
        id = (await getValidatedRouterParams(event, paramSchema.parse)).id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        dinnerPreferences = query.dinnerPreferences
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    const user = await getRequiredUser(event)

    try {
        const inhabitant = await fetchInhabitant(d1Client, id)
        if (!inhabitant) {
            return throwH3Error(`${LOG} Inhabitant ${id} not found`, new Error('Not found'), 404)
        }

        console.info(`${LOG} User ${user.email} previewing preferences for inhabitant ${inhabitant.name} ${inhabitant.lastName}`)

        // The save's scaffold on the weekdays the draft changes, run on the draft
        const weekdays = changedWeekdays(inhabitant.dinnerPreferences, dinnerPreferences)
        const scaffoldResult: ScaffoldResult = await scaffoldPrebookings(d1Client, {
            seasonId,
            householdId: inhabitant.householdId,
            weekdays,
            preferences: [{inhabitantId: id, dinnerPreferences}],
            preview: true
        })

        const {InhabitantUpdateResponseSchema} = useBookingValidation()
        setResponseStatus(event, 200)
        return InhabitantUpdateResponseSchema.parse({
            inhabitant,
            scaffoldResult
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error previewing preferences for inhabitant ${id}`, error)
    }
})
