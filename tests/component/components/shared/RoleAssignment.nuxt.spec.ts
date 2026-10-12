// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended, registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'
import {nextTick} from 'vue'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {readBody, type H3Event} from 'h3'
import RoleAssignment from '~/components/shared/RoleAssignment.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useCookingTeamValidation, ROLE_LABELS} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay, UserDetail} from '~/composables/useCoreValidation'

/**
 * RoleAssignment: the trigger and the panel a member claims, swaps or resigns a dinner role through.
 * Real component tree and real stores (testing.md Rule 6); only HTTP and the session are faked.
 */
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const ME_ID = 42
const ME: InhabitantDisplay = {id: ME_ID, name: 'Mig', lastName: 'Test'} as unknown as InhabitantDisplay
const OTHER: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

// The test runtime has no session cookie and no /api/_auth endpoint, so the session nuxt-auth-utils
// would hydrate is the one thing faked; the auth store reading it and the plan store claiming are real
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)
const base = UserFactory.defaultUserWithInhabitant('role-me')
const me: UserDetail = {...base, Inhabitant: {...base.Inhabitant!, id: ME_ID}}

// The plan store claims and resigns through the dinner's routes; each request is recorded with its route
const DINNER_ID = DinnerEventFactory.defaultDinnerEventDetail().id
const roleRequests: {route: string, body: unknown}[] = []
const roleEndpoint = (route: string) => async (event: H3Event) => {
    roleRequests.push({route, body: await readBody(event)})
    return DinnerEventFactory.defaultDinnerEventDetail()
}
registerEmptyStoreEndpoints()
registerEndpoint(`/api/team/cooking/${DINNER_ID}/assign-role`, {method: 'POST', handler: roleEndpoint('assign-role')})
registerEndpoint(`/api/team/cooking/${DINNER_ID}/remove-role`, {method: 'POST', handler: roleEndpoint('remove-role')})
const MY_CHEF_REQUEST = {inhabitantId: ME_ID, role: TeamRole.CHEF}

const TEST_IDS = {
    trigger: 'role-assignment-trigger',
    save: 'role-assignment-save',
    cancel: 'role-assignment-cancel',
    resign: 'role-assignment-resign'
} as const

const buildDinner = (chef: InhabitantDisplay | null = null) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    cookingTeamId: 7,
    cookingTeam: {id: 7, name: 'Madhold A - Winter 2026'} as unknown as never,
    chef
})

const mountWith = (chef: InhabitantDisplay | null = null) =>
    mountSuspended(RoleAssignment, {props: {dinnerEvent: buildDinner(chef), role: TeamRole.CHEF}})

// The next test's resetStores drops the datasets a still-mounted panel's store reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    roleRequests.length = 0
    session.user.value = me
})

describe('RoleAssignment', () => {
    it('vacant trigger label names the role to volunteer for', async () => {
        const label = findByTestId(await mountWith(null), TEST_IDS.trigger).text().toLowerCase()
        expect(label).toContain(ROLE_LABELS[TeamRole.CHEF].toLowerCase())
    })

    it.each([
        {desc: 'self is chef',  chef: ME},
        {desc: 'other is chef', chef: OTHER}
    ])('assigned trigger ($desc) shows a label distinct from vacant', async ({chef}) => {
        const vacant = findByTestId(await mountWith(null), TEST_IDS.trigger).text().trim()
        const assigned = findByTestId(await mountWith(chef), TEST_IDS.trigger).text().trim()
        expect(assigned).not.toBe(vacant)
        expect(assigned).not.toBe('')
    })

    it('clicking the trigger opens the collapsible panel', async () => {
        const wrapper = await mountWith()
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(false)

        await clickByTestId(wrapper, TEST_IDS.trigger)

        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(true)
    })

    it('volunteer flow: save claims the role for me on the dinner and emits role-assigned', async () => {
        const wrapper = await mountWith()
        await clickByTestId(wrapper, TEST_IDS.trigger)
        await clickByTestId(wrapper, TEST_IDS.save)
        await flushPromises()

        expect(roleRequests).toEqual([{route: 'assign-role', body: MY_CHEF_REQUEST}])
        expect(wrapper.emitted('role-assigned')).toHaveLength(1)
    })

    it('resign flow: DangerButton confirm resigns the role for me on the dinner and emits role-removed', async () => {
        const wrapper = await mountWith(ME)
        await clickByTestId(wrapper, TEST_IDS.trigger)

        const resignBtn = findByTestId(wrapper, TEST_IDS.resign).find('button')
        await resignBtn.trigger('click')
        await nextTick()
        await resignBtn.trigger('click')
        await nextTick()
        await flushPromises()

        expect(roleRequests).toEqual([{route: 'remove-role', body: MY_CHEF_REQUEST}])
        expect(wrapper.emitted('role-removed')).toHaveLength(1)
    })

    it('takeover: swap save claims the duty on the dinner and emits role-assigned', async () => {
        const wrapper = await mountWith(OTHER)
        await clickByTestId(wrapper, TEST_IDS.trigger)
        await clickByTestId(wrapper, TEST_IDS.save)
        await flushPromises()

        expect(roleRequests).toEqual([{route: 'assign-role', body: MY_CHEF_REQUEST}])
        expect(wrapper.emitted('role-assigned')).toHaveLength(1)
    })

    it('cancel closes the panel without calling the API', async () => {
        const wrapper = await mountWith()
        await clickByTestId(wrapper, TEST_IDS.trigger)
        await clickByTestId(wrapper, TEST_IDS.cancel)

        expect(roleRequests).toEqual([])
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(false)
    })

    it('exposes open() to programmatically open the panel', async () => {
        const wrapper = await mountWith()
        const exposed = (wrapper.vm.$ as {exposed: {open: () => void} | null}).exposed
        expect(exposed?.open).toBeTypeOf('function')

        exposed!.open()
        await flushPromises()
        await nextTick()
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(true)
    })

    it('renders nothing for past dinners (cannot act in the past)', async () => {
        const pastDinner = {...buildDinner(), id: 999, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}})
        expect(findByTestId(wrapper, TEST_IDS.trigger).exists()).toBe(false)
    })

    it('exposed open() is a no-op for past dinners', async () => {
        const pastDinner = {...buildDinner(), id: 999, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}})
        const exposed = (wrapper.vm.$ as {exposed: {open: () => void} | null}).exposed
        exposed!.open()
        await flushPromises()
        await nextTick()
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(false)
    })

    it('closes an open panel when navigating to a different dinner', async () => {
        const wrapper = await mountWith()
        await clickByTestId(wrapper, TEST_IDS.trigger)
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(true)

        await wrapper.setProps({dinnerEvent: {...buildDinner(), id: 1234}, role: TeamRole.CHEF})
        await flushPromises()
        await nextTick()
        expect(findByTestId(wrapper, TEST_IDS.save).exists()).toBe(false)
    })
})
