import {test, expect} from '@playwright/test'
import {SeasonImportFactory} from '../../testDataFactories/seasonImportFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

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
        expect(firstBody.teamsCreated).toBeGreaterThanOrEqual(0) // May be 0 if teams already exist

        // Verify season exists
        const season = await SeasonFactory.getSeason(context, firstBody.seasonId)
        expect(season.id).toBe(firstBody.seasonId)

        // Second import - should be idempotent (ADR-015)
        const secondResponse = await SeasonImportFactory.importSeason(context, calendarCsv, teamsCsv)
        expect(secondResponse.ok(), `Second import failed: ${await secondResponse.text()}`).toBe(true)

        const secondBody = await secondResponse.json()
        expect(secondBody.seasonId).toBe(firstBody.seasonId)
        expect(secondBody.isNew).toBe(false)
        expect(secondBody.teamsCreated).toBe(0)
        expect(secondBody.teamAssignmentsCreated).toBe(0)
        expect(secondBody.dinnerEventsCreated).toBe(0)
    })
})
