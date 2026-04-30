// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import {flushPromises} from '@vue/test-utils'
import RoleAssignment from '~/components/shared/RoleAssignment.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const ME_ID = 42
const OTHER: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

const claimRoleForMeMock = vi.fn(async () => ({id: 1}))

mockNuxtImport('useAuthStore', () => () => ({
    inhabitantId: ME_ID,
    user: {Inhabitant: {id: ME_ID}}
}))

mockNuxtImport('usePlanStore', () => () => ({
    claimRoleForMe: claimRoleForMeMock,
    isAssigningRole: false
}))

const TEST_IDS = {
    trigger: 'role-assignment-trigger',
    save: 'role-assignment-save',
    cancel: 'role-assignment-cancel'
} as const

const dinner = {
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    cookingTeamId: 7,
    cookingTeam: {id: 7, name: 'Madhold A - Winter 2026'} as unknown as never
}

const mountWith = (props: {swapWith?: InhabitantDisplay} = {}) =>
    mountSuspended(RoleAssignment, {
        props: {dinnerEvent: dinner, role: TeamRole.CHEF, swapWith: props.swapWith}
    })

const findById = (wrapper: Awaited<ReturnType<typeof mountWith>>, id: string) =>
    wrapper.find(`[data-testid="${id}"]`)

beforeEach(() => claimRoleForMeMock.mockClear())

describe('RoleAssignment', () => {
    it.each([
        {desc: 'volunteer (no swapWith)', swapWith: undefined, expectedLabel: 'Bliv chefkok'},
        {desc: 'swap (with swapWith)',    swapWith: OTHER,     expectedLabel: 'Byt'}
    ])('shows trigger label "$expectedLabel" for $desc', async ({swapWith, expectedLabel}) => {
        const wrapper = await mountWith({swapWith})
        expect(findById(wrapper, TEST_IDS.trigger).text()).toContain(expectedLabel)
    })

    it('clicking the trigger opens the collapsible form', async () => {
        const wrapper = await mountWith()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)

        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()

        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(true)
    })

    it('volunteer flow: clicking save calls assignRoleToDinner and emits role-assigned', async () => {
        const wrapper = await mountWith()
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        await findById(wrapper, TEST_IDS.save).trigger('click')
        await nextTick()

        expect(claimRoleForMeMock).toHaveBeenCalledTimes(1)
        expect(claimRoleForMeMock).toHaveBeenCalledWith(dinner, TeamRole.CHEF)
        expect(wrapper.emitted('role-assigned')).toHaveLength(1)
    })

    it('swap flow does NOT call assignRoleToDinner (Phase 3 placeholder)', async () => {
        const wrapper = await mountWith({swapWith: OTHER})
        await findById(wrapper, TEST_IDS.trigger).trigger('click')
        await nextTick()
        await findById(wrapper, TEST_IDS.save).trigger('click')
        await nextTick()

        expect(claimRoleForMeMock).not.toHaveBeenCalled()
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

    it('renders nothing for past dinners (cannot volunteer in the past)', async () => {
        const pastDinner = {...dinner, id: dinner.id + 1, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {
            props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}
        })
        expect(findById(wrapper, TEST_IDS.trigger).exists()).toBe(false)
    })

    it('exposed open() is a no-op for past dinners', async () => {
        const pastDinner = {...dinner, id: dinner.id + 1, date: new Date(Date.now() - 24 * 60 * 60 * 1000)}
        const wrapper = await mountSuspended(RoleAssignment, {
            props: {dinnerEvent: pastDinner, role: TeamRole.CHEF}
        })
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

        await wrapper.setProps({dinnerEvent: {...dinner, id: dinner.id + 1}, role: TeamRole.CHEF})
        await flushPromises()
        await nextTick()
        expect(findById(wrapper, TEST_IDS.save).exists()).toBe(false)
    })
})
