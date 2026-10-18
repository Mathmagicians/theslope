import {test, expect, type BrowserContext, type Page} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {JOKER_SLOT_IDS} from '~~/tests/component/components/cooking-team/jokerSlotIds'
import type {Season} from '~/composables/useSeasonValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, gotoHydrated, waitForApi, temporaryAndRandom} = testHelpers

test.describe('AdminTeams Form UI', () => {
    const adminTeamsUrl = '/admin/teams'
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId)
        }
    })

    test('GIVEN a season without madhold WHEN viewing it THEN the table renders its own empty state with the create CTA',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Fresh season with NO teams
            const season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id!)

            // WHEN: Viewing the teams tab for that season
            await page.goto(`${adminTeamsUrl}?season=${season.shortName}`)

            // THEN: The empty state is the table's own #empty slot, not an alert rendered instead of the table
            const table = page.locator('table')
            await pollUntil(() => table.isVisible(), visible => visible)
            await expect(table.getByTestId('teams-empty-state')).toBeVisible()
            await expect(table.getByTestId('create-new-team')).toBeVisible()
        })

    test('GIVEN a season without madhold WHEN switching to edit mode THEN the same table empty state and create CTA render',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Fresh season with NO teams
            const season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id!)

            // WHEN: Opening the teams tab in edit mode - the state reached by deleting the last team
            await page.goto(`${adminTeamsUrl}?season=${season.shortName}&mode=edit`)

            // THEN: ONE empty state, the table's own - not the "Vælg et madhold" master-detail placeholder
            const table = page.locator('table')
            await pollUntil(() => table.isVisible(), visible => visible)
            await expect(table.getByTestId('teams-empty-state')).toBeVisible()
            await expect(table.getByTestId('create-new-team')).toBeVisible()
            await expect(page.getByText('Vælg et madhold for at redigere')).toBeHidden()
        })

    test.describe('Create Mode', () => {
        test('GIVEN user in create mode WHEN entering team count and submitting THEN teams are created',
            async ({page, browser}) => {
                const context = await validatedBrowserContext(browser)

                // GIVEN: Fresh season with NO teams
                const season = await SeasonFactory.createSeason(context)
                createdSeasonIds.push(season.id!)

                const initialTeams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
                expect(initialTeams.length).toBe(0)

                await gotoHydrated(page, `${adminTeamsUrl}?mode=create&season=${season.shortName}`)
                // Wait on UI state, not on a season API response: with SSR payload transfer
                // the client may legitimately never re-fetch /api/admin/season (CI-flaky otherwise)
                await expect(page.locator('input#team-count')).toBeVisible()

                // WHEN: Create 2 teams
                await page.locator('input#team-count').fill('2')
                await page.getByTestId('submit-create-teams').click()

                // THEN: Poll until teams are created
                const teams = await pollUntil(
                    () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                    (teams) => teams.length === 2,
                    6
                )
                expect(teams.length).toBe(2)
                expect(teams[0]!.name).toContain('Madhold 1')
                expect(teams[0]!.name).toContain(season.shortName)
                expect(teams[1]!.name).toContain('Madhold 2')
                expect(teams[1]!.name).toContain(season.shortName)
            })

        test('GIVEN an expired session WHEN submitting THEN the user lands on login with a return path',
            async ({page, browser}) => {
                const context = await validatedBrowserContext(browser)
                const season = await SeasonFactory.createSeason(context)
                createdSeasonIds.push(season.id!)

                await gotoHydrated(page, `${adminTeamsUrl}?mode=create&season=${season.shortName}`)
                await expect(page.locator('input#team-count')).toBeVisible()

                // WHEN: the session dies before the save
                await page.context().clearCookies()
                await page.locator('input#team-count').fill('2')
                await page.getByTestId('submit-create-teams').click()

                // THEN: the error floor re-authenticates with the page as the return path
                await expect(page).toHaveURL(/\/login\?redirect=/)
                expect(decodeURIComponent(page.url())).toContain('/admin/teams')
            })
    })

    test.describe('Edit Mode', () => {
        let context: BrowserContext
        let season: Season
        let page: Page

        // Every immediate save must leave the user in the mode they were in
        const expectMode = async (mode: FormMode) => {
            await expect(page).toHaveURL(new RegExp(`mode=${mode}`))
        }

        // Common setup for all edit mode tests
        test.beforeEach(async ({page: testPage, browser}) => {
            page = testPage
            context = await validatedBrowserContext(browser)

            // Create season via API
            season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id!)

            // Navigate to edit mode with season in URL
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(() => page.getByTestId('admin-teams').isVisible(), visible => visible)
        })

        test('GIVEN user in edit mode WHEN renaming team THEN team name is updated immediately', async () => {
            // GIVEN: Create one team
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Name')

            // Navigate with the team open in the edit face
            await gotoHydrated(page, `${adminTeamsUrl}?mode=edit&season=${season.shortName}&team=${team.id}`)
            await expect(page.getByTestId('admin-teams')).toBeVisible()

            // Wait for team input to be visible
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Append character to team name and blur (immediate save on blur)
            await teamInput.click()
            await teamInput.press('End') // Move cursor to end
            await teamInput.type('Q')

            // Setup response wait BEFORE blur to avoid race condition.
            // The POST triggers dinner event reconciliation (ADR-015), so the wait is on its response.
            const responsePromise = waitForApi(page, '/api/admin/team/', 'POST')
            await teamInput.blur() // Trigger save on blur
            await responsePromise

            // THEN: Team name should be updated immediately via API
            const updatedTeam = await SeasonFactory.getCookingTeamById(context, team.id!)
            expect(updatedTeam).not.toBeNull()
            expect(updatedTeam!.name).toContain('Q')
            await expectMode(FORM_MODES.EDIT)
        })

        test('GIVEN season with team WHEN deleting team via UI THEN team is removed', async () => {
            // GIVEN: Create one team
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team to Delete')

            // Navigate with the team open in the edit face
            await gotoHydrated(page, `${adminTeamsUrl}?mode=edit&season=${season.shortName}&team=${team.id}`)
            await expect(page.getByTestId('admin-teams')).toBeVisible()

            // Verify team is shown
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Delete team (DangerButton requires 2 clicks: first to confirm, second to execute)
            const deleteButton = page.getByTestId('delete-team-button')
            await expect(deleteButton).toBeVisible()

            // First click: enter confirm mode
            await deleteButton.click()

            // Second click: actually trigger delete
            const responsePromise = waitForApi(page, '/api/admin/team/', 'DELETE')
            await deleteButton.click()
            await responsePromise

            // THEN: Team should be removed immediately via API
            const teams = await pollUntil(
                () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                (teams) => teams.length === 0
            )
            expect(teams.length).toBe(0)
            await expectMode(FORM_MODES.EDIT)
        })

        test('GIVEN season with 3 teams WHEN clicking team rows THEN detail panel shows selected team', async () => {
            // GIVEN: Create 3 teams
            const alpha = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Alpha')
            const beta = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Beta')
            const gamma = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Gamma')

            // Navigate to see the teams
            await gotoHydrated(page, `${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await expect(page.getByTestId('admin-teams')).toBeVisible()

            // THEN: the master table lists the teams in the overview (nothing opened)
            const teamRows = page.locator('[data-testid^="team-row-"]')
            const teamInput = page.getByTestId('team-name-input')
            await expect(teamRows.first()).toBeVisible()
            await expect(teamRows).toHaveCount(3)
            await expect(teamInput).toBeHidden()

            // Documentation screenshot: Admin Teams management view
            await doScreenshot(page, 'admin/admin-teams-edit', true)

            // WHEN/THEN: clicking a row shows that team in the detail panel
            for (const {team, name} of [
                {team: beta, name: 'Team Beta'},
                {team: gamma, name: 'Team Gamma'},
                {team: alpha, name: 'Team Alpha'}
            ]) {
                // The panel fills from the selected team's detail, fetched on the click
                const detailLoaded = waitForApi(page, `/api/admin/team/${team.id}`, 'GET')
                await page.getByTestId(`team-row-${team.id}`).click()
                await detailLoaded
                await expect(teamInput).toHaveValue(new RegExp(name))
            }

            // AND: clicking the open row again deselects back to the overview
            await page.getByTestId(`team-row-${alpha.id}`).click()
            await expect(teamInput).toBeHidden()
            await expect(page).not.toHaveURL(/team=/)
        })

        test('GIVEN user in edit mode WHEN adding a member to a team THEN the assignment is saved', async ({browser: _browser}) => {
            // GIVEN: a team and an inhabitant to add
            const testSalt = temporaryAndRandom()
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Medlem')
            const household = await HouseholdFactory.createHousehold(context)
            createdHouseholdIds.push(household.id)
            await HouseholdFactory.createInhabitantForHousehold(context, household.id, `Medlem-${testSalt} Testesen`)

            await gotoHydrated(page, `${adminTeamsUrl}?mode=edit&season=${season.shortName}&team=${team.id}`)
            await expect(page.getByTestId('admin-teams')).toBeVisible()

            // WHEN: adding the inhabitant through the member finder
            const search = page.getByPlaceholder('Søg efter navn...')
            await expect(search).toBeVisible()
            await search.fill(`Medlem-${testSalt}`)
            // The finder filters on the typed name; the member's row action then expands the add form under
            // the row (its label flips to Luk)
            await expect(page.getByText(`Medlem-${testSalt}`)).toBeVisible()
            const memberRow = page.getByRole('row').filter({hasText: `Medlem-${testSalt}`})
            await memberRow.getByRole('button', {name: 'Tilføj', exact: true}).click()
            await expect(memberRow.getByRole('button', {name: 'Luk', exact: true})).toBeVisible()
            const responsePromise = waitForApi(page, '/api/admin/team/assignment', 'PUT')
            // The expanded row holds the member form; the joker row's Tilføj sits outside the finder
            const memberForm = page.getByRole('row').filter({has: page.getByTestId('team-member-role-select')})
            await memberForm.getByRole('button', {name: 'Tilføj', exact: true}).click()
            const response = await responsePromise
            expect(response.status()).toBe(201)

            // THEN: the assignment lands via API
            const savedTeam = await pollUntil(
                () => SeasonFactory.getCookingTeamById(context, team.id!),
                (t) => (t?.assignments?.length ?? 0) === 1
            )
            expect(savedTeam!.assignments!.length).toBe(1)

            // AND: the page stays in edit mode with the member finder on screen
            await expectMode(FORM_MODES.EDIT)
            await expect(search).toBeVisible()
        })

        test('GIVEN a team in edit mode WHEN adding a joker slot through the form THEN the Jokere box lists it', async () => {
            // GIVEN: a team open in the edit face
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Joker')
            await gotoHydrated(page, `${adminTeamsUrl}?mode=edit&season=${season.shortName}&team=${team.id}`)
            await expect(page.getByTestId(JOKER_SLOT_IDS.add)).toBeVisible()

            // WHEN: opening the form, ticking a weekday and creating the slot
            await page.getByTestId(JOKER_SLOT_IDS.add).click()
            const form = page.getByTestId(JOKER_SLOT_IDS.form)
            await form.getByRole('checkbox').first().check()
            const responsePromise = waitForApi(page, `/api/admin/team/${team.id}/joker-slot`, 'PUT')
            await page.getByTestId(JOKER_SLOT_IDS.submit).click()
            expect((await responsePromise).status()).toBe(201)

            // THEN: the Jokere box shows the slot line, and the team counts it
            await expect(page.getByTestId('team-joker-box').getByTestId('team-joker-slot')).toHaveCount(1)
            const teams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
            expect(teams.find(t => t.id === team.id)?.jokerSlotCount).toBe(1)
            await expectMode(FORM_MODES.EDIT)
        })
    })
})
