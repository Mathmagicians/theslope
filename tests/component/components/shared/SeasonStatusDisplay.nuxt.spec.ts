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

        it.each([
            {seasonId: 2, event: 'activate', buttonTestId: 'activate-season'},
            {seasonId: 1, event: 'deactivate', buttonTestId: 'deactivate-season'}
        ])('seasonId=$seasonId emits $event on click', async ({seasonId, event, buttonTestId}) => {
            const wrapper = await mount({seasonId, showActivationButton: true})
            await nextTick()
            await wrapper.find(`[data-testid="${buttonTestId}"]`).trigger('click')
            expect(wrapper.emitted(event)).toBeTruthy()
        })
    })

    it('handles null seasonId', async () => {
        const wrapper = await mount({seasonId: null})
        expect(wrapper.exists()).toBe(true)
    })
})
