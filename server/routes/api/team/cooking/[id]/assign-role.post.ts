import { defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus } from 'h3'
import { fetchDinnerEvent, updateDinnerEvent } from '~~/server/data/financesRepository'
import {
    createTeamAssignment,
    findTeamAssignmentByTeamAndInhabitant,
    updateTeamAssignment
} from '~~/server/data/prismaRepository'
import { useCookingTeamValidation } from '~/composables/useCookingTeamValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import type { DinnerEventDetail } from '~/composables/useBookingValidation'
import type { TeamRole } from '~/composables/useCookingTeamValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import { z } from 'zod'

const { throwH3Error } = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

// ADR-001: Import schema from validation composable
const { AssignRoleSchema } = useBookingValidation()
const { TeamRoleSchema } = useCookingTeamValidation()

/**
 * Assign cooking role to team member for dinner event
 *
 * POST /api/team/cooking/[id]/assign-role
 *
 * Business Logic:
 * 1. Validate dinner event exists and has cookingTeamId
 * 2. IF role === CHEF: Update dinnerEvent.chefId = inhabitantId
 * 3. Check if CookingTeamAssignment exists for this inhabitant + team
 * 4. If exists: Update role to specified role
 * 5. If not exists: Create new assignment with specified role
 *
 * ADR Compliance:
 * - ADR-001: All database operations through repository pattern
 * - ADR-002: Separate validation + business logic try-catch
 * - ADR-004: Logging with console.info/error
 * - ADR-010: Domain types used throughout, no Prisma types in API route
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const { cloudflare } = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '👩‍🍳 > TEAM > COOKING > ASSIGN_ROLE > [POST] > '

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let assignData!: { inhabitantId: number, role: TeamRole }
    try {
        ({ id } = await getValidatedRouterParams(event, idSchema.parse))
        assignData = await readValidatedBody(event, AssignRoleSchema.parse)
    } catch (error) {
        return throwH3Error(PREFIX, error)
    }

    // Business logic try-catch
    try {
        console.info(PREFIX, `Assigning ${assignData.role} role to inhabitant ${assignData.inhabitantId} for dinner event ${id}`)

        // Step 1: Fetch dinner event to verify it exists and get cookingTeamId
        const dinnerEvent = await fetchDinnerEvent(d1Client, id)
        if (!dinnerEvent) {
            return throwH3Error(PREFIX, `Dinner event ${id} not found`, 404)
        }

        if (!dinnerEvent.cookingTeamId) {
            return throwH3Error(PREFIX, `Dinner event ${id} has no cooking team assigned`, 400)
        }

        // Step 2: IF role is CHEF, update dinnerEvent.chefId (only CHEF gets special treatment)
        if (assignData.role === TeamRoleSchema.enum.CHEF) {
            await updateDinnerEvent(d1Client, id, {
                chefId: assignData.inhabitantId
            })
            console.info(PREFIX, `Updated dinnerEvent.chefId to ${assignData.inhabitantId}`)
        }

        // Step 3 & 4: Check if CookingTeamAssignment exists and create/update
        // ADR-001: Use repository functions for all database operations
        const existingAssignment = await findTeamAssignmentByTeamAndInhabitant(
            d1Client,
            dinnerEvent.cookingTeamId,
            assignData.inhabitantId
        )

        if (existingAssignment) {
            // Update role to specified role
            // ADR-010: Repository handles domain types and serialization
            await updateTeamAssignment(d1Client, existingAssignment.id, {
                role: assignData.role
            })
            console.info(`${PREFIX} Updated existing assignment ${existingAssignment.id} to ${assignData.role} role`)
        } else {
            // Create new assignment with specified role
            // ADR-010: Repository handles domain types and serialization
            await createTeamAssignment(d1Client, {
                cookingTeamId: dinnerEvent.cookingTeamId,
                inhabitantId: assignData.inhabitantId,
                role: assignData.role,
                allocationPercentage: 100,
                affinity: null
            })
            console.info(`${PREFIX} Created new ${assignData.role} assignment for inhabitant ${assignData.inhabitantId}`)
        }

        console.info(`${PREFIX} Successfully assigned ${assignData.role} role to inhabitant ${assignData.inhabitantId} for dinner event ${id}`)
        setResponseStatus(event, 200)

        // Re-fetch to get updated relations
        const finalDinner = await fetchDinnerEvent(d1Client, id)
        return finalDinner!
    } catch (error) {
        return throwH3Error(`👥 > ASSIGN_ROLE > [POST] Error assigning role to dinner event ${id}`, error)
    }
})
