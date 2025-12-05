import {defineEventHandler, setResponseStatus, readValidatedBody} from 'h3'
import {useBillingValidation} from '~/composables/useBillingValidation'
import type {BillingImportResponse} from '~/composables/useBillingValidation'
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {createOrders} from '~~/server/data/financesRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {isSameDay} from 'date-fns'
import {getHouseholdShortName} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/billing/import
 *
 * Import orders from CSV file (framelding format) into ACTIVE season
 * - Address matching: Via shortName (computed from address)
 * - Inhabitant: Assign to first inhabitant in household
 * - Missing DinnerEvent: Error (fail import)
 *
 * ADR-002: Separate validation vs business logic
 * ADR-004: Logging standards
 */
export default defineEventHandler(async (event): Promise<BillingImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const {BillingImportRequestSchema, parseCSV, TicketType, DinnerMode, OrderState} = useBillingValidation()

    const LOG = '📦 > BILLING > [IMPORT] > '

    // Validation - fail early
    let csvContent: string
    try {
        const body = await readValidatedBody(event, BillingImportRequestSchema.parse)
        csvContent = body.csvContent
    } catch (error) {
        return throwH3Error(`${LOG} Invalid request body: `, error, 400)
    }

    // Business logic
    try {
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        if (!activeSeasonId) {
            return throwH3Error(LOG, createError({statusCode: 400, message: 'No active season'}), 400)
        }

        console.info(`${LOG} Starting import for active season ${activeSeasonId}`)

        const parsedOrders = parseCSV(csvContent)
        console.info(`${LOG} Parsed ${parsedOrders.length} order entries from CSV`)

        if (parsedOrders.length === 0) {
            setResponseStatus(event, 200)
            return {orders: [], count: 0}
        }

        const season = await fetchSeason(d1Client, activeSeasonId)
        if (!season) {
            return throwH3Error(LOG, createError({statusCode: 404, message: `Season ${activeSeasonId} not found`}))
        }

        const allHouseholds = await fetchHouseholds(d1Client)
        const addressShortNamesFromOrders = new Set(parsedOrders.map(o => getHouseholdShortName(o.address)))
        const householdShortNamesSet = new Set(allHouseholds.map(h => h.shortName))

        if (!addressShortNamesFromOrders.isSubsetOf(householdShortNamesSet)) {
            const unmatched = addressShortNamesFromOrders.difference(householdShortNamesSet)
            return throwH3Error(LOG, createError({
                statusCode: 400,
                message: `Addresses not found: ${Array.from(unmatched).join(', ')}`
            }))
        }

        const householdByShortName = new Map(
            allHouseholds
                .filter(h => addressShortNamesFromOrders.has(h.shortName))
                .map(h => [h.shortName, h])
        )

        const adultPrice = season.ticketPrices?.find(tp => tp.ticketType === TicketType.ADULT)
        const childPrice = season.ticketPrices?.find(tp => tp.ticketType === TicketType.CHILD)

        if (!adultPrice) {
            return throwH3Error(LOG, createError({statusCode: 400, message: 'Season has no ADULT ticket price'}))
        }
        if (!childPrice) {
            return throwH3Error(LOG, createError({statusCode: 400, message: 'Season has no CHILD ticket price'}))
        }

        // Build order data grouped by household (ADR-009: batch by household for memory)
        const ordersByHousehold = parsedOrders.reduce((acc, parsedOrder) => {
            const shortName = getHouseholdShortName(parsedOrder.address)
            const household = householdByShortName.get(shortName)!
            const dinnerEvent = season.dinnerEvents?.find(de => isSameDay(de.date, parsedOrder.date))
            const firstInhabitant = household.inhabitants?.[0]

            if (!dinnerEvent) {
                throw createError({statusCode: 400, message: `No dinner event for ${parsedOrder.date.toISOString().split('T')[0]} (${parsedOrder.address})`})
            }
            if (!firstInhabitant) {
                throw createError({statusCode: 400, message: `No inhabitants in household ${household.address}`})
            }

            const baseOrder = {
                dinnerEventId: dinnerEvent.id!,
                inhabitantId: firstInhabitant.id!,
                bookedByUserId: firstInhabitant.userId ?? null,
                dinnerMode: DinnerMode.DINEIN,
                state: OrderState.BOOKED
            }

            const orders = [
                ...Array(parsedOrder.adultCount).fill({...baseOrder, ticketPriceId: adultPrice.id!}),
                ...Array(parsedOrder.childCount).fill({...baseOrder, ticketPriceId: childPrice.id!})
            ]

            return acc.set(household.id!, [...(acc.get(household.id!) ?? []), ...orders])
        }, new Map())

        // Process households sequentially to avoid memory limits
        const orders = []
        for (const [, householdOrders] of ordersByHousehold) {
            orders.push(...await createOrders(d1Client, householdOrders))
        }

        console.info(`${LOG} Done: created=${orders.length}`)

        setResponseStatus(event, 200)
        return {orders, count: orders.length}
    } catch (error) {
        return throwH3Error(`${LOG} Import failed`, error)
    }
})
