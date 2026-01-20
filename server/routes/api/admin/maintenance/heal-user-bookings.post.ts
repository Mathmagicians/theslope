import {defineEventHandler, setResponseStatus, getQuery} from "h3"
import {getPrismaClientConnection} from "~~/server/utils/database"
import {fetchUserIntentKeys, fetchOrders} from "~~/server/data/financesRepository"
import {fetchActiveSeasonId, fetchSeason} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {useBookingValidation, type DinnerMode} from "~/composables/useBookingValidation"
import {useSeason} from "~/composables/useSeason"
import {useTicket} from "~/composables/useTicket"
import {formatDate} from "~/utils/date"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper
const LOG = '🔧 > HEAL_USER_BOOKINGS >'

/**
 * Result schema for healing operation
 */
const HealingResultSchema = z.object({
    dryRun: z.boolean(),
    seasonId: z.number().nullable(),
    householdId: z.number().nullable(),
    confirmedKeys: z.number(),
    ordersChecked: z.number(),
    toHeal: z.array(z.object({
        inhabitantId: z.number(),
        inhabitantName: z.string().nullable(),
        householdAddress: z.string().nullable(),
        dinnerEventId: z.number(),
        dinnerEventDate: z.string().nullable(),
        issue: z.enum(['deleted', 'mode_changed']),
        originalMode: z.string(),
        currentMode: z.string().nullable()
    })),
    healed: z.number(),
    errors: z.array(z.string())
})

type HealingResult = z.infer<typeof HealingResultSchema>

const emptyResult = (dryRun: boolean, seasonId: number | null, householdId: number | null): HealingResult => ({
    dryRun,
    seasonId,
    householdId,
    confirmedKeys: 0,
    ordersChecked: 0,
    toHeal: [],
    healed: 0,
    errors: []
})

/**
 * POST /api/admin/maintenance/heal-user-bookings
 *
 * Heals orders that were incorrectly deleted or had dinnerMode changed
 * by the scaffolder before the user intent fix was deployed.
 *
 * Query params:
 * - dryRun: "true" (default) for preview, "false" to execute healing
 * - householdId: optional - heal specific household only (recommended to avoid big bang)
 *
 * Audit: Creates SYSTEM_CREATED entries (no userId passed to scaffolder).
 * The original USER_BOOKED/USER_CLAIMED is preserved in history, so fetchUserIntentKeys
 * will still return the key in confirmedKeys → scaffolder won't nuke it again.
 */
