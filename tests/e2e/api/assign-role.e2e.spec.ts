import { test, expect } from '@playwright/test'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import { HouseholdFactory } from '../testDataFactories/householdFactory'
import { DinnerEventFactory } from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import { useCookingTeamValidation } from '~/composables/useCookingTeamValidation'

const { validatedBrowserContext, salt, temporaryAndRandom } = testHelpers
const { TeamRoleSchema } = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

let testSeason: any
const createdHouseholdIds: number[] = []

test.describe('DinnerEvent API - Assign Role', () => {

    test.beforeAll(async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        // Create dedicated season for this test (not singleton - we don't need active season)
        testSeason = await SeasonFactory.createSeason(context)
    })

    test.afterAll(async ({ browser }) => {
        const context = await validatedBrowserContext(browser)

        // Delete season - CASCADE deletes teams, dinner events, and assignments (ADR-005)
        if (testSeason?.id) {
            try {
                await SeasonFactory.deleteSeason(context, testSeason.id)
            } catch (error) {
                console.warn(`Failed to delete test season ${testSeason.id}:`, error)
            }
        }

        // Delete households (not related to season, need manual cleanup)
        for (const id of createdHouseholdIds) {
            try {
                await HouseholdFactory.deleteHousehold(context, id)
            } catch (error) {
                console.warn(`Failed to delete household ${id}:`, error)
            }
        }
    })

    test.describe('POST /api/admin/dinner-event/[id]/assign-role', () => {

        // Parametrized tests for role assignment (CHEF, COOK, JUNIORHELPER)
        const roleAssignmentCases = [
            {
                role: TeamRole.CHEF,
                householdPrefix: 'Chef',
                shouldUpdateChefId: true,
                description: 'updates chefId and creates CHEF role assignment'
            },
            {
                role: TeamRole.COOK,
                householdPrefix: 'Cook',
                shouldUpdateChefId: false,
                description: 'creates COOK assignment without updating chefId'
            },
            {
                role: TeamRole.JUNIORHELPER,
                householdPrefix: 'Helper',
                shouldUpdateChefId: false,
                description: 'creates JUNIORHELPER assignment without updating chefId'
            }
        ]

        roleAssignmentCases.forEach(({ role, householdPrefix, shouldUpdateChefId, description }) => {
            test(`GIVEN dinner event WHEN assigning ${role} role THEN ${description}`, async ({ browser }) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                // Create cooking team for the test season
                const team = await SeasonFactory.createCookingTeamForSeason(context, testSeason.id, salt('Team', testSalt))
                expect(team.id).toBeDefined()

                // Create inhabitant for role assignment
                const household = await HouseholdFactory.createHousehold(context, {
                    name: salt(`${householdPrefix}House`, testSalt)
                })
                createdHouseholdIds.push(household.id)

                const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                    context,
                    household.id,
                    salt(householdPrefix, testSalt)
                )
                expect(inhabitant.id).toBeDefined()

                // Create dinner event assigned to the team (no chef yet)
                const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(
                    context,
                    testSeason.id,
                    { chefId: null, cookingTeamId: team.id }
                )
                expect(dinnerEvent.id).toBeDefined()
                expect(dinnerEvent.chefId).toBeNull()
                expect(dinnerEvent.cookingTeamId).toBe(team.id)

                // Assign role using factory
                const updatedDinner = await DinnerEventFactory.assignRoleToDinnerEvent(
                    context,
                    dinnerEvent.id,
                    inhabitant.id,
                    role
                )

                // Verify chefId behavior based on role
                if (shouldUpdateChefId) {
                    expect(updatedDinner.chefId, 'Dinner event should have chefId assigned').toBe(inhabitant.id)
                } else {
                    expect(updatedDinner.chefId, `chefId should remain null for ${role} role`).toBeNull()
                }

                // Verify CookingTeamAssignment was created with correct role
                const teamWithAssignments = await SeasonFactory.getCookingTeamById(context, team.id)
                expect(teamWithAssignments.assignments).toBeDefined()

                const assignment = teamWithAssignments.assignments.find(
                    (a: any) => a.inhabitantId === inhabitant.id
                )
                expect(assignment, `${role} assignment should exist`).toBeDefined()
                expect(assignment.role, `Assignment role should be ${role}`).toBe(role)
                expect(assignment.cookingTeamId, 'Assignment should reference correct team').toBe(team.id)
            })
        })

        test('GIVEN dinner event with existing COOK assignment WHEN assigning as chef THEN updates role to CHEF', async ({ browser }) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // Create cooking team
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeason.id, salt('Team', testSalt))

            // Create inhabitant
            const household = await HouseholdFactory.createHousehold(context, {
                name: salt('ChefHouse', testSalt)
            })
            createdHouseholdIds.push(household.id)

            const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                context,
                household.id,
                salt('Cook', testSalt)
            )

            // Create existing assignment with COOK role
            const existingAssignment = await SeasonFactory.assignMemberToTeam(
                context,
                team.id,
                inhabitant.id,
                TeamRole.COOK
            )
            expect(existingAssignment.role, 'Initial role should be COOK').toBe(TeamRole.COOK)

            // Create dinner event
            const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(
                context,
                testSeason.id,
                { chefId: null, cookingTeamId: team.id }
            )

            // Assign as chef using factory
            await DinnerEventFactory.assignRoleToDinnerEvent(
                context,
                dinnerEvent.id,
                inhabitant.id,
                TeamRole.CHEF
            )

            // Verify role was updated to CHEF
            const teamWithAssignments = await SeasonFactory.getCookingTeamById(context, team.id)
            const chefAssignment = teamWithAssignments.assignments.find(
                (a: any) => a.inhabitantId === inhabitant.id
            )
            expect(chefAssignment, 'Assignment should exist').toBeDefined()
            expect(chefAssignment.role, 'Role should be updated to CHEF').toBe(TeamRole.CHEF)
        })

        test('GIVEN dinner event with no cooking team WHEN assigning role THEN returns 400 error', async ({ browser }) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // Create inhabitant
            const household = await HouseholdFactory.createHousehold(context, {
                name: salt('RoleHouse', testSalt)
            })
            createdHouseholdIds.push(household.id)

            const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                context,
                household.id,
                salt('Role', testSalt)
            )

            // Create dinner event without cooking team
            const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(
                context,
                testSeason.id,
                { chefId: null, cookingTeamId: null }
            )

            // Attempt to assign role - should fail with 400
            await DinnerEventFactory.assignRoleToDinnerEvent(
                context,
                dinnerEvent.id,
                inhabitant.id,
                TeamRole.CHEF,
                400  // Expected status
            )
        })

        test('GIVEN non-existent dinner event WHEN assigning role THEN returns 404 error', async ({ browser }) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // Create inhabitant
            const household = await HouseholdFactory.createHousehold(context, {
                name: salt('RoleHouse', testSalt)
            })
            createdHouseholdIds.push(household.id)

            const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                context,
                household.id,
                salt('Role', testSalt)
            )

            // Attempt to assign role to non-existent dinner
            const nonExistentId = 999999
            await DinnerEventFactory.assignRoleToDinnerEvent(
                context,
                nonExistentId,
                inhabitant.id,
                TeamRole.CHEF,
                404  // Expected status
            )
        })

        test('GIVEN invalid inhabitantId WHEN assigning role THEN returns 400 validation error', async ({ browser }) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // Create cooking team and dinner event
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeason.id, salt('Team', testSalt))

            const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(
                context,
                testSeason.id,
                { chefId: null, cookingTeamId: team.id }
            )

            // Attempt to assign with invalid inhabitantId
            await DinnerEventFactory.assignRoleToDinnerEvent(
                context,
                dinnerEvent.id,
                -1,  // Invalid inhabitantId
                TeamRole.CHEF,
                400  // Expected status
            )
        })
    })
})
