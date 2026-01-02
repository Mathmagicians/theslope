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
import type {HouseholdCreate, HouseholdDisplay, UserCreate} from '~/composables/useCoreValidation'

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
                await Promise.all(chunk.map(h => saveHousehold(d1Client, h)))
            }
            console.info(`${LOG} Updated ${householdReconciliation.update.length} households`)
        }

        // Process inhabitants for each household
        let inhabitantsCreated = 0
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
                    await Promise.all(chunk.map(i => saveInhabitant(d1Client, i, existingHousehold.id)))
                }
            }
        }

        // Reconcile users: existing UserDisplay (from DB) vs incoming InhabitantData (from Heynabo)
        const existingUsers = (await fetchUsers(d1Client)).filter(u => u.Inhabitant !== null)
        const incomingWithUsers = incomingHouseholds.flatMap(h => h.inhabitants || []).filter(i => i.user)

        const userReconciliation = reconcileUsers(existingUsers)(incomingWithUsers)
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
        if (userReconciliation.create.length > 0) {
            const createdUsers = await createUsers(d1Client, userReconciliation.create.map(i => i.user!))
            usersCreated = createdUsers.length
            console.info(`${LOG} Created ${usersCreated} new users`)

            const userIdByEmail = new Map(createdUsers.map(u => [u.email, u.id]))
            const linkPairs = userReconciliation.create.map(i => ({
                userId: userIdByEmail.get(i.user!.email)!,
                inhabitantHeynaboId: i.heynaboId
            }))

            usersLinked = await linkUsersToInhabitants(d1Client, linkPairs)
            console.info(`${LOG} Linked ${usersLinked} users to inhabitants`)
        }

        // UPDATE existing users (saveUser merges roles - preserves ALLERGYMANAGER)
        if (userReconciliation.update.length > 0) {
            const usersToUpdate = userReconciliation.update.map(i => i.user!)
            const chunkUsers = chunkArray<UserCreate>(CHUNK_SIZE)
            for (const chunk of chunkUsers(usersToUpdate)) {
                await Promise.all(chunk.map(u => saveUser(d1Client, u)))
            }
            usersUpdated = userReconciliation.update.length
            console.info(`${LOG} Updated ${usersUpdated} users (ALLERGYMANAGER preserved)`)
        }

        console.info(`${LOG} Inhabitants: created=${inhabitantsCreated}, deleted=${inhabitantsDeleted}`)
        console.info(`${LOG} Users: created=${usersCreated}, deleted=${usersDeleted}, linked=${usersLinked}`)

        // 9. Run sanity check to verify no orphan users
        const allUsers = await fetchUsers(d1Client)
        const { sanityCheck } = useHeynaboValidation()
        const sanityCheckResult = sanityCheck(allUsers, incomingHouseholds)

        if (!sanityCheckResult.passed) {
            console.warn(`${LOG} Sanity check FAILED: ${sanityCheckResult.orphanUsers.length} orphan users found`)
        } else {
            console.info(`${LOG} Sanity check passed: no orphan users`)
        }

        const result: HeynaboImportResponse = {
            jobRunId: jobRun.id,
            householdsCreated: createdHouseholds.length,
            householdsDeleted,
            householdsUnchanged: householdReconciliation.idempotent.length,
            inhabitantsCreated,
            inhabitantsDeleted,
            usersCreated,
            usersDeleted,
            usersLinked,
            sanityCheck: sanityCheckResult
        }

        // Complete job run with success
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)

        console.info(`${LOG} Heynabo import complete (jobRunId=${jobRun.id})`)
        return result
    } catch (error) {
        // Complete job run with failure
        await completeJobRun(
            d1Client,
            jobRun.id,
            JobStatus.FAILED,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
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
