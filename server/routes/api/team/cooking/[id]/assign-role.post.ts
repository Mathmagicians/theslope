import { defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus } from 'h3'
import { fetchDinnerEvent, updateDinnerEvent } from '~~/server/data/financesRepository'
import {
    createTeamAssignment,
    findTeamAssignmentByTeamAndInhabitant,
    updateTeamAssignment
} from '~~/server/data/prismaRepository'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useCookingTeam } from '~/composables/useCookingTeam'
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
const { decideRoleAssignmentWrites } = useCookingTeam()

/**
 * Assign cooking role to team member for dinner event
 *
 * POST /api/team/cooking/[id]/assign-role
 *
 * ADR Compliance:
 * - ADR-001: All database operations through repository pattern; business logic in composable
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

        const dinnerEvent = await fetchDinnerEvent(d1Client, id)
        if (!dinnerEvent) {
            return throwH3Error(PREFIX, `Dinner event ${id} not found`, 404)
        }
        if (!dinnerEvent.cookingTeamId) {
            return throwH3Error(PREFIX, `Dinner event ${id} has no cooking team assigned`, 400)
        }

        const plan = decideRoleAssignmentWrites(
            dinnerEvent.cookingTeamId,
            assignData.inhabitantId,
            assignData.role,
            dinnerEvent.chefId
        )

        // Write 1: chef-on-dinner — set on promote, clear on demote, no-op when unchanged
        if (plan.nextChefId !== dinnerEvent.chefId) {
            await updateDinnerEvent(d1Client, id, { chefId: plan.nextChefId })
            console.info(PREFIX, `Updated dinnerEvent.chefId to ${plan.nextChefId}`)
        }

        // Write 2: team-membership upsert (always)
        const existingAssignment = await findTeamAssignmentByTeamAndInhabitant(
            d1Client,
            plan.assignment.cookingTeamId,
            plan.assignment.inhabitantId
        )
        if (existingAssignment) {
            await updateTeamAssignment(d1Client, existingAssignment.id!, { role: plan.assignment.role })
            console.info(`${PREFIX} Updated existing assignment ${existingAssignment.id} to ${plan.assignment.role} role`)
        } else {
            await createTeamAssignment(d1Client, plan.assignment)
            console.info(`${PREFIX} Created new ${plan.assignment.role} assignment for inhabitant ${plan.assignment.inhabitantId}`)
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
