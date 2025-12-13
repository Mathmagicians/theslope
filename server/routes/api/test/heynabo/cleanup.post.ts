import {deleteHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {z} from 'zod'

const CleanupSchema = z.object({
    eventIds: z.array(z.number().int().positive())
})

export default defineEventHandler(async (event) => {
    const {eventIds} = await readValidatedBody(event, CleanupSchema.parse)
    const results = await Promise.all(eventIds.map(async (id) => {
        try {
            await deleteHeynaboEventAsSystem(id)
            return true
        } catch (e) {
            console.warn('Failed to delete Heynabo event', id, e)
            return false
        }
    }))
    return {deleted: results.filter(Boolean).length, total: eventIds.length}
})
