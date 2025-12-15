import {test, expect} from '@playwright/test'
import {SeasonImportFactory} from '../../testDataFactories/seasonImportFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

test.describe('Season Import API', () => {

    test('GIVEN valid CSV files WHEN importing THEN creates season with teams', async ({browser}) => {
        // Skip if CSV files don't exist (gitignored, local-only test)
        test.skip(!SeasonImportFactory.hasTestFiles(), '.theslope/team-import files missing (gitignored, local-only test)')

        const context = await validatedBrowserContext(browser)

        const calendarCsv = SeasonImportFactory.readCalendarCSV()
        const teamsCsv = SeasonImportFactory.readTeamsCSV()

        const response = await SeasonImportFactory.importSeason(context, calendarCsv, teamsCsv)

        expect(response.ok(), `Import failed: ${await response.text()}`).toBe(true)

        const body = await response.json()
        expect(body.seasonId).toBeDefined()
        expect(body.teamsCreated).toBeGreaterThan(0)
        expect(body.dinnerEventsCreated).toBeGreaterThanOrEqual(0) // May be 0 if season already had events

        // Verify season exists
        const season = await SeasonFactory.getSeason(context, body.seasonId)
        expect(season.id).toBe(body.seasonId)
    })
})
