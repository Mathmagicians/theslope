import { defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus } from 'h3'
import { fetchDinnerEvent, updateDinnerEvent } from '~~/server/data/financesRepository'
import { createTeamAssignment } from '~~/server/data/prismaRepository'
import { getPrismaClientConnection } from '~~/server/utils/database'
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
 * Assign role to dinner event
 *
 * POST /api/admin/dinner-event/[id]/assign-role
 *
 * ASCII Mockup - Three volunteer buttons:
 * ┌────────────────────────────────────────────────────┐
 * │ 🍽️ HOLD ROLLER                                    │
 * │                                                    │
 * │ ┌──────────────────────────────────────────────┐  │
 * │ │ ℹ️ Vælg din rolle for denne fællesspisning   │  │
 * │ └──────────────────────────────────────────────┘  │
 * │                                                    │
 * │ [👨‍🍳 BLIV CHEFKOK]  ← role: CHEF                 │
 * │ [👥 BLIV KOK]       ← role: COOK                  │
 * │ [🌱 BLIV KOKKESPIRE] ← role: JUNIORHELPER        │
 * │                                                    │
 * └────────────────────────────────────────────────────┘
 *
 * Business Logic:
 * 1. Validate dinner event exists and has cookingTeamId
 * 2. IF role === CHEF: Update dinnerEvent.chefId = inhabitantId
 * 3. Check if CookingTeamAssignment exists for this inhabitant + team
 * 4. If exists: Update role to specified role
 * 5. If not exists: Create new assignment with specified role
 *
 * ADR Compliance:
 * - ADR-001: Schema from validation composable
 * - ADR-002: Separate validation + business logic try-catch
 * - ADR-004: Logging with console.info/error
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const { cloudflare } = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let assignData!: { inhabitantId: number, role: TeamRole }
    try {
        ({ id } = await getValidatedRouterParams(event, idSchema.parse))
        assignData = await readValidatedBody(event, AssignRoleSchema.parse)
    } catch (error) {
        return throwH3Error('👥 > ASSIGN_ROLE > [POST] Input validation error', error)
    }

    // Business logic try-catch
    try {
        const roleEmoji = assignData.role === 'CHEF' ? '👨‍🍳' : assignData.role === 'COOK' ? '👥' : '🌱'
        console.info(`${roleEmoji} > ASSIGN_ROLE > [POST] Assigning ${assignData.role} role to inhabitant ${assignData.inhabitantId} for dinner event ${id}`)

        // Step 1: Fetch dinner event to verify it exists and get cookingTeamId
        const dinnerEvent = await fetchDinnerEvent(d1Client, id)
        if (!dinnerEvent) {
            throwH3Error(`👥 > ASSIGN_ROLE > [POST] Dinner event ${id} not found`, 'Dinner event not found', 404)
        }

        if (!dinnerEvent.cookingTeamId) {
            throwH3Error(`👥 > ASSIGN_ROLE > [POST] Dinner event ${id} has no cooking team assigned`, 'No cooking team assigned', 400)
        }

        // Step 2: IF role is CHEF, update dinnerEvent.chefId (only CHEF gets special treatment)
        let updatedDinner = dinnerEvent
        if (assignData.role === TeamRoleSchema.enum.CHEF) {
            updatedDinner = await updateDinnerEvent(d1Client, id, {
                chefId: assignData.inhabitantId
            })
            console.info(`👨‍🍳 > ASSIGN_ROLE > [POST] Updated dinnerEvent.chefId to ${assignData.inhabitantId}`)
        }

        // Step 3 & 4: Check if CookingTeamAssignment exists and create/update
        const prisma = await getPrismaClientConnection(d1Client)

        // Find existing assignment
        const existingAssignment = await prisma.cookingTeamAssignment.findFirst({
            where: {
                cookingTeamId: dinnerEvent.cookingTeamId,
                inhabitantId: assignData.inhabitantId
            }
        })

        if (existingAssignment) {
            // Update role to specified role
            await prisma.cookingTeamAssignment.update({
                where: { id: existingAssignment.id },
                data: { role: assignData.role }
            })
            console.info(`${roleEmoji} > ASSIGN_ROLE > [POST] Updated existing assignment ${existingAssignment.id} to ${assignData.role} role`)
        } else {
            // Create new assignment with specified role
            // ADR-010: createdAt/updatedAt auto-generated by Prisma
            await createTeamAssignment(d1Client, {
                cookingTeamId: dinnerEvent.cookingTeamId,
                inhabitantId: assignData.inhabitantId,
                role: assignData.role,
                allocationPercentage: 100,
                affinity: null
            })
            console.info(`${roleEmoji} > ASSIGN_ROLE > [POST] Created new ${assignData.role} assignment for inhabitant ${assignData.inhabitantId}`)
        }

        console.info(`${roleEmoji} > ASSIGN_ROLE > [POST] Successfully assigned ${assignData.role} role to inhabitant ${assignData.inhabitantId} for dinner event ${id}`)
        setResponseStatus(event, 200)

        // Re-fetch to get updated relations
        const finalDinner = await fetchDinnerEvent(d1Client, id)
        return finalDinner!
    } catch (error) {
        return throwH3Error(`👥 > ASSIGN_ROLE > [POST] Error assigning role to dinner event ${id}`, error)
    }
})
