import {fetchHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {idParams} from '~/composables/useCoreValidation'

const paramSchema = idParams('id')

export default defineEventHandler(async (event) => {
    const {id} = await getValidatedRouterParams(event, paramSchema.parse)
    return await fetchHeynaboEventAsSystem(id)
})
