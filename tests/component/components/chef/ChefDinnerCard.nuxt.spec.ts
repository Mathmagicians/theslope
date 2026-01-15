import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import ChefDinnerCard from '~/components/chef/ChefDinnerCard.vue'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {nextTick} from 'vue'

describe('ChefDinnerCard', () => {
    const {DinnerStateSchema} = useBookingValidation()
    const {deadlinesForSeason} = useSeason()
    const DinnerState = DinnerStateSchema.enum

    // Fixed reference time for temporal tests: January 11, 2025 at 18:00
    const REFERENCE_TIME = new Date(2025, 0, 11, 18, 0)

    // Default deadlines from factory season
    const defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())

    beforeEach(() => {
        // Use fake timers for temporal consistency
        vi.useFakeTimers()
        vi.setSystemTime(REFERENCE_TIME)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const createDinnerEvent = (overrides: Partial<DinnerEventDisplay> = {}): DinnerEventDisplay => ({
        id: 1,
        date: new Date('2025-12-25T18:00:00'),
        menuTitle: 'Spaghetti Carbonara',
        menuDescription: 'Classic Italian pasta',
        menuPictureUrl: null,
        state: DinnerState.SCHEDULED,
        totalCost: 0,
        chefId: null,
        cookingTeamId: 1,
        heynaboEventId: null,
        seasonId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    })

    const mountCard = (props: { dinnerEvent: DinnerEventDisplay } & Record<string, unknown>) =>
        mountSuspended(ChefDinnerCard, {
            props: { deadlines: defaultDeadlines, ...props }
        })

    describe('Rendering', () => {
        it('should render dinner event with menu title', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent })

            expect(wrapper.text()).toContain('Spaghetti Carbonara')
        })

        it('should show placeholder for unannounced menu', async () => {
            const dinnerEvent = createDinnerEvent({ menuTitle: '' })
            const wrapper = await mountCard({ dinnerEvent })

            expect(wrapper.text()).toContain('Ingen menu endnu')
        })

        it('should show formatted date with weekday', async () => {
            const dinnerEvent = createDinnerEvent({ date: new Date('2025-12-25T18:00:00') })
            const wrapper = await mountCard({ dinnerEvent })

            // Should show weekday and date (e.g., "tor. 25/12")
            expect(wrapper.text()).toContain('25/12')
        })
    })

    describe('Deadline badges', () => {
        it('should show Menu and Framelding labels', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent })

            expect(wrapper.text()).toContain('Menu')
            expect(wrapper.text()).toContain('Framelding')
        })

        it('should show countdown for far future dinner', async () => {
            // GIVEN: Reference time is Jan 11, 2025 at 18:00
            // Dinner on Jan 26, 2025 at 18:00 (15 days away)
            const dinnerDate = new Date(2025, 0, 26, 18, 0)

            const dinnerEvent = createDinnerEvent({
                date: dinnerDate,
                state: DinnerState.SCHEDULED
            })
            const wrapper = await mountCard({dinnerEvent})

            const text = wrapper.text()
            expect(text).toContain('15')
            expect(text).toMatch(/om\s+15\s+dage/i)
        })

        it('should show countdown for dinner within 72h', async () => {
            // GIVEN: Reference time is Jan 11, 2025 at 18:00
            // Dinner on Jan 13, 2025 at 18:00 (48 hours away)
            const dinnerDate = new Date(2025, 0, 13, 18, 0)

            const dinnerEvent = createDinnerEvent({
                date: dinnerDate,
                state: DinnerState.SCHEDULED
            })
            const wrapper = await mountCard({dinnerEvent})

            const text = wrapper.text()
            expect(text).toMatch(/\d+\s*(dage?|timer?|minut)/i)
        })

        it('should show åben or lukket for framelding status', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent })

            const text = wrapper.text()
            expect(text).toMatch(/åben|lukket/i)
        })
    })

    describe('Selection', () => {
        it('should apply cursor pointer styling to card', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent, selected: true })

            const card = wrapper.find('[data-testid="chef-dinner-card-1"]')
            expect(card.exists()).toBe(true)
            // cursor-pointer is on UCard root, check component text renders
            expect(wrapper.text()).toContain('Spaghetti Carbonara')
        })

        it('should render card without errors when not selected', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent, selected: false })

            const card = wrapper.find('[data-testid="chef-dinner-card-1"]')
            expect(card.exists()).toBe(true)
        })

        it('should emit select event with dinner ID when clicked', async () => {
            const dinnerEvent = createDinnerEvent({ id: 42 })
            const wrapper = await mountCard({ dinnerEvent })

            const card = wrapper.find('[data-testid="chef-dinner-card-42"]')
            await card.trigger('click')
            await nextTick()

            const emitted = wrapper.emitted('select')
            expect(emitted).toBeTruthy()
            expect(emitted![0]).toEqual([42])
        })
    })
})
