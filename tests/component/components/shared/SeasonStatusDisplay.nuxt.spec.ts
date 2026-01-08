// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import SeasonStatusDisplay from '~/components/shared/SeasonStatusDisplay.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {nextTick} from 'vue'

// Test seasons - active (id=1) and inactive (id=2)
const activeSeason = {...SeasonFactory.defaultSeason('active'), id: 1, isActive: true}
const inactiveSeason = {...SeasonFactory.defaultSeason('inactive'), id: 2, isActive: false}

// Mock usePlanStore - component looks up season by ID from store.seasons
mockNuxtImport('usePlanStore', () => () => ({
    seasons: [activeSeason, inactiveSeason],
    isActivatingSeasonFlowInProgress: false
}))

describe('SeasonStatusDisplay', () => {

    const mount = (props: {seasonId: number | null, showActivationButton?: boolean}) => mountSuspended(SeasonStatusDisplay, {props})

    describe('status display', () => {
        it.each([
            {seasonId: 1, expectedText: 'Aktiv'},
            {seasonId: 2, expectedText: 'sæson'}
        ])('seasonId=$seasonId shows "$expectedText"', async ({seasonId, expectedText}) => {
            const wrapper = await mount({seasonId})
            await nextTick()
            expect(wrapper.text()).toContain(expectedText)
        })
    })

    describe('activation button', () => {
        it.each([
            {seasonId: 2, showButton: false, buttonTestId: 'activate-season', shouldExist: false},
            {seasonId: 2, showButton: true, buttonTestId: 'activate-season', shouldExist: true},
            {seasonId: 1, showButton: true, buttonTestId: 'deactivate-season', shouldExist: true}
        ])('seasonId=$seasonId showButton=$showButton → $buttonTestId exists=$shouldExist', async ({seasonId, showButton, buttonTestId, shouldExist}) => {
            const wrapper = await mount({seasonId, showActivationButton: showButton})
            await nextTick()
            expect(wrapper.find(`[data-testid="${buttonTestId}"]`).exists()).toBe(shouldExist)
        })

        it('seasonId=2 emits activate on click', async () => {
            const wrapper = await mount({seasonId: 2, showActivationButton: true})
            await nextTick()
            await wrapper.find('[data-testid="activate-season"]').trigger('click')
            expect(wrapper.emitted('activate')).toBeTruthy()
        })

        it('seasonId=1 emits deactivate on double-click (DangerButton confirm)', async () => {
            const wrapper = await mount({seasonId: 1, showActivationButton: true})
            await nextTick()
            // DangerButton wraps UButton - find the actual button element inside
            const dangerButton = wrapper.find('[data-testid="deactivate-season"]')
            const button = dangerButton.find('button')
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
