import {defineEventHandler, getRouterParams} from "h3"
import {fetchUsersByRole} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {SystemRole} from "~/composables/useUserValidation"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const params = getRouterParams(event)
    const role = params.role as SystemRole

    console.info(`👨‍💻 > USER > [GET] Fetching users with role ${role}`)

    try {
        const users = await fetchUsersByRole(d1Client, role)
        console.info(`👨‍💻 > USER > [GET] Found ${users.length} users with role ${role}`)
        return users
    } catch (error) {
        const h3e = h3eFromCatch(`👨‍💻 > USER > [GET] Error fetching users by role ${role}`, error)
        console.error(`👨‍💻 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
