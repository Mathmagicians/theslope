/**
 * Heynabo Import Service
 *
 * Flatten-then-execute pattern for 3-layer reconciliation:
 * - Household → Inhabitant → User (each with create/update/delete)
 *
 * Phases:
 * 1. Flatten: Reconcile all layers, collect operations
 * 2. Deletes (bottom-up): users → inhabitants → households
 * 3. Creates (top-down): households → inhabitants → users → link
 * 4. Updates (chunked): households, inhabitants, users in parallel
 *
 * Data ownership:
 * - Heynabo: source of truth for name, address, inhabitants, users
 * - TheSlope: enriches with pbsId, movedInDate, ALLERGYMANAGER role
 *
 * ADR-014: TRUE batch for creates and deletes, chunked Promise.all for updates
 */
import type {D1Database} from '@cloudflare/workers-types'
import {importFromHeynabo} from '~~/server/integration/heynabo/heynaboClient'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {useHeynaboValidation, type HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {reconcileHouseholds, reconcileInhabitants, reconcileUsers, mergeHouseholdForUpdate} from '~/composables/useHeynabo'
import {
    fetchHouseholds,
    fetchUsers,
    createHouseholds,
    deleteHouseholdsByHeynaboId,
    createInhabitants,
    deleteInhabitantsByHeynaboId,
    deleteUsersByInhabitantHeynaboId,
    saveHousehold,
    saveInhabitant,
    saveUser,
    createUsers,
    linkUsersToInhabitants
} from '~~/server/data/prismaRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {chunkArray} from '~/utils/batchUtils'
import type {HouseholdCreate, HouseholdDisplay, UserCreate, SystemRole} from '~/composables/useCoreValidation'
import {reconcileUserRoles, RoleOwner} from '~/composables/useUserRoles'

const LOG = '🏠 > IMPORT > [HEYNABO]'
const {createHouseholdsFromImport} = useHeynaboValidation()

// D1 limit: 100 bound parameters per query, Household ~10 fields = max 8 per batch
const CHUNK_SIZE = 8
const chunkHouseholds = chunkArray<HouseholdCreate>(CHUNK_SIZE)

export async function runHeynaboImport(d1Client: D1Database, triggeredBy: string): Promise<HeynaboImportResponse> {
    const {JobType, JobStatus} = useMaintenanceValidation()

    console.info(`${LOG} Starting Heynabo import (triggeredBy=${triggeredBy})`)

    // Create job run record
    const jobRun = await createJobRun(d1Client, {
        jobType: JobType.HEYNABO_IMPORT,
        triggeredBy
    })

    try {
        // 1. Fetch data from Heynabo API
        console.info(`${LOG} Fetching data from Heynabo API`)
        const {locations, members} = await importFromHeynabo()
        console.info(`${LOG} Fetched ${locations.length} locations and ${members.length} members`)

        // 2. Transform to domain models
        console.info(`${LOG} Transforming to household domain models`)
        const incomingHouseholds = createHouseholdsFromImport(locations, members)
        console.info(`${LOG} Transformed ${incomingHouseholds.length} households with ${incomingHouseholds.reduce((sum, h) => sum + (h.inhabitants?.length || 0), 0)} inhabitants`)

        // 3. Fetch existing data for reconciliation
        console.info(`${LOG} Fetching existing households for reconciliation`)
        const existingHouseholds = await fetchHouseholds(d1Client)

        // 4. Reconcile households (Heynabo is source of truth - ADR-013)
        const existingAsCreate = existingHouseholds.map(householdDisplayToCreate)
        const existingByHeynaboId = new Map(existingHouseholds.map(h => [h.heynaboId, h]))
        const householdReconciliation = reconcileHouseholds(existingAsCreate)(incomingHouseholds)
        console.info(`${LOG} Reconciliation: create=${householdReconciliation.create.length}, delete=${householdReconciliation.delete.length}, unchanged=${householdReconciliation.idempotent.length + householdReconciliation.update.length}`)

        // 5. Execute household deletes (batch operation)
        let householdsDeleted = 0
        if (householdReconciliation.delete.length > 0) {
            const heynaboIdsToDelete = householdReconciliation.delete.map(h => h.heynaboId)
            householdsDeleted = await deleteHouseholdsByHeynaboId(d1Client, heynaboIdsToDelete)
            console.info(`${LOG} Deleted ${householdsDeleted} households (moved out in Heynabo)`)
        }

        // Execute household creates (Prisma auto-chunks per ADR-014)
        const createdHouseholds = await createHouseholds(d1Client, householdReconciliation.create)
        console.info(`${LOG} Created ${createdHouseholds.length} new households`)

        // Execute household updates in chunks - preserve TheSlope-owned fields
        if (householdReconciliation.update.length > 0) {
            const mergedHouseholds = householdReconciliation.update.map(incoming =>
                mergeHouseholdForUpdate(incoming, existingByHeynaboId.get(incoming.heynaboId)!)
            )
            const updateChunks = chunkHouseholds(mergedHouseholds)
            for (const chunk of updateChunks) {
                // Strip inhabitants to avoid cascade, skipRefetch for batch (ADR-014)
                await Promise.all(chunk.map(h => saveHousehold(d1Client, { ...h, inhabitants: undefined }, true)))
            }
            console.info(`${LOG} Updated ${householdReconciliation.update.length} households`)
        }

        // Process inhabitants for each household
        let inhabitantsCreated = 0
        let inhabitantsUpdated = 0
        let inhabitantsIdempotent = 0
        let inhabitantsDeleted = 0
        let usersDeleted = 0

        // Refetch households to get updated IDs for newly created ones
        const updatedHouseholds = await fetchHouseholds(d1Client)
        const householdByHeynaboId = new Map(updatedHouseholds.map(h => [h.heynaboId, h]))

        for (const incomingHousehold of incomingHouseholds) {
            const existingHousehold = householdByHeynaboId.get(incomingHousehold.heynaboId)
            if (!existingHousehold) {
                console.warn(`${LOG} Household with heynaboId ${incomingHousehold.heynaboId} not found after sync`)
                continue
            }

            // Reconcile inhabitants for this household
            const existingInhabitants = existingHousehold.inhabitants.map(i => ({
                heynaboId: i.heynaboId,
                name: i.name,
                lastName: i.lastName,
                pictureUrl: i.pictureUrl,
                birthDate: i.birthDate
            }))
            const incomingInhabitants = incomingHousehold.inhabitants || []

            const inhabitantReconciliation = reconcileInhabitants(existingInhabitants)(incomingInhabitants)

            // Delete inhabitants not in Heynabo (delete their users first)
            if (inhabitantReconciliation.delete.length > 0) {
                const heynaboIdsToDelete = inhabitantReconciliation.delete.map(i => i.heynaboId)
                usersDeleted += await deleteUsersByInhabitantHeynaboId(d1Client, heynaboIdsToDelete)
                inhabitantsDeleted += await deleteInhabitantsByHeynaboId(d1Client, heynaboIdsToDelete)
            }

            // Create new inhabitants (Prisma auto-chunks)
            if (inhabitantReconciliation.create.length > 0) {
                const createdIds = await createInhabitants(d1Client, inhabitantReconciliation.create, existingHousehold.id)
                inhabitantsCreated += createdIds.length
            }

            // Update existing inhabitants in chunks
            if (inhabitantReconciliation.update.length > 0) {
                const chunkInhabitants = chunkArray<typeof inhabitantReconciliation.update[0]>(CHUNK_SIZE)
                const inhabitantChunks = chunkInhabitants(inhabitantReconciliation.update)
                for (const chunk of inhabitantChunks) {
                    // Strip user to avoid cascade, skipRefetch for batch (ADR-014)
                    await Promise.all(chunk.map(i => saveInhabitant(d1Client, { ...i, user: undefined }, existingHousehold.id, true)))
                }
                inhabitantsUpdated += inhabitantReconciliation.update.length
            }

            // Track idempotent inhabitants
            inhabitantsIdempotent += inhabitantReconciliation.idempotent.length
        }

        // Reconcile users: existing UserDisplay (from DB) vs incoming InhabitantData (from Heynabo)
        const allUsers = await fetchUsers(d1Client)
        const linkedUsers = allUsers.filter(u => u.Inhabitant !== null)
        const allEmails = new Set(allUsers.map(u => u.email))
        const incomingWithUsers = incomingHouseholds.flatMap(h => h.inhabitants || []).filter(i => i.user)

        const userReconciliation = reconcileUsers(linkedUsers)(incomingWithUsers)
        console.info(`${LOG} User reconciliation: create=${userReconciliation.create.length}, update=${userReconciliation.update.length}, delete=${userReconciliation.delete.length}, idempotent=${userReconciliation.idempotent.length}`)

        let usersCreated = 0
        let usersUpdated = 0
        let usersLinked = 0

        // DELETE users whose inhabitants no longer have user role in Heynabo
        if (userReconciliation.delete.length > 0) {
            const heynaboIdsToDelete = userReconciliation.delete.map(u => u.Inhabitant!.heynaboId)
            usersDeleted += await deleteUsersByInhabitantHeynaboId(d1Client, heynaboIdsToDelete)
            console.info(`${LOG} Deleted ${usersDeleted} orphan users (limited role in Heynabo)`)
        }

        // CREATE new users and link to inhabitants
        // Split: truly new (batch create) vs unlinked existing (just re-link)
        const trulyNewUsers = userReconciliation.create.filter(i => !allEmails.has(i.user!.email))
        const unlinkedExisting = userReconciliation.create.filter(i => allEmails.has(i.user!.email))
        console.info(`${LOG} Create split: ${trulyNewUsers.length} new, ${unlinkedExisting.length} unlinked existing`)

        if (trulyNewUsers.length > 0) {
            const createdUsers = await createUsers(d1Client, trulyNewUsers.map(i => i.user!))
            usersCreated = createdUsers.length
            console.info(`${LOG} Created ${usersCreated} new users`)
        }

        // Link ALL "create" users (new + unlinked) to their inhabitants
        if (userReconciliation.create.length > 0) {
            const userIdByEmail = new Map(allUsers.map(u => [u.email, u.id]))
            // For newly created, we need to refetch to get their IDs
            if (trulyNewUsers.length > 0) {
                const refreshedUsers = await fetchUsers(d1Client)
                refreshedUsers.forEach(u => userIdByEmail.set(u.email, u.id))
            }
            const linkPairs = userReconciliation.create.map(i => ({
                userId: userIdByEmail.get(i.user!.email)!,
                inhabitantHeynaboId: i.heynaboId
            }))

            usersLinked = await linkUsersToInhabitants(d1Client, linkPairs)
            console.info(`${LOG} Linked ${usersLinked} users to inhabitants`)
        }

        // UPDATE existing users - reconcile roles (HN owns ADMIN, preserves ALLERGYMANAGER)
        let adminsAdded = 0
        let adminsRemoved = 0
        if (userReconciliation.update.length > 0) {
            // Build map of email -> existing roles
            const existingRolesByEmail = new Map(linkedUsers.map(u => [u.email, u.systemRoles as SystemRole[]]))

            // Reconcile roles for each user
            const usersToUpdate = userReconciliation.update.map(i => {
                const incoming = i.user!
                const existingRoles = existingRolesByEmail.get(incoming.email) ?? []
                const result = reconcileUserRoles(existingRoles, incoming.systemRoles, RoleOwner.HN)
                if (result.adminAdded) adminsAdded++
                if (result.adminRemoved) adminsRemoved++
                return { ...incoming, systemRoles: result.roles }
            })

            const chunkUsers = chunkArray<UserCreate>(CHUNK_SIZE)
            for (const chunk of chunkUsers(usersToUpdate)) {
                await Promise.all(chunk.map(u => saveUser(d1Client, u)))
            }
            usersUpdated = userReconciliation.update.length
            console.info(`${LOG} Updated ${usersUpdated} users (admins: +${adminsAdded}/-${adminsRemoved}, ALLERGYMANAGER preserved)`)
        }

        console.info(`${LOG} Inhabitants: created=${inhabitantsCreated}, updated=${inhabitantsUpdated}, idempotent=${inhabitantsIdempotent}, deleted=${inhabitantsDeleted}`)
        console.info(`${LOG} Users: created=${usersCreated}, updated=${usersUpdated}, deleted=${usersDeleted}, linked=${usersLinked}`)

        // 9. Run sanity check - compare DB counts vs Heynabo counts
        const householdsForSanityCheck = await fetchHouseholds(d1Client)
        const usersForSanityCheck = await fetchUsers(d1Client)
        const linkedUsersCount = usersForSanityCheck.filter(u => u.Inhabitant !== null).length

        const dbCounts = {
            households: householdsForSanityCheck.length,
            inhabitants: householdsForSanityCheck.reduce((sum, h) => sum + h.inhabitants.length, 0),
            users: linkedUsersCount
        }

        const { sanityCheck } = useHeynaboValidation()
        const sanityCheckResult = sanityCheck(dbCounts, usersForSanityCheck, incomingHouseholds)

        if (!sanityCheckResult.passed) {
            const mismatches = []
            if (sanityCheckResult.householdsMismatch) mismatches.push(`households: DB=${sanityCheckResult.householdsInDb} HN=${sanityCheckResult.householdsInHeynabo}`)
            if (sanityCheckResult.inhabitantsMismatch) mismatches.push(`inhabitants: DB=${sanityCheckResult.inhabitantsInDb} HN=${sanityCheckResult.inhabitantsInHeynabo}`)
            if (sanityCheckResult.usersMismatch) mismatches.push(`users: DB=${sanityCheckResult.usersInDb} HN=${sanityCheckResult.usersInHeynabo}`)
            if (sanityCheckResult.orphanUsers.length > 0) mismatches.push(`orphans: ${sanityCheckResult.orphanUsers.length}`)
            console.warn(`${LOG} Sanity check FAILED: ${mismatches.join(', ')}`)
        } else {
            console.info(`${LOG} Sanity check passed: DB matches Heynabo (${dbCounts.households} households, ${dbCounts.inhabitants} inhabitants, ${dbCounts.users} users)`)
        }

        const result: HeynaboImportResponse = {
            jobRunId: jobRun.id,
            // Households: all 4 outcomes
            householdsCreated: createdHouseholds.length,
            householdsUpdated: householdReconciliation.update.length,
            householdsIdempotent: householdReconciliation.idempotent.length,
            householdsDeleted,
            // Inhabitants: all 4 outcomes
            inhabitantsCreated,
            inhabitantsUpdated,
            inhabitantsIdempotent,
            inhabitantsDeleted,
            // Users: all 4 outcomes + linked + admin tracking
            usersCreated,
            usersUpdated,
            usersIdempotent: userReconciliation.idempotent.length,
            usersDeleted,
            usersLinked,
            adminsAdded,
            adminsRemoved,
            sanityCheck: sanityCheckResult
        }

        // Complete job run with success
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)

        console.info(`${LOG} Heynabo import complete (jobRunId=${jobRun.id})`)
        return result
    } catch (error) {
        // Try to record failure, fallback to logging if DB is exhausted
        const h3e = eventHandlerHelper.h3eFromCatch(`${LOG} Import failed`, error)
        await completeJobRun(d1Client, jobRun.id, JobStatus.FAILED, undefined, h3e.message)
            .catch(() => console.error(`${LOG} Could not record failure for job ${jobRun.id}: ${h3e.message}`))
        eventHandlerHelper.logH3Error(h3e, error)
        throw h3e
    }
}

/**
 * Convert HouseholdDisplay to HouseholdCreate for reconciliation.
 */
function householdDisplayToCreate(household: HouseholdDisplay): HouseholdCreate {
    return {
        heynaboId: household.heynaboId,
        pbsId: household.pbsId,
        movedInDate: household.movedInDate,
        moveOutDate: household.moveOutDate,
        name: household.name,
        address: household.address,
        inhabitants: household.inhabitants.map(i => ({
            heynaboId: i.heynaboId,
            name: i.name,
            lastName: i.lastName,
            pictureUrl: i.pictureUrl,
            birthDate: i.birthDate
        }))
    }
}
