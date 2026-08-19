import {describe, it, expect, vi, beforeEach} from 'vitest'
import type {D1Database} from '@cloudflare/workers-types'
import {fetchDinnerEvents, updateDinnerEvent, updateDinnerEventAllergens} from '~~/server/data/financesRepository'
import {deleteHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {removeChefRole, removeChefRoleForInhabitants} from '~~/server/utils/removeChefRole'
import {CHEF_LOSS_DINNER_UPDATES} from '~/composables/useBooking'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'

// Hoist module mocks before importing the SUT
vi.mock('~~/server/data/financesRepository', () => ({
    fetchDinnerEvents: vi.fn(),
    updateDinnerEvent: vi.fn(),
    updateDinnerEventAllergens: vi.fn()
}))
vi.mock('~~/server/integration/heynabo/heynaboClient', () => ({
    deleteHeynaboEventAsSystem: vi.fn()
}))

const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const d1Client = {} as D1Database
const mockedHnDelete = vi.mocked(deleteHeynaboEventAsSystem)
const mockedUpdate = vi.mocked(updateDinnerEvent)
const mockedClearAllergens = vi.mocked(updateDinnerEventAllergens)
const mockedFetch = vi.mocked(fetchDinnerEvents)

describe('removeChefRole', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it.each([
        {scenario: 'dinner without a Heynabo event → dinner reset, Heynabo untouched', heynaboEventId: null, hnFails: false, expectedDegraded: false},
        {scenario: 'Heynabo event deleted → clean reset', heynaboEventId: 555, hnFails: false, expectedDegraded: false},
        {scenario: 'Heynabo deletion fails → dinner is still reset, sync flagged degraded', heynaboEventId: 555, hnFails: true, expectedDegraded: true}
    ])('$scenario', async ({heynaboEventId, hnFails, expectedDegraded}) => {
        const dinner = {...DinnerEventFactory.defaultDinnerEventDetail(), id: 100, heynaboEventId}
        const resetDinner = {...dinner, ...CHEF_LOSS_DINNER_UPDATES}
        if (hnFails) mockedHnDelete.mockRejectedValueOnce(new Error('HN down'))
        mockedClearAllergens.mockResolvedValueOnce(resetDinner)

        const result = await removeChefRole(d1Client, dinner)

        expect(mockedHnDelete, 'Heynabo called only when the dinner has an event').toHaveBeenCalledTimes(heynaboEventId ? 1 : 0)
        expect(mockedUpdate, 'Dinner reverted with CHEF_LOSS_DINNER_UPDATES').toHaveBeenCalledWith(d1Client, dinner.id, CHEF_LOSS_DINNER_UPDATES)
        expect(mockedClearAllergens, 'Allergens cleared').toHaveBeenCalledWith(d1Client, dinner.id, [])
        expect(result.heynaboSyncDegraded).toBe(expectedDegraded)
        expect(result.dinner).toEqual(resetDinner)
    })
})

describe('removeChefRoleForInhabitants', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('GIVEN no inhabitants THEN nothing is fetched or reset', async () => {
        expect(await removeChefRoleForInhabitants(d1Client, [])).toBe(0)
        expect(mockedFetch).not.toHaveBeenCalled()
        expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('GIVEN inhabitants cheffing upcoming dinners THEN each not-yet-consumed dinner is reset', async () => {
        const dinners = [
            {...DinnerEventFactory.dinnerEventAt(1, 2), heynaboEventId: null},
            {...DinnerEventFactory.dinnerEventAt(2, 5), heynaboEventId: null}
        ]
        mockedFetch.mockResolvedValueOnce(dinners)
        mockedClearAllergens.mockResolvedValue(DinnerEventFactory.defaultDinnerEventDetail())

        expect(await removeChefRoleForInhabitants(d1Client, [42, 43])).toBe(2)
        expect(mockedFetch, 'Consumed and cancelled dinners are left alone').toHaveBeenCalledWith(d1Client, {
            chefIds: [42, 43],
            excludeStates: [DinnerState.CONSUMED, DinnerState.CANCELLED]
        })
        expect(mockedUpdate).toHaveBeenCalledTimes(2)
        expect(mockedClearAllergens).toHaveBeenCalledTimes(2)
    })
})
