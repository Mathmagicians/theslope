import {test, expect} from '@playwright/test'
import {SeasonImportFactory} from '~~/tests/e2e/testDataFactories/seasonImportFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useWeekDayMapValidation} from '~~/app/composables/useWeekDayMapValidation'
import testHelpers from '~~/tests/e2e/testHelpers'
import {format, addDays, getISODay} from 'date-fns'

const {createDefaultWeekdayMap} = useWeekDayMapValidation()

const {validatedBrowserContext, assertNoOrdersWithOrphanPrices} = testHelpers
const MINIMAL_TEAMS_CSV = 'Hold,Rolle,Navn\n1,CHEF,Nobody'
const WEEKDAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag']

/** Build Mon-Fri calendar CSV. holidayIsoDay (3=Wed) marks that day as holiday. */
const buildCalendarCsv = (monday: Date, holidayIsoDay?: number): string => {
    const rows = Array.from({length: 5}, (_, i) => {
        const d = addDays(monday, i)
        const team = holidayIsoDay === getISODay(d) ? 'Ferie' : '1'
        return `${format(d, 'dd-MM-yyyy')},${WEEKDAY_NAMES[i]},${team}`
    })
    return ['Dato,Ugedag,Hold', ...rows].join('\n')
}

const createdSeasonIds: number[] = []

test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
})

test('Re-importing season with holidays should remove dinner events on holiday dates', async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const monday = addDays(SeasonFactory.nextWeekday(1), 7)
    const friday = addDays(monday, 4)

    // GIVEN: Create season with shortName matching import's computed name (MM/yy-MM/yy)
    const season = await SeasonFactory.createSeason(context, {
        ...SeasonFactory.defaultSeason(),
        shortName: `${format(monday, 'MM/yy')}-${format(friday, 'MM/yy')}`,
        seasonDates: {start: monday, end: friday},
        cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]),
        holidays: []
    })
    createdSeasonIds.push(season.id!)
    expect(season.dinnerEvents!.length).toBe(5)

    // WHEN: Import CSV with Wednesday as holiday (finds existing season by shortName)
    const resp = await SeasonImportFactory.importSeason(context, buildCalendarCsv(monday, 3), MINIMAL_TEAMS_CSV)
    expect(resp.status()).toBe(200)

    // THEN: Wednesday event should be removed, 4 events remain
    const eventsAfter = await DinnerEventFactory.getDinnerEventsForSeason(context, season.id!)
    expect(eventsAfter.filter(de => getISODay(new Date(de.date)) === 3)).toHaveLength(0)
    expect(eventsAfter.length).toBe(4)
})

test.describe('Season Import API', () => {

    test('GIVEN valid CSV files WHEN importing THEN creates season with teams AND second import is idempotent (ADR-015)', async ({browser}) => {
        // Skip if CSV files don't exist (gitignored, local-only test)
        test.skip(!SeasonImportFactory.hasTestFiles(), '.theslope/team-import files missing (gitignored, local-only test)')

        const context = await validatedBrowserContext(browser)

        const calendarCsv = SeasonImportFactory.readCalendarCSV()
        const teamsCsv = SeasonImportFactory.readTeamsCSV()

        // First import
        const firstResponse = await SeasonImportFactory.importSeason(context, calendarCsv, teamsCsv)
        expect(firstResponse.ok(), `First import failed: ${await firstResponse.text()}`).toBe(true)

        const firstBody = await firstResponse.json()
        expect(firstBody.seasonId).toBeDefined()
        expect(firstBody.isNew, `Expected first import to update existing season, got isNew=${firstBody.isNew}`).toBe(false)
        expect(firstBody.teamsCreated).toBeGreaterThanOrEqual(0) // May be 0 if teams already exist

        // Verify season exists with teams that have affinities set
        const season = await SeasonFactory.getSeason(context, firstBody.seasonId)
        expect(season.id).toBe(firstBody.seasonId)
        expect(season.CookingTeams, 'Season should have cooking teams').toBeDefined()
        expect(season.CookingTeams!.length, 'Season should have at least one team').toBeGreaterThan(0)

        // Verify each team has affinity derived from calendar (not null)
        for (const team of season.CookingTeams!) {
            expect(team.affinity, `Team ${team.name} should have affinity set`).not.toBeNull()
            // Affinity should have at least one cooking day set to true
            const hasCookingDay = Object.values(team.affinity!).some(v => v === true)
            expect(hasCookingDay, `Team ${team.name} affinity should have at least one cooking day`).toBe(true)
        }

        // Second import - should be idempotent (ADR-015)
        const secondResponse = await SeasonImportFactory.importSeason(context, calendarCsv, teamsCsv)
        expect(secondResponse.ok(), `Second import failed: ${await secondResponse.text()}`).toBe(true)

        const secondBody = await secondResponse.json()
        expect(secondBody.seasonId).toBe(firstBody.seasonId)
        expect(secondBody.isNew).toBe(false)
        expect(secondBody.teamsCreated).toBe(0)
        expect(secondBody.teamAssignmentsCreated).toBe(0)
        expect(secondBody.dinnerEventsCreated).toBe(0)

        // Verify no orphan orders (all orders have valid ticketPriceId)
        if (season.dinnerEvents && season.dinnerEvents.length > 0) {
            const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(
                context,
                season.dinnerEvents.map(e => e.id)
            )
            assertNoOrdersWithOrphanPrices(orders, 'after import')
        }
    })
})
