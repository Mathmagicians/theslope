import {deleteHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {idParams} from '~/composables/useCoreValidation'

const paramSchema = idParams('id')

export default defineEventHandler(async (event) => {
    const {id} = await getValidatedRouterParams(event, paramSchema.parse)
    await deleteHeynaboEventAsSystem(id)
    return {deleted: id}
})
