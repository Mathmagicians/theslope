import {defineEventHandler} from "h3"
import {DinnerEvent} from "~/composables/useDinnerEventValidation"

export default defineEventHandler(async (event): Promise<DinnerEvent[]> => {
    console.warn('🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Not implemented yet')
    return []
})
