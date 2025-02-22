import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'
import { STORE_STATES } from '~/types/form'
import { useSeason } from '~/composables/useSeason'
import { useDraftStorage } from '~/composables/useDraftStorage'

/**
 * Test proper serialization, deserialization and storage of draft data
 * We don't need to mock the storage as we want to test the full flow
 */
describe('useDraftStorage', () => {
    const testKey = 'test-draft'
    let storage: ReturnType<typeof createStorage>
    let draftStorage: ReturnType<typeof useDraftStorage>
    let season: ReturnType<typeof useSeason>

    beforeEach(() => {
        storage = createStorage({
            driver: localStorageDriver({ base: 'theslope:' })
        })
        draftStorage = useDraftStorage(testKey)
        season = useSeason()
    })

    afterEach(async () => {
        await storage.removeItem(testKey)
    })

    it('stores and retrieves draft data with state', async () => {
        const defaultSeason = season.getDefaultSeason()
        const draftData = {
            state: STORE_STATES.CREATE,
            season: defaultSeason
        }

        await draftStorage.saveDraft(draftData)
        const retrieved = await draftStorage.loadDraft()

        expect(retrieved).toEqual(draftData)
    })

    it('correctly serializes and deserializes draft data', async () => {
        const defaultSeason = season.getDefaultSeason()
        const originalData = {
            state: STORE_STATES.CREATE,
            season: defaultSeason
        }

        const serialized = draftStorage.serializeDraftData(originalData)
        const deserialized = draftStorage.deserializeDraftData(serialized)

        expect(deserialized).toEqual(originalData)
    })
})
