import {fetchHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {z} from 'zod'

const idSchema = z.object({id: z.coerce.number().int().positive()})

export default defineEventHandler(async (event) => {
    const {id} = await getValidatedRouterParams(event, idSchema.parse)
    return await fetchHeynaboEventAsSystem(id)
})
