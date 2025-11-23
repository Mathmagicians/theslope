import { defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus } from 'h3'
import { updateDinnerEventAllergens } from '~~/server/data/financesRepository'
import type { DinnerEventDetail } from '~/composables/useBookingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import { z } from 'zod'

const { throwH3Error } = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

const UpdateAllergensSchema = z.object({
    allergenIds: z.array(z.number().int().positive('Allergen ID must be a positive integer'))
})

/**
 * Update allergens for dinner event (chef operation)
 *
 * POST /api/chef/dinner/[id]/allergens
 *
 * Business Logic:
 * 1. Validate dinner event ID and allergen IDs
 * 2. Delete existing allergen assignments
 * 3. Create new allergen assignments from provided IDs
 * 4. Return updated dinner event with allergens
 *
 * Safety-Critical: Allergen data requires audit trail
 *
 * ADR Compliance:
 * - ADR-001: Schema validation
 * - ADR-002: Separate validation + business logic try-catch
 * - ADR-004: Logging with console.info/error
 * - ADR-010: Repository handles data transformation
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const { cloudflare } = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '👨‍🍳 > CHEF > DINNER > ALLERGENS > [POST] > '

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let allergenData!: { allergenIds: number[] }
    try {
        ({ id } = await getValidatedRouterParams(event, idSchema.parse))
        allergenData = await readValidatedBody(event, UpdateAllergensSchema.parse)
    } catch (error) {
        return throwH3Error(PREFIX, 'Input validation error', error)
    }

    // Business logic try-catch
    try {
        console.info(PREFIX, `Updating allergens for dinner event ${id} with ${allergenData.allergenIds.length} allergens`)

        const updatedDinner = await updateDinnerEventAllergens(d1Client, id, allergenData.allergenIds)

        console.info(PREFIX, `Successfully updated allergens for dinner event ${id}`)
        setResponseStatus(event, 200)
        return updatedDinner
    } catch (error) {
        return throwH3Error(PREFIX, `Error updating allergens for dinner event ${id}`, error)
    }
})
