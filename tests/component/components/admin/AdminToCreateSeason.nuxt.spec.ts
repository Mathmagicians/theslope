// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, resetStores} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import AdminToCreateSeason from '~/components/admin/AdminToCreateSeason.vue'

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

describe('AdminToCreateSeason', () => {

    const mount = (canEdit: boolean) => mountSuspended(AdminToCreateSeason, {props: {canEdit}})

    it('shows the create call-to-action to an editor', async () => {
        const wrapper = await mount(true)
        const cta = findByTestId(wrapper, PLANNING_TEST_IDS.createFirst)

        expect(cta.exists()).toBe(true)
        expect(cta.text()).toContain('Opret ny sæson')
        expect(wrapper.findComponent({name: 'UButton'}).props('to')).toBe('/admin/planning?mode=create')
    })

    it('hides the create call-to-action from a member', async () => {
        const wrapper = await mount(false)

        expect(findByTestId(wrapper, PLANNING_TEST_IDS.createFirst).exists()).toBe(false)
        expect(wrapper.text()).toContain('Her ser lidt tomt ud!')
    })
})
