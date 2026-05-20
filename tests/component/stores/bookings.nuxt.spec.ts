// @vitest-environment nuxt
import {setActivePinia, createPinia} from 'pinia'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {useBookingsStore} from '~/stores/bookings'
import {useCookingTeam} from '~/composables/useCookingTeam'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import {formatDate} from '~/utils/date'

const ME = 42
const DINNER_ID = 100
const TEAM = SeasonFactory.defaultCookingTeamDisplay({id: 7, name: 'Madhold A - Winter 2026'})

const assignRoleSpy = vi.fn()
const toastAddSpy = vi.fn<(arg: {title: string}) => void>()

mockNuxtImport('useAuthStore', () => () => ({
    user: {Inhabitant: {id: ME}},
    isAdmin: false,
    email: 'me@example.com',
    inhabitantId: ME
}))

mockNuxtImport('usePlanStore', () => () => ({
    selectedSeason: null,
    assignRoleToDinner: assignRoleSpy,
    isRoleUpdating: false
}))

mockNuxtImport('useToast', () => () => ({add: toastAddSpy}))

const updateDinnerSpy = vi.fn()
registerEndpoint(`/api/chef/dinner/${DINNER_ID}`, {method: 'POST', handler: updateDinnerSpy})

const dinnerResponse = (cookingTeam: CookingTeamDisplay | null = TEAM) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    id: DINNER_ID,
    menuTitle: 'Updated Menu',
    cookingTeamId: cookingTeam?.id ?? null,
    cookingTeam
})

const lastToastTitle = (): string =>
    (toastAddSpy.mock.calls[0]?.[0] as {title: string} | undefined)?.title ?? ''

const {getTeamShortName} = useCookingTeam()

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    updateDinnerSpy.mockReturnValue(dinnerResponse())
})

describe('Bookings store — updateDinnerEventField', () => {
    it.each([
        {desc: 'vacant chef + team → auto-claims',           chefId: null, team: TEAM as CookingTeamDisplay | null, claimed: true,  claimCalls: 1, expectChef: true,  expectTeam: true,  expectDate: true},
        {desc: 'vacant chef + no team → auto-claims',        chefId: null, team: null,                              claimed: true,  claimCalls: 1, expectChef: true,  expectTeam: false, expectDate: true},
        {desc: 'chef already set → plain "Menu gemt" toast', chefId: ME,   team: TEAM as CookingTeamDisplay | null, claimed: false, claimCalls: 0, expectChef: false, expectTeam: false, expectDate: false}
    ])('$desc', async ({chefId, team, claimed, claimCalls, expectChef, expectTeam, expectDate}) => {
        const dinner = dinnerResponse(team)
        updateDinnerSpy.mockReturnValue(dinner)
        const store = useBookingsStore()

        const result = await store.updateDinnerEventField(DINNER_ID, {menuTitle: 'X'}, chefId)

        expect(result?.dinner.id).toBe(DINNER_ID)
        expect(result?.wasAutoClaimed).toBe(claimed)
        expect(assignRoleSpy).toHaveBeenCalledTimes(claimCalls)

        const title = lastToastTitle()
        expect(title).toContain('Menu gemt')
        expect(title.includes('chefkok')).toBe(expectChef)
        expect(title.includes(formatDate(dinner.date))).toBe(expectDate)
        if (team) expect(title.includes(getTeamShortName(team.name))).toBe(expectTeam)
        // Full season-suffixed name should never leak — short name only
        if (team) expect(title).not.toContain(team.name)
    })

    it('toggles isDinnerUpdating across the call', async () => {
        const store = useBookingsStore()
        expect(store.isDinnerUpdating).toBe(false)
        const promise = store.updateDinnerEventField(DINNER_ID, {menuTitle: 'X'}, ME)
        expect(store.isDinnerUpdating).toBe(true)
        await promise
        expect(store.isDinnerUpdating).toBe(false)
    })
})