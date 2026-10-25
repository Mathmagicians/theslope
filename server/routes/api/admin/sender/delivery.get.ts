import {defineEventHandler, getValidatedQuery, setResponseStatus} from 'h3'
import {fetchDeliveries} from '~~/server/data/financesRepository'
import {fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {emailChannel} from '~~/server/utils/sender/config'
import {sendNotifications} from '~~/server/utils/sender/events/waitlist'
import {useDeliveryValidation, type Delivery, type DeliveryDryRun} from '~/composables/useDeliveryValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '📬 > DELIVERY > [GET]'

/**
 * GET /api/admin/sender/delivery?subjectType=&subjectIds= - the Delivery rows of the subjects named, the parameter
 * repeated per id
 *
 * GET /api/admin/sender/delivery?dryRun=BOOKING_STATUS - the delivery dry run of the booking notifications: before
 * SHOULD_SEND_BOOKING_EMAILS_FLAG goes on in an environment, the admin sees what the nightly run would send
 * (`make theslope-sender-dry-run-booking-status-<env>`). It reads the active season's dinners still to come and past
 * their booking deadline, as they stand, and their delivery records; with no active season it counts nothing. It
 * answers per user how many of each notification would go and how many are already recorded, and per notification how
 * many have no user to go to. It ignores the flag, and counts on the environment's email channel: without a deploy URL
 * or a sender binding its user list is empty.
 *
 * Each read sends and records nothing; every member reads (ADR-004).
 */
export default defineEventHandler(async (event): Promise<Delivery[] | DeliveryDryRun> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {DeliveryQuerySchema, DeliveryReadSchema} = useDeliveryValidation()

    // Validation - ADR-002
    let query
    try {
        query = await getValidatedQuery(event, DeliveryQuerySchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Invalid query parameters`, error, 400)
    }

    // Business logic - ADR-002
    try {
        switch (query.read) {
            case DeliveryReadSchema.enum.DRY_RUN: {
                const seasonId = await fetchActiveSeasonId(d1Client)
                const {dryRun} = await sendNotifications(d1Client, emailChannel(cloudflare.env), seasonId, {dryRun: true})
                if (!dryRun) {
                    return throwH3Error(`${LOG} The delivery dry run of ${query.senderEvent} failed`, new Error('No delivery dry run'))
                }
                console.info(`${LOG} Delivery dry run of ${query.senderEvent} on active season ${seasonId ?? 'none'}: ${dryRun.users.length} user(s)`)
                setResponseStatus(event, 200)
                return dryRun
            }
            case DeliveryReadSchema.enum.RECORDED: {
                const deliveries = await fetchDeliveries(d1Client, query.subjectType, query.subjectIds)
                console.info(`${LOG} ${deliveries.length} rows of ${query.subjectIds.length} ${query.subjectType} subject(s)`)
                setResponseStatus(event, 200)
                return deliveries
            }
        }
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the ${query.read} deliveries`, error)
    }
})
