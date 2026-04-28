import {describe, it, expect, vi, beforeEach} from 'vitest'
import type {H3Event} from 'h3'
import type {UserDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {useCookingTeamValidation, type CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {fetchDinnerEvent} from '~~/server/data/financesRepository'
import {findTeamAssignmentByTeamAndInhabitant} from '~~/server/data/prismaRepository'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'

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
    it('GIVEN caller is CHEF on dinner team THEN returns user', async () => {
        getSessionUser.mockResolvedValue(mockUser())
        vi.mocked(fetchDinnerEvent).mockResolvedValue(mockDinner())
        vi.mocked(findTeamAssignmentByTeamAndInhabitant).mockResolvedValue(mockAssignment(Role.CHEF))

        const user = await requireChefForDinner(mockEvent, DINNER_ID)

        expect(user.email).toBe('me@example.com')
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
