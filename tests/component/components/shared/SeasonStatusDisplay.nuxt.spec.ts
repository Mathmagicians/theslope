// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {findByTestId, pollFor} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import SeasonStatusDisplay from '~/components/shared/SeasonStatusDisplay.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {usePlanStore} from '~/stores/plan'
import {nextTick} from 'vue'

// Test seasons - active (id=1) and inactive (id=2); the component reads them from the real store
const activeSeason = {...SeasonFactory.defaultSeason('active'), id: 1, isActive: true}
const inactiveSeason = {...SeasonFactory.defaultSeason('inactive'), id: 2, isActive: false}

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last
registerEndpoint('/api/admin/season/active', () => activeSeason.id)
registerEndpoint('/api/admin/season/1', () => activeSeason)
registerEndpoint('/api/admin/season/2', () => inactiveSeason)
registerEndpoint('/api/admin/season', () => [activeSeason, inactiveSeason])

describe('SeasonStatusDisplay', () => {

    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
    })

    const mount = async (props: {seasonId: number | null, showActivationButton?: boolean}) => {
        const store = usePlanStore()
        await store.loadSeasons()
        // the activate control renders :loading/:disabled while the store is still fetching
        await pollFor(() => !store.isActivatingSeasonFlowInProgress)
        const wrapper = await mountSuspended(SeasonStatusDisplay, {props})
        await nextTick()
        return wrapper
    }

    describe('status display', () => {
        it.each([
            {seasonId: 1, expectedText: 'Aktiv'},
            {seasonId: 2, expectedText: 'sæson'}
        ])('seasonId=$seasonId shows "$expectedText"', async ({seasonId, expectedText}) => {
            const wrapper = await mount({seasonId})
            expect(wrapper.text()).toContain(expectedText)
        })
    })

    describe('activation button', () => {
        it.each([
            {seasonId: 2, showButton: false, buttonTestId: PLANNING_TEST_IDS.activate, shouldExist: false},
            {seasonId: 2, showButton: true, buttonTestId: PLANNING_TEST_IDS.activate, shouldExist: true},
            {seasonId: 1, showButton: true, buttonTestId: PLANNING_TEST_IDS.deactivate, shouldExist: true}
        ])('seasonId=$seasonId showButton=$showButton → $buttonTestId exists=$shouldExist', async ({seasonId, showButton, buttonTestId, shouldExist}) => {
            const wrapper = await mount({seasonId, showActivationButton: showButton})
            expect(findByTestId(wrapper, buttonTestId).exists()).toBe(shouldExist)
        })

        it('seasonId=2 shows the activate label and emits activate on click', async () => {
            const wrapper = await mount({seasonId: 2, showActivationButton: true})
            const activateButton = findByTestId(wrapper, PLANNING_TEST_IDS.activate)

            expect(activateButton.text()).toContain('Aktiver Sæson')

            await activateButton.trigger('click')
            expect(wrapper.emitted('activate')).toBeTruthy()
        })

        it('seasonId=1 emits deactivate on double-click (DangerButton confirm)', async () => {
            const wrapper = await mount({seasonId: 1, showActivationButton: true})
            // DangerButton wraps UButton - find the actual button element inside
            const button = findByTestId(wrapper, PLANNING_TEST_IDS.deactivate).find('button')
            // DangerButton requires 2 clicks: first to arm, second to confirm
            await button.trigger('click')
            await nextTick()
            await button.trigger('click')
            await nextTick()
            expect(wrapper.emitted('deactivate')).toBeTruthy()
        })
    })

    it('handles null seasonId', async () => {
        const wrapper = await mount({seasonId: null})
        expect(wrapper.exists()).toBe(true)
    })
})
