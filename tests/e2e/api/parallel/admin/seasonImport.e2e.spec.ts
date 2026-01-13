import {test, expect} from '@playwright/test'
import {SeasonImportFactory} from '~~/tests/e2e/testDataFactories/seasonImportFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

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
    })
})
