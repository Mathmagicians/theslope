/**
 * Delivery facts (ADR-015 convergence): one row per version of a subject that reached a channel.
 */
import {getPrismaClientConnection} from "../utils/database"
import {useDeliveryValidation, type Delivery, type DeliveryCreate} from '~/composables/useDeliveryValidation'

const {DeliverySchema} = useDeliveryValidation()
const LOG = '📬 > DELIVERY'

/** All deliveries of one subject — a handful of rows (one per version and channel, plus re-sends) */
export async function fetchDeliveries(d1Client: D1Database, subjectType: Delivery['subjectType'], subjectId: number): Promise<Delivery[]> {
    const prisma = await getPrismaClientConnection(d1Client)
    const rows = await prisma.delivery.findMany({where: {subjectType, subjectId}, orderBy: {id: 'asc'}})
    return rows.map(row => DeliverySchema.parse(row))
}

export async function recordDelivery(d1Client: D1Database, data: DeliveryCreate): Promise<Delivery> {
    const prisma = await getPrismaClientConnection(d1Client)
    const row = await prisma.delivery.create({data})
    console.info(`${LOG} > [RECORD] ${data.subjectType} ${data.subjectId} v${data.version} ${data.kind}`)
    return DeliverySchema.parse(row)
}
