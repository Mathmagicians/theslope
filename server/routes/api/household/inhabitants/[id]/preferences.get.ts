import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, setResponseStatus} from "h3"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getRequiredUser} from "~~/server/utils/authorizationHelper"
import {AllInhabitantsQuerySchema, RouteIdSchema, idParams, useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult, type DinnerMode} from "~/composables/useBookingValidation"
import {fetchHouseholds, fetchInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {changedWeekdays, type WeekDayMap} from "~/types/dateTypes"

const {throwH3Error} = eventHandlerHelper

const LOG = '👩‍🏠 > INHABITANT > [PREFERENCES PREVIEW]'

const paramSchema = idParams('id')

const {WeekDayMapSchemaOptional, deserializeWeekDayMap} = useCoreValidation()
const querySchema = AllInhabitantsQuerySchema.extend({
    // The draft as `serializeWeekDayMap` writes it
    dinnerPreferences: z.preprocess(value => typeof value === 'string' ? deserializeWeekDayMap(value) : value, WeekDayMapSchemaOptional),
    seasonId: RouteIdSchema.optional()
})

/**
 * GET /api/household/inhabitants/[id]/preferences?dinnerPreferences=<serialized draft>&seasonId=S&allInhabitants=true
 * The dry run of the preference save: the reply the save of the draft would give, with the stored inhabitant; nothing
 * is written and no mail goes out. `allInhabitants=true` previews power mode: the draft for every inhabitant of the
 * household, in one run
 *
 * Requires: authenticated user; any member reads any household's (ADR-004)
 */
export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const d1Client = event.context.cloudflare.env.DB

    let id: number
    let seasonId: number | undefined
    let allInhabitants: boolean
    let dinnerPreferences: WeekDayMap<DinnerMode>
    try {
        id = (await getValidatedRouterParams(event, paramSchema.parse)).id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        allInhabitants = query.allInhabitants
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

        const inhabitants = allInhabitants ? (await fetchHouseholds(d1Client, inhabitant.householdId)).flatMap(household => household.inhabitants) : [inhabitant]
        console.info(`${LOG} User ${user.email} previewing preferences for ${allInhabitants ? `the ${inhabitants.length} inhabitants of household ${inhabitant.householdId}` : `inhabitant ${inhabitant.name} ${inhabitant.lastName}`}`)

        // The save's scaffold on the weekdays the draft changes, run on the draft
        const scaffoldResult: ScaffoldResult = await scaffoldPrebookings(d1Client, {
            seasonId,
            householdId: inhabitant.householdId,
            weekdays: changedWeekdays(inhabitants.map(stored => stored.dinnerPreferences), dinnerPreferences),
            preferences: inhabitants.map(({id: inhabitantId}) => ({inhabitantId, dinnerPreferences})),
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
