import {test, expect} from '@playwright/test'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext} = testHelpers
const {createDefaultWeekdayMap} = useWeekDayMapValidation()

// Deleting the season cascades to its teams and their joker slots
let testSeasonId: number

test.describe('Admin Joker Slot API', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const season = await SeasonFactory.createSeason(context)
        testSeasonId = season.id as number
    })

    test('GIVEN a team WHEN a joker slot is created THEN the API returns the slot and the team Detail carries it', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)
        const slot = SeasonFactory.defaultJokerSlot({note: 'Barsel'})

        const created = await SeasonFactory.createJokerSlot(context, team.id!, slot)

        expect(created).toMatchObject({...slot, cookingTeamId: team.id})
        const fetched = await SeasonFactory.getCookingTeamById(context, team.id!)
        expect(fetched!.jokerSlotCount).toBe(1)
        expect(fetched!.jokerSlots).toEqual([created])
    })

    test('GIVEN a team with a joker slot WHEN the slot is deleted THEN the API returns the deleted count and the team Detail has no slots', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)
        const created = await SeasonFactory.createJokerSlot(context, team.id!)

        const deleted = await SeasonFactory.deleteJokerSlot(context, team.id!, created!.id)

        expect(deleted).toBe(1)
        const fetched = await SeasonFactory.getCookingTeamById(context, team.id!)
        expect(fetched!.jokerSlotCount).toBe(0)
        expect(fetched!.jokerSlots).toEqual([])
    })

    const slot = SeasonFactory.defaultJokerSlot()
    const invalidSlots = [
        {name: 'an empty weekday map', invalid: {...slot, affinity: createDefaultWeekdayMap(false)}},
        {name: 'an end before the start', invalid: {...slot, endDate: new Date(slot.startDate.getTime() - 86_400_000)}},
        {name: 'an allocation of 0', invalid: {...slot, allocationPercentage: 0}},
        {name: 'an allocation above 100', invalid: {...slot, allocationPercentage: 101}}
    ]
    for (const {name, invalid} of invalidSlots) {
        test(`GIVEN ${name} WHEN the slot is created THEN the API answers 400 and the team keeps no slots`, async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)

            await SeasonFactory.createJokerSlot(context, team.id!, invalid, 400)

            const fetched = await SeasonFactory.getCookingTeamById(context, team.id!)
            expect(fetched!.jokerSlotCount).toBe(0)
        })
    }

    test('GIVEN a joker slot on another team WHEN it is deleted through this team THEN the API answers 404 and the slot stays', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const owner = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)
        const other = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)
        const created = await SeasonFactory.createJokerSlot(context, owner.id!)
        const slotId = created!.id

        await SeasonFactory.deleteJokerSlot(context, other.id!, slotId, 404)

        const fetched = await SeasonFactory.getCookingTeamById(context, owner.id!)
        expect(fetched!.jokerSlots.map(jokerSlot => jokerSlot.id)).toEqual([slotId])
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, [testSeasonId])
    })
})
