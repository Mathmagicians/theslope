// DELETE /api/admin/team/[id]/assignments/[assignmentId] - Remove team assignment

import {defineEventHandler,  getValidatedRouterParams} from "h3"
import * as z from 'zod'
import {deleteCookingTeamAssignments} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

// Define schema for parameters
const paramSchema = z.object({
    id: z.coerce.number().int().positive('assignment ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    let id: number

    // Fail early input validation - season id must validate, and season must exist, assignmentid must validate
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('👥 DELETE TEAM/[ID]/ASSIGNMENT/[ID] > Invalid assignment ID:', error)
        console.warn(h3e.message)
        throw h3e
    }

    try {
        console.info(`👥 DELETE TEAM/[ID]/ASSIGNMENT/[ID]  Removing assignment ${id}`)
        const deletedAssignment = await deleteCookingTeamAssignments(d1Client, [id])
        console.info(`👥👥 DELETE TEAM/[ID]/ASSIGNMENT/[ID]  Successfully removed assignment ${id} from team ${id}`)
        return deletedAssignment
    } catch (error) {
        const h3e = h3eFromCatch('👥 DELETE TEAM/[ID]/ASSIGNMENT/[ID]  Error:', error)
        console.error(h3e.message)
        throw h3e
    }
})
