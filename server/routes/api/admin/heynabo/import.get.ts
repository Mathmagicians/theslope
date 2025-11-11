import {defineEventHandler} from 'h3'
import {importFromHeynabo} from '~~/server/integration/heynabo/heynaboClient'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import {saveHousehold} from '~~/server/data/prismaRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import type {Household} from '~/composables/useHouseholdValidation'

const {h3eFromCatch} = eventHandlerHelper
const {createHouseholdsFromImport} = useHeynaboValidation()

// Returns imported locations and members from HeyNabo
export default defineEventHandler<Household[]>(async (event) => {
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
        const households = createHouseholdsFromImport(locations, members)
        console.info(`🏠 > IMPORT > Created ${households.length} households with ${households.reduce((sum, h) => sum + (h.inhabitants?.length || 0), 0)} inhabitants`)

        // 3. Save to database
        console.info(`🏠 > IMPORT > Saving ${households.length} households to database`)
        const result = await Promise.all(households.map(household => saveHousehold(d1Client, household)))
        console.info(`🏠 > IMPORT > Successfully saved ${result.length} households`)

        setResponseStatus(event, 200)
        return result
    } catch (error) {
        const h3e = h3eFromCatch("🏠 > IMPORT > Import operation failed", error)
        console.error(`🏠 > IMPORT > ${h3e.statusMessage}`, error)
        throw h3e
    }
})
