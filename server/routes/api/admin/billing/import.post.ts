import {defineEventHandler, setResponseStatus, readValidatedBody} from 'h3'
import {useBillingValidation} from '~/composables/useBillingValidation'
import type {BillingImportResponse} from '~/composables/useBillingValidation'
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {fetchOrders, createOrder, deleteOrder} from '~~/server/data/financesRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {isSameDay} from 'date-fns'

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/billing/import
 *
 * Import orders from CSV file (framelding format) into ACTIVE season
 * - Idempotent: Re-running same import produces same result
 * - Address matching: Exact match on Household.address
 * - Inhabitant: Assign to first adult inhabitant in household
 * - BABY tickets: Ignored
 * - Missing DinnerEvent: Warning (skip row, continue)
 *
 * ADR-002: Separate validation vs business logic
 * ADR-004: Logging standards
 */
export default defineEventHandler(async (event): Promise<BillingImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const {
        BillingImportRequestSchema,
        parseCSV,
        getOrderKey,
        TicketType,
        DinnerMode,
        OrderState
    } = useBillingValidation()

    // Validation - fail early
    let csvContent: string
    try {
        const body = await readValidatedBody(event, BillingImportRequestSchema.parse)
        csvContent = body.csvContent
    } catch (error) {
        throw createError({statusCode: 400, message: 'Invalid request body', cause: error})
    }

    // Business logic
    try {
        // 1. Get active season
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        if (!activeSeasonId) {
            throw createError({statusCode: 400, message: 'No active season'})
        }

        console.info(`📦 > BILLING > [IMPORT] Starting import for active season ${activeSeasonId}`)

        // 2. Parse CSV (throws on malformed)
        const parsedOrders = parseCSV(csvContent)
        console.info(`📦 > BILLING > [IMPORT] Parsed ${parsedOrders.length} order entries from CSV`)

        if (parsedOrders.length === 0) {
            setResponseStatus(event, 200)
            return {
                ordersCreated: 0,
                ordersUpdated: 0,
                ordersSkipped: 0,
                warnings: ['No orders found in CSV'],
                errors: []
            }
        }

        // 3. Fetch season with dinner events and ticket prices
        const season = await fetchSeason(d1Client, activeSeasonId)
        if (!season) {
            throw createError({statusCode: 404, message: `Season ${activeSeasonId} not found`})
        }

        // 4. Fetch all households and filter by addresses from CSV
        const allHouseholds = await fetchHouseholds(d1Client)
        const addresses = [...new Set(parsedOrders.map(o => o.address))]
        const householdByAddress = new Map(
            allHouseholds
                .filter(h => addresses.includes(h.address))
                .map(h => [h.address, h])
        )

        // Check for unmatched addresses
        const unmatchedAddresses = addresses.filter(addr => !householdByAddress.has(addr))
        if (unmatchedAddresses.length > 0) {
            throw createError({
                statusCode: 400,
                message: `Addresses not found: ${unmatchedAddresses.join(', ')}`
            })
        }

        // 5. Get ticket prices for ADULT and CHILD
        const adultPrice = season.ticketPrices?.find(tp => tp.ticketType === TicketType.ADULT)
        const childPrice = season.ticketPrices?.find(tp => tp.ticketType === TicketType.CHILD)

        if (!adultPrice) {
            throw createError({statusCode: 400, message: 'Season has no ADULT ticket price'})
        }
        if (!childPrice) {
            throw createError({statusCode: 400, message: 'Season has no CHILD ticket price'})
        }

        // 6. Build existing orders map for idempotency
        const existingOrdersMap = new Map<string, number[]>()

        for (const dinnerEvent of season.dinnerEvents || []) {
            const orders = await fetchOrders(d1Client, dinnerEvent.id)
            for (const order of orders) {
                const household = allHouseholds.find(h =>
                    h.inhabitants?.some(i => i.id === order.inhabitantId)
                )
                if (household) {
                    const key = getOrderKey(household.id, dinnerEvent.id, order.ticketType)
                    const existing = existingOrdersMap.get(key) || []
                    existing.push(order.id)
                    existingOrdersMap.set(key, existing)
                }
            }
        }

        // 7. Process orders
        const warnings: string[] = []
        let ordersCreated = 0
        let ordersUpdated = 0
        let ordersSkipped = 0

        for (const parsedOrder of parsedOrders) {
            const household = householdByAddress.get(parsedOrder.address)!

            const dinnerEvent = season.dinnerEvents?.find(de =>
                isSameDay(de.date, parsedOrder.date)
            )

            if (!dinnerEvent) {
                const dateStr = parsedOrder.date.toISOString().split('T')[0]
                warnings.push(`No dinner event for ${dateStr} (${parsedOrder.address})`)
                ordersSkipped += parsedOrder.adultCount + parsedOrder.childCount
                continue
            }

            const firstInhabitant = household.inhabitants?.[0]
            if (!firstInhabitant) {
                warnings.push(`No inhabitants in household ${household.address}`)
                ordersSkipped += parsedOrder.adultCount + parsedOrder.childCount
                continue
            }

            // ADULT orders
            if (parsedOrder.adultCount > 0) {
                const key = getOrderKey(household.id, dinnerEvent.id, TicketType.ADULT)
                const existingIds = existingOrdersMap.get(key) || []

                if (existingIds.length === parsedOrder.adultCount) {
                    ordersSkipped += parsedOrder.adultCount
                } else {
                    for (const id of existingIds) {
                        await deleteOrder(d1Client, id)
                        ordersUpdated++
                    }
                    for (let i = 0; i < parsedOrder.adultCount; i++) {
                        await createOrder(d1Client, {
                            dinnerEventId: dinnerEvent.id,
                            inhabitantId: firstInhabitant.id,
                            ticketPriceId: adultPrice.id!,
                            dinnerMode: DinnerMode.DINEIN,
                            state: OrderState.BOOKED
                        })
                        ordersCreated++
                    }
                }
            }

            // CHILD orders
            if (parsedOrder.childCount > 0) {
                const key = getOrderKey(household.id, dinnerEvent.id, TicketType.CHILD)
                const existingIds = existingOrdersMap.get(key) || []

                if (existingIds.length === parsedOrder.childCount) {
                    ordersSkipped += parsedOrder.childCount
                } else {
                    for (const id of existingIds) {
                        await deleteOrder(d1Client, id)
                        ordersUpdated++
                    }
                    for (let i = 0; i < parsedOrder.childCount; i++) {
                        await createOrder(d1Client, {
                            dinnerEventId: dinnerEvent.id,
                            inhabitantId: firstInhabitant.id,
                            ticketPriceId: childPrice.id!,
                            dinnerMode: DinnerMode.DINEIN,
                            state: OrderState.BOOKED
                        })
                        ordersCreated++
                    }
                }
            }
        }

        console.info(`📦 > BILLING > [IMPORT] Done: created=${ordersCreated}, updated=${ordersUpdated}, skipped=${ordersSkipped}`)

        setResponseStatus(event, 200)
        return {
            ordersCreated,
            ordersUpdated,
            ordersSkipped,
            warnings,
            errors: []
        }
    } catch (error) {
        return throwH3Error('📦 > BILLING > [IMPORT] Import failed', error)
    }
})
