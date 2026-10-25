import {defineEventHandler, getValidatedQuery, setResponseStatus} from 'h3'
import {fetchDeliveries} from '~~/server/data/financesRepository'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '📬 > DELIVERY > [GET]'

/**
 * GET /api/admin/sender/delivery?subjectType=&subjectIds= - the Delivery rows of the subjects named
 *
 * One subject type and its subjects' ids, the parameter repeated per id. Every member reads (ADR-004).
 */
export default defineEventHandler(async (event): Promise<Delivery[]> => {
    const d1Client = event.context.cloudflare.env.DB
    const {DeliveryQuerySchema} = useDeliveryValidation()

    // Validation - ADR-002
    let query
    try {
        query = await getValidatedQuery(event, DeliveryQuerySchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Invalid query parameters`, error, 400)
    }

    // Business logic - ADR-002
    try {
        const deliveries = await fetchDeliveries(d1Client, query.subjectType, query.subjectIds)
        console.info(`${LOG} ${deliveries.length} rows of ${query.subjectIds.length} ${query.subjectType} subject(s)`)
        setResponseStatus(event, 200)
        return deliveries
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the deliveries of ${query.subjectType}`, error)
    }
})
