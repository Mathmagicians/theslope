import {defineEventHandler} from 'h3';
import {createHouseholdsFromImport, importFromHeyNabo} from "~~/server/integration/heynabo"
import {saveHousehold} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {Household} from "~/composables/useHouseholdValidation"
const {h3eFromCatch} = eventHandlerHelper


// Returns imported locations and members from HeyNabo
export default defineEventHandler<Household[]>(async (event) => {
    const { locations, members } = await importFromHeyNabo()
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const households = createHouseholdsFromImport(d1Client, locations, members)

    try {
        console.log("🏠> IMPORT > Saving households: ", households ? households.length: 0 )
        const result = await  Promise.all(  households.map(  household => saveHousehold(d1Client, household) ))
        return result
    } catch (error) {
        const h3e = h3eFromCatch("🏠 > IMPORT > Error saving households", error)
        console.error(`🏠 > IMPORT > ${h3e.statusMessage}`, error)
        throw h3e
    }
})