export default defineEventHandler(async (event): Promise<HealingResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {OrderAuditActionSchema} = useBookingValidation()
    const {getScaffoldableDinnerEvents} = useSeason()
    const {resolveTicketPrice} = useTicket()

    const query = getQuery(event)
    const dryRun = query.dryRun !== 'false' // Default to true
    const householdId = query.householdId ? parseInt(query.householdId as string, 10) : null

    console.info(`${LOG} Starting healing operation (dryRun=${dryRun}, householdId=${householdId ?? 'all'})`)

    try {
        // Get active season
        const seasonId = await fetchActiveSeasonId(d1Client)
        if (!seasonId) {
            console.info(`${LOG} No active season - nothing to heal`)
            setResponseStatus(event, 200)
            return emptyResult(dryRun, null, householdId)
        }

        // Fetch season with dinner events
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            throw new Error(`Season ${seasonId} not found`)
        }

        // Get scaffoldable dinner events (future only)
        const futureDinnerEvents = getScaffoldableDinnerEvents(season.dinnerEvents ?? [])
        const futureDinnerEventIds = new Set(futureDinnerEvents.map(de => de.id))

        // Step 1: Use fetchUserIntentKeys to get confirmed keys
        const {confirmedKeys} = await fetchUserIntentKeys(d1Client, seasonId)
        console.info(`${LOG} Found ${confirmedKeys.size} confirmed user intent keys`)

        if (confirmedKeys.size === 0) {
            setResponseStatus(event, 200)
            return emptyResult(dryRun, seasonId, householdId)
        }

        // If householdId provided, get inhabitants for filtering
        const prisma = await getPrismaClientConnection(d1Client)
        let householdInhabitantIds: Set<number> | null = null
        if (householdId) {
            const inhabitants = await prisma.inhabitant.findMany({
                where: { householdId },
                select: { id: true }
            })
            householdInhabitantIds = new Set(inhabitants.map(i => i.id))
            console.info(`${LOG} Filtering to household ${householdId} with ${householdInhabitantIds.size} inhabitants`)
        }

        // Step 2: Fetch current orders for future dinner events
        const currentOrders = await fetchOrders(d1Client, Array.from(futureDinnerEventIds))
        const orderByKey = new Map(
            currentOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o])
        )

        // Step 3: Query audit history for confirmed intents to get snapshots
        const confirmedAudits = await prisma.orderHistory.findMany({
            where: {
                action: {
                    in: [
                        OrderAuditActionSchema.enum.USER_BOOKED,
                        OrderAuditActionSchema.enum.USER_CLAIMED
                    ]
                },
                seasonId: seasonId,
                inhabitantId: { not: null },
                dinnerEventId: { not: null }
            },
            select: {
                inhabitantId: true,
                dinnerEventId: true,
                auditData: true,
                timestamp: true
            },
            orderBy: { timestamp: 'desc' }
        })

        // Fetch inhabitant info for display (name + household address)
        const allInhabitantIds = [...new Set(confirmedAudits.map(a => a.inhabitantId).filter(Boolean))] as number[]
        const inhabitantsInfo = await prisma.inhabitant.findMany({
            where: { id: { in: allInhabitantIds } },
            select: { id: true, name: true, lastName: true, household: { select: { address: true } } }
        })
        const inhabitantInfoById = new Map(inhabitantsInfo.map(i => [
            i.id,
            { name: `${i.name} ${i.lastName}`, address: i.household?.address ?? null }
        ]))

        // Build dinner event date lookup
        const dinnerEventDateById = new Map(futureDinnerEvents.map(de => [de.id, de.date]))

        // Step 4: Find orders that need healing (deleted or mode changed)
        const toHeal: Array<{
            inhabitantId: number
            inhabitantName: string | null
            householdAddress: string | null
            dinnerEventId: number
            dinnerEventDate: Date | null
            issue: 'deleted' | 'mode_changed'
            originalMode: string
            currentMode: string | null
            ticketPriceId: number | null  // null = resolve from birthDate later
        }> = []
        const seen = new Set<string>()
        const errors: string[] = []

        for (const audit of confirmedAudits) {
            const key = `${audit.inhabitantId}-${audit.dinnerEventId}`

            // Skip if not in confirmedKeys (most recent was USER_CANCELLED)
            if (!confirmedKeys.has(key)) continue

            // Skip if filtering by household and inhabitant not in that household
            if (householdInhabitantIds && !householdInhabitantIds.has(audit.inhabitantId!)) continue

            // Skip if already processed (take most recent)
            if (seen.has(key)) continue
            seen.add(key)

            // Skip if not a future dinner event
            if (!futureDinnerEventIds.has(audit.dinnerEventId!)) continue

            // Parse snapshot to get original dinnerMode
            // Formats: {orderSnapshot: {...}}, {orderData: {...}}, or {...} directly
            let originalMode: string
            let ticketPriceId: number | null
            try {
                const parsed = JSON.parse(audit.auditData)
                const snapshot = parsed.orderSnapshot ?? parsed.orderData ?? parsed
                if (!snapshot.dinnerMode) {
                    errors.push(`Missing dinnerMode in audit data for key ${key}`)
                    continue
                }
                originalMode = snapshot.dinnerMode
                // ticketPriceId can be null - we'll resolve from birthDate later
                ticketPriceId = snapshot.ticketPriceId ?? null
            } catch (e) {
                errors.push(`Failed to parse audit data for key ${key}: ${e}`)
                continue
            }

            // Skip NONE mode - that's a cancellation, not a booking to restore
            if (originalMode === 'NONE') continue

            // Check current order state
            const currentOrder = orderByKey.get(key)

            const info = inhabitantInfoById.get(audit.inhabitantId!)

            if (!currentOrder) {
                // Order was deleted
                toHeal.push({
                    inhabitantId: audit.inhabitantId!,
                    inhabitantName: info?.name ?? null,
                    householdAddress: info?.address ?? null,
                    dinnerEventId: audit.dinnerEventId!,
                    dinnerEventDate: dinnerEventDateById.get(audit.dinnerEventId!) ?? null,
                    issue: 'deleted',
                    originalMode,
                    currentMode: null,
                    ticketPriceId
                })
            } else if (currentOrder.dinnerMode !== originalMode) {
                // Order mode was changed
                toHeal.push({
                    inhabitantId: audit.inhabitantId!,
                    inhabitantName: info?.name ?? null,
                    householdAddress: info?.address ?? null,
                    dinnerEventId: audit.dinnerEventId!,
                    dinnerEventDate: dinnerEventDateById.get(audit.dinnerEventId!) ?? null,
                    issue: 'mode_changed',
                    originalMode,
                    currentMode: currentOrder.dinnerMode,
                    ticketPriceId
                })
            }
        }

        console.info(`${LOG} Found ${toHeal.length} orders to heal (${toHeal.filter(h => h.issue === 'deleted').length} deleted, ${toHeal.filter(h => h.issue === 'mode_changed').length} mode changed)`)

        // Step 5: If not dry run, execute healing via scaffolder
        let healed = 0
        if (!dryRun && toHeal.length > 0) {
            // Fetch inhabitants with birthDate for price resolution
            const inhabitantIds = [...new Set(toHeal.map(h => h.inhabitantId))]
            const inhabitants = await prisma.inhabitant.findMany({
                where: { id: { in: inhabitantIds } },
                select: { id: true, householdId: true, birthDate: true }
            })
            const inhabitantToHousehold = new Map(inhabitants.map(i => [i.id, i.householdId]))
            const inhabitantToBirthDate = new Map(inhabitants.map(i => [i.id, i.birthDate]))

            // Build dinner event date lookup
            const dinnerEventById = new Map(futureDinnerEvents.map(de => [de.id, de]))
            const validTicketPriceIds = new Set(season.ticketPrices.map(tp => tp.id))

            // Build DesiredOrders from toHeal, resolving ticket prices gracefully
            const desiredOrders: Array<{
                inhabitantId: number
                dinnerEventId: number
                dinnerMode: DinnerMode
                ticketPriceId: number
                isGuestTicket: boolean
                state: 'BOOKED'
                orderId: number | undefined
            }> = []

            for (const h of toHeal) {
                let ticketPriceId = h.ticketPriceId

                // If original ticket price is null or no longer exists, resolve from birthDate
                if (ticketPriceId === null || !validTicketPriceIds.has(ticketPriceId)) {
                    const birthDate = inhabitantToBirthDate.get(h.inhabitantId)
                    const dinnerEvent = dinnerEventById.get(h.dinnerEventId)
                    const resolved = resolveTicketPrice(
                        birthDate ?? null,
                        null,
                        season.ticketPrices,
                        dinnerEvent?.date
                    )
                    if (!resolved?.id) {
                        errors.push(`Cannot resolve ticket price for ${h.inhabitantId}-${h.dinnerEventId}`)
                        continue
                    }
                    const oldPriceId = ticketPriceId
                    ticketPriceId = resolved.id
                    console.info(`${LOG} Resolved ticket price ${oldPriceId} → ${ticketPriceId} for ${h.inhabitantId}-${h.dinnerEventId}`)
                }

                desiredOrders.push({
                    inhabitantId: h.inhabitantId,
                    dinnerEventId: h.dinnerEventId,
                    dinnerMode: h.originalMode as DinnerMode,
                    ticketPriceId,
                    isGuestTicket: false,
                    state: 'BOOKED' as const,
                    orderId: orderByKey.get(`${h.inhabitantId}-${h.dinnerEventId}`)?.id
                })
            }

            // Group by household and run scaffolder for each
            const byHousehold = new Map<number, typeof desiredOrders>()
            for (const order of desiredOrders) {
                const orderHouseholdId = inhabitantToHousehold.get(order.inhabitantId)
                if (!orderHouseholdId) {
                    errors.push(`Inhabitant ${order.inhabitantId} not found`)
                    continue
                }
                if (!byHousehold.has(orderHouseholdId)) {
                    byHousehold.set(orderHouseholdId, [])
                }
                byHousehold.get(orderHouseholdId)!.push(order)
            }

            // Run scaffolder in system mode for each household
            // No userId = SYSTEM_CREATED audit (original USER_BOOKED preserved in history)
            for (const [hid, orders] of byHousehold) {
                try {
                    const result = await scaffoldPrebookings(d1Client, {
                        seasonId,
                        householdId: hid,
                        desiredOrders: orders
                        // No userId → system mode → SYSTEM_CREATED audit
                    })
                    healed += result.created + result.modeUpdated
                    console.info(`${LOG} Healed household ${hid}: created=${result.created}, modeUpdated=${result.modeUpdated}`)
                } catch (e) {
                    errors.push(`Failed to heal household ${hid}: ${e}`)
                }
            }
        }

        setResponseStatus(event, 200)
        return HealingResultSchema.parse({
            dryRun,
            seasonId,
            householdId,
            confirmedKeys: confirmedKeys.size,
            ordersChecked: seen.size,
            toHeal: toHeal.map(h => ({
                inhabitantId: h.inhabitantId,
                inhabitantName: h.inhabitantName,
                householdAddress: h.householdAddress,
                dinnerEventId: h.dinnerEventId,
                dinnerEventDate: h.dinnerEventDate ? formatDate(h.dinnerEventDate) : null,
                issue: h.issue,
                originalMode: h.originalMode,
                currentMode: h.currentMode
            })),
            healed,
            errors
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error during healing`, error)
    }
})
