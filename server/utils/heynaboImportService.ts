/**
 * Heynabo Import Service
 *
 * Core logic for Heynabo synchronization, called by both:
 * - Nitro scheduled task (context.cloudflare.env.DB)
 * - HTTP endpoint (event.context.cloudflare.env.DB)
 *
 * Uses reconciliation pattern (ADR-013) with batch operations (ADR-009).
 */
import type {D1Database} from '@cloudflare/workers-types'
import {importFromHeynabo} from '~~/server/integration/heynabo/heynaboClient'
import {useHeynaboValidation, type HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {reconcileHouseholds, reconcileInhabitants} from '~/composables/useHeynabo'
import {
    fetchHouseholds,
    createHouseholdsBatch,
    deleteHouseholdsByHeynaboId,
    createInhabitantsBatch,
    deleteInhabitantsByHeynaboId,
    deleteUsersByInhabitantHeynaboId,
    saveUser
} from '~~/server/data/prismaRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {chunkArray} from '~/utils/batchUtils'
import type {HouseholdCreate, HouseholdDisplay} from '~/composables/useCoreValidation'

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
        const householdReconciliation = reconcileHouseholds(existingAsCreate)(incomingHouseholds)
        console.info(`${LOG} Reconciliation: create=${householdReconciliation.create.length}, delete=${householdReconciliation.delete.length}, unchanged=${householdReconciliation.idempotent.length + householdReconciliation.update.length}`)

        // 5. Execute household deletes (batch operation)
        let householdsDeleted = 0
        if (householdReconciliation.delete.length > 0) {
            const heynaboIdsToDelete = householdReconciliation.delete.map(h => h.heynaboId)
            householdsDeleted = await deleteHouseholdsByHeynaboId(d1Client, heynaboIdsToDelete)
            console.info(`${LOG} Deleted ${householdsDeleted} households (moved out in Heynabo)`)
        }

        // 6. Execute household creates in chunks (ADR-009: max 8 per batch)
        let householdsCreated = 0
        const householdChunks = chunkHouseholds(householdReconciliation.create)
        for (const chunk of householdChunks) {
            const createdIds = await createHouseholdsBatch(d1Client, chunk)
            householdsCreated += createdIds.length
        }
        console.info(`${LOG} Created ${householdsCreated} new households`)

        // 7. Process inhabitants for each household (including existing ones that may have new inhabitants)
        let inhabitantsCreated = 0
        let inhabitantsDeleted = 0
        let usersCreated = 0
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

            // Create new inhabitants in chunks
            if (inhabitantReconciliation.create.length > 0) {
                const chunkInhabitants = chunkArray<typeof inhabitantReconciliation.create[0]>(CHUNK_SIZE)
                const inhabitantChunks = chunkInhabitants(inhabitantReconciliation.create)
                for (const chunk of inhabitantChunks) {
                    const createdIds = await createInhabitantsBatch(d1Client, chunk, existingHousehold.id)
                    inhabitantsCreated += createdIds.length

                    // Create users for inhabitants with email (after inhabitant creation)
                    for (const inhabitant of chunk) {
                        if (inhabitant.user) {
                            await saveUser(d1Client, inhabitant.user)
                            usersCreated++
                        }
                    }
                }
            }
        }

        console.info(`${LOG} Inhabitants: created=${inhabitantsCreated}, deleted=${inhabitantsDeleted}`)
        console.info(`${LOG} Users: created=${usersCreated}, deleted=${usersDeleted}`)

        const result: HeynaboImportResponse = {
            jobRunId: jobRun.id,
            householdsCreated,
            householdsDeleted,
            householdsUnchanged: householdReconciliation.idempotent.length + householdReconciliation.update.length,
            inhabitantsCreated,
            inhabitantsDeleted,
            usersCreated,
            usersDeleted
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
