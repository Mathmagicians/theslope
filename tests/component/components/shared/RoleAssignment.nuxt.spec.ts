// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import {flushPromises} from '@vue/test-utils'
import RoleAssignment from '~/components/shared/RoleAssignment.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation, ROLE_LABELS} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const ME_ID = 42
const ME: InhabitantDisplay = {id: ME_ID, name: 'Mig', lastName: 'Test'} as unknown as InhabitantDisplay
const OTHER: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

const claimRoleForMeMock = vi.fn(async () => ({id: 1}))
const resignRoleForMeMock = vi.fn(async () => ({id: 1}))

mockNuxtImport('useAuthStore', () => () => ({
    inhabitantId: ME_ID,
    user: {Inhabitant: {id: ME_ID}}
}))

mockNuxtImport('usePlanStore', () => () => ({
    claimRoleForMe: claimRoleForMeMock,
    resignRoleForMe: resignRoleForMeMock,
    isRoleUpdating: false
}))

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

const findById = (wrapper: Awaited<ReturnType<typeof mountWith>>, id: string) =>
    wrapper.find(`[data-testid="${id}"]`)

beforeEach(() => vi.clearAllMocks())

describe('RoleAssignment', () => {
    it('vacant trigger label names the role to volunteer for', async () => {
        const label = findById(await mountWith(null), TEST_IDS.trigger).text().toLowerCase()
        expect(label).toContain(ROLE_LABELS[TeamRole.CHEF].toLowerCase())
    })

    it.each([
        {desc: 'self is chef',  chef: ME},
        {desc: 'other is chef', chef: OTHER}
    ])('assigned trigger ($desc) shows a label distinct from vacant', async ({chef}) => {
        const vacant = findById(await mountWith(null), TEST_IDS.trigger).text().trim()
        const assigned = findById(await mountWith(chef), TEST_IDS.trigger).text().trim()
        expect(assigned).not.toBe(vacant)
        expect(assigned).not.toBe('')
    })

    it('clicking the trigger opens the collapsible panel', async () => {
        const wrapper = await mountWith()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)

        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()

        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(true)
    })

    it('volunteer flow: save calls claimRoleForMe and emits role-assigned', async () => {
        const wrapper = await mountWith()
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        await findById(wrapper, TEST_IDS.save).trigger('click')
        await nextTick()

        expect(claimRoleForMeMock).toHaveBeenCalledTimes(1)
        expect(claimRoleForMeMock).toHaveBeenCalledWith(expect.objectContaining({chef: null}), TeamRole.CHEF)
        expect(wrapper.emitted('role-assigned')).toHaveLength(1)
    })

    it('resign flow: DangerButton confirm calls resignRoleForMe and emits role-removed', async () => {
        const wrapper = await mountWith(ME)
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()

        const resignBtn = findById(wrapper, TEST_IDS.resign).find('button')
        await resignBtn.trigger('click')
        await nextTick()
        await resignBtn.trigger('click')
        await nextTick()

        expect(resignRoleForMeMock).toHaveBeenCalledTimes(1)
        expect(resignRoleForMeMock).toHaveBeenCalledWith(expect.objectContaining({chef: ME}), TeamRole.CHEF)
        expect(wrapper.emitted('role-removed')).toHaveLength(1)
    })

    it('swap flow does NOT call the API (Phase 3 placeholder)', async () => {
        const wrapper = await mountWith(OTHER)
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        await findById(wrapper, TEST_IDS.save).trigger('click')
        await nextTick()

        expect(claimRoleForMeMock).not.toHaveBeenCalled()
        expect(resignRoleForMeMock).not.toHaveBeenCalled()
        expect(wrapper.emitted('role-assigned')).toBeFalsy()
    })

    it('cancel closes the panel without calling the API', async () => {
        const wrapper = await mountWith()
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        await findById(wrapper, TEST_IDS.cancel).trigger('click')
        await nextTick()

        expect(claimRoleForMeMock).not.toHaveBeenCalled()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)
    })

    it('exposes open() to programmatically open the panel', async () => {
        const wrapper = await mountWith()
        const exposed = (wrapper.vm.$ as {exposed: {open: () => void} | null}).exposed
        expect(exposed?.open).toBeTypeOf('function')

        exposed!.open()
        await flushPromises()
        await nextTick()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(true)
    })

    it('renders nothing for past dinners (cannot act in the past)', async () => {
        const pastDinner = {...buildDinner(), id: 999, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}})
        expect(findById(wrapper, TEST_IDS.trigger).exists()).toBe(false)
    })

    it('exposed open() is a no-op for past dinners', async () => {
        const pastDinner = {...buildDinner(), id: 999, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}})
        const exposed = (wrapper.vm.$ as {exposed: {open: () => void} | null}).exposed
        exposed!.open()
        await flushPromises()
        await nextTick()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)
    })

    it('closes an open panel when navigating to a different dinner', async () => {
        const wrapper = await mountWith()
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(true)

        await wrapper.setProps({dinnerEvent: {...buildDinner(), id: 1234}, role: TeamRole.CHEF})
        await flushPromises()
        await nextTick()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)
    })
})
