import {defineEventHandler, setResponseStatus} from 'h3'
import {importFromHeynabo} from '~~/server/integration/heynabo/heynaboClient'
import {useHeynaboValidation, type HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {reconcileHouseholds, reconcileInhabitants} from '~/composables/useHeynabo'
import {
    fetchHouseholds,
    createHouseholdsBatch,
    deleteHouseholdsByHeynaboId,
    createInhabitantsBatch,
    deleteInhabitantsByHeynaboId,
    saveUser
} from '~~/server/data/prismaRepository'
import {chunkArray} from '~/utils/batchUtils'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import type {HouseholdCreate, HouseholdDisplay} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper
const {createHouseholdsFromImport} = useHeynaboValidation()

// D1 limit: 100 bound parameters per query, Household ~10 fields = max 8 per batch
const CHUNK_SIZE = 8
const chunkHouseholds = chunkArray<HouseholdCreate>(CHUNK_SIZE)

/**
 * GET /api/admin/heynabo/import
 *
 * Synchronizes households and inhabitants from Heynabo (source of truth).
 * Uses reconciliation pattern (ADR-013) with batch operations (ADR-009).
 *
 * Flow:
 * 1. Fetch data from Heynabo API
 * 2. Transform to domain models
 * 3. Reconcile with existing data (Heynabo is source of truth)
 * 4. Execute batch creates/deletes using chunking (max 8 per batch)
 * 5. Handle user creation for inhabitants with email
 */
export default defineEventHandler(async (event): Promise<HeynaboImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Business logic - ADR-002 compliant
    try {
        // 1. Fetch data from Heynabo API
        console.info("🏠 > IMPORT > Fetching data from Heynabo API")
        const {locations, members} = await importFromHeynabo()
        console.info(`🏠 > IMPORT > Fetched ${locations.length} locations and ${members.length} members`)

        // 2. Transform to domain models
        console.info("🏠 > IMPORT > Transforming to household domain models")
        const incomingHouseholds = createHouseholdsFromImport(locations, members)
        console.info(`🏠 > IMPORT > Transformed ${incomingHouseholds.length} households with ${incomingHouseholds.reduce((sum, h) => sum + (h.inhabitants?.length || 0), 0)} inhabitants`)

        // 3. Fetch existing data for reconciliation
        console.info("🏠 > IMPORT > Fetching existing households for reconciliation")
        const existingHouseholds = await fetchHouseholds(d1Client)

        // 4. Reconcile households (Heynabo is source of truth - ADR-013)
        const existingAsCreate = existingHouseholds.map(householdDisplayToCreate)
        const householdReconciliation = reconcileHouseholds(existingAsCreate)(incomingHouseholds)
        console.info(`🏠 > IMPORT > Reconciliation: create=${householdReconciliation.create.length}, delete=${householdReconciliation.delete.length}, unchanged=${householdReconciliation.idempotent.length + householdReconciliation.update.length}`)

        // 5. Execute household deletes (batch operation)
        let householdsDeleted = 0
        if (householdReconciliation.delete.length > 0) {
            const heynaboIdsToDelete = householdReconciliation.delete.map(h => h.heynaboId)
            householdsDeleted = await deleteHouseholdsByHeynaboId(d1Client, heynaboIdsToDelete)
            console.info(`🏠 > IMPORT > Deleted ${householdsDeleted} households (moved out in Heynabo)`)
        }

        // 6. Execute household creates in chunks (ADR-009: max 8 per batch)
        let householdsCreated = 0
        const householdChunks = chunkHouseholds(householdReconciliation.create)
        for (const chunk of householdChunks) {
            const createdIds = await createHouseholdsBatch(d1Client, chunk)
            householdsCreated += createdIds.length
        }
        console.info(`🏠 > IMPORT > Created ${householdsCreated} new households`)

        // 7. Process inhabitants for each household (including existing ones that may have new inhabitants)
        let inhabitantsCreated = 0
        let inhabitantsDeleted = 0
        let usersCreated = 0

        // Refetch households to get updated IDs for newly created ones
        const updatedHouseholds = await fetchHouseholds(d1Client)
        const householdByHeynaboId = new Map(updatedHouseholds.map(h => [h.heynaboId, h]))

        for (const incomingHousehold of incomingHouseholds) {
            const existingHousehold = householdByHeynaboId.get(incomingHousehold.heynaboId)
            if (!existingHousehold) {
                console.warn(`🏠 > IMPORT > Household with heynaboId ${incomingHousehold.heynaboId} not found after sync`)
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

            // Delete inhabitants not in Heynabo
            if (inhabitantReconciliation.delete.length > 0) {
                const heynaboIdsToDelete = inhabitantReconciliation.delete.map(i => i.heynaboId)
                const deleted = await deleteInhabitantsByHeynaboId(d1Client, heynaboIdsToDelete)
                inhabitantsDeleted += deleted
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

        console.info(`🏠 > IMPORT > Inhabitants: created=${inhabitantsCreated}, deleted=${inhabitantsDeleted}`)
        console.info(`🏠 > IMPORT > Users created: ${usersCreated}`)

        setResponseStatus(event, 200)
        return {
            householdsCreated,
            householdsDeleted,
            householdsUnchanged: householdReconciliation.idempotent.length + householdReconciliation.update.length,
            inhabitantsCreated,
            inhabitantsDeleted,
            usersCreated
        }
    } catch (error) {
        return throwH3Error("🏠 > IMPORT > Import operation failed", error)
    }
})

/**
 * Convert HouseholdDisplay to HouseholdCreate for reconciliation.
 * Maps existing DB format to the create format used by reconciliation.
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
