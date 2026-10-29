import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import type {H3Event} from 'h3'
import {useCoreValidation, type UserDetail, type InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {useCookingTeamValidation, type CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import {isAdmin, canMutateAllergies} from '~/composables/usePermissions'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {fetchDinnerEvent} from '~~/server/data/financesRepository'
import {findTeamAssignmentByTeamAndInhabitant} from '~~/server/data/prismaRepository'
import {requireChefForDinner, requireHouseholdAccess} from '~~/server/utils/authorizationHelper'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

// Hoist module mocks before importing the SUT
vi.mock('~~/server/data/financesRepository', () => ({
    fetchDinnerEvent: vi.fn()
}))
vi.mock('~~/server/data/prismaRepository', () => ({
    findTeamAssignmentByTeamAndInhabitant: vi.fn()
}))
vi.mock('~~/server/utils/eventHandlerHelper', () => {
    const getSessionUser = vi.fn()
    const throwH3Error = (msg: string, _cause: unknown, statusCode = 500) => {
        const err: Error & {statusCode?: number} = new Error(msg)
        err.statusCode = statusCode
        throw err
    }
    return {default: {getSessionUser, throwH3Error}}
})

const getSessionUser = eventHandlerHelper.getSessionUser as unknown as ReturnType<typeof vi.fn>

const ME_INHABITANT_ID = 42
const TEAM_ID = 7
const DINNER_ID = 100

const mockUser = (overrides?: {inhabitantId?: number | null}): UserDetail => ({
    id: 1,
    email: 'me@example.com',
    systemRoles: [],
    Inhabitant: overrides?.inhabitantId === null
        ? null
        : ({id: overrides?.inhabitantId ?? ME_INHABITANT_ID} as unknown as InhabitantDisplay)
} as unknown as UserDetail)

const mockDinner = (overrides?: Partial<DinnerEventDetail>): DinnerEventDetail => ({
    id: DINNER_ID,
    cookingTeamId: TEAM_ID,
    chefId: null,
    ...overrides
} as DinnerEventDetail)

const mockAssignment = (role: typeof Role[keyof typeof Role]): CookingTeamAssignment => ({
    id: 1, cookingTeamId: TEAM_ID, inhabitantId: ME_INHABITANT_ID, role,
    allocationPercentage: 100, affinity: null, inhabitant: {id: ME_INHABITANT_ID} as InhabitantDisplay
})

const mockEvent: H3Event = {context: {cloudflare: {env: {DB: {} as unknown}}}} as unknown as H3Event

beforeEach(() => {
    vi.clearAllMocks()
})

describe('requireChefForDinner', () => {
    it('GIVEN caller is CHEF on dinner team THEN returns user and dinner', async () => {
        getSessionUser.mockResolvedValue(mockUser())
        vi.mocked(fetchDinnerEvent).mockResolvedValue(mockDinner())
        vi.mocked(findTeamAssignmentByTeamAndInhabitant).mockResolvedValue(mockAssignment(Role.CHEF))

        const {user, dinner} = await requireChefForDinner(mockEvent, DINNER_ID)

        expect(user.email).toBe('me@example.com')
        expect(dinner.id).toBe(DINNER_ID)
        expect(findTeamAssignmentByTeamAndInhabitant).toHaveBeenCalledWith(expect.anything(), TEAM_ID, ME_INHABITANT_ID)
    })

    it.each([
        {desc: 'caller has no team assignment',  assignment: null},
        {desc: 'caller is COOK on dinner team',  assignment: mockAssignment(Role.COOK)},
        {desc: 'caller is JUNIORHELPER',         assignment: mockAssignment(Role.JUNIORHELPER)}
    ])('GIVEN $desc THEN throws 403', async ({assignment}) => {
        getSessionUser.mockResolvedValue(mockUser())
        vi.mocked(fetchDinnerEvent).mockResolvedValue(mockDinner())
        vi.mocked(findTeamAssignmentByTeamAndInhabitant).mockResolvedValue(assignment)

        await expect(requireChefForDinner(mockEvent, DINNER_ID))
            .rejects.toMatchObject({statusCode: 403})
    })

    it('GIVEN no authenticated user THEN throws 401', async () => {
        getSessionUser.mockResolvedValue(null)

        await expect(requireChefForDinner(mockEvent, DINNER_ID))
            .rejects.toMatchObject({statusCode: 401})
    })

    it('GIVEN authenticated user with no Inhabitant THEN throws 403', async () => {
        getSessionUser.mockResolvedValue(mockUser({inhabitantId: null}))

        await expect(requireChefForDinner(mockEvent, DINNER_ID))
            .rejects.toMatchObject({statusCode: 403})
    })

    it('GIVEN dinner not found THEN throws 404', async () => {
        getSessionUser.mockResolvedValue(mockUser())
        vi.mocked(fetchDinnerEvent).mockResolvedValue(null)

        await expect(requireChefForDinner(mockEvent, DINNER_ID))
            .rejects.toMatchObject({statusCode: 404})
    })

    it('GIVEN dinner has no cookingTeamId THEN throws 404', async () => {
        getSessionUser.mockResolvedValue(mockUser())
        vi.mocked(fetchDinnerEvent).mockResolvedValue(mockDinner({cookingTeamId: null}))

        await expect(requireChefForDinner(mockEvent, DINNER_ID))
            .rejects.toMatchObject({statusCode: 404})
    })
})

// Every member reads; a household changes its own data, and an admin, or the allergy manager for allergies, changes it
// through the override the endpoint passes as a predicate, logged with the actor, their roles and the household (ADR-004)
describe('requireHouseholdAccess', () => {
    const SystemRole = useCoreValidation().SystemRoleSchema.enum
    const HOUSEHOLD_ID = 4711
    const OTHER_HOUSEHOLD_ID = 4712
    const callerIn = (householdId: number, systemRoles: typeof SystemRole[keyof typeof SystemRole][] = []): UserDetail =>
        ({...mockUser(), systemRoles, Inhabitant: {id: ME_INHABITANT_ID, householdId} as unknown as InhabitantDisplay} as UserDetail)
    // The info lines that name the actor, each of their system roles and the household
    let info: MockInstance<typeof console.info>
    const overrideLines = (user: UserDetail) => info.mock.calls
        .map(([message]) => String(message))
        .filter(message => message.includes(user.email) && message.includes(String(HOUSEHOLD_ID))
            && user.systemRoles.every(role => message.includes(role)))

    beforeEach(() => {
        info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    })
    afterEach(() => {
        info.mockRestore()
    })

    it.each([
        {caller: 'a member of the household', user: callerIn(HOUSEHOLD_ID), override: undefined, logged: 0},
        {caller: 'an admin with the override', user: callerIn(OTHER_HOUSEHOLD_ID, [SystemRole.ADMIN]), override: isAdmin, logged: 1},
        {caller: 'the allergy manager with the override', user: callerIn(OTHER_HOUSEHOLD_ID, [SystemRole.ALLERGYMANAGER]), override: canMutateAllergies, logged: 1}
    ])('GIVEN $caller THEN returns the user, with $logged info line naming the actor, their roles and the household', async ({user, override, logged}) => {
        getSessionUser.mockResolvedValue(user)

        await expect(requireHouseholdAccess(mockEvent, HOUSEHOLD_ID, override)).resolves.toBe(user)

        expect(overrideLines(user)).toHaveLength(logged)
    })

    it.each([
        {caller: 'a member of another household', user: callerIn(OTHER_HOUSEHOLD_ID), override: undefined, status: 403},
        {caller: 'a member of another household with no roles, passing the allergy override', user: callerIn(OTHER_HOUSEHOLD_ID), override: canMutateAllergies, status: 403},
        {caller: 'an admin without the override', user: callerIn(OTHER_HOUSEHOLD_ID, [SystemRole.ADMIN]), override: undefined, status: 403},
        {caller: 'no session', user: null, override: undefined, status: 401}
    ])('GIVEN $caller THEN throws $status', async ({user, override, status}) => {
        getSessionUser.mockResolvedValue(user)

        await expect(requireHouseholdAccess(mockEvent, HOUSEHOLD_ID, override)).rejects.toMatchObject({statusCode: status})
    })
})
