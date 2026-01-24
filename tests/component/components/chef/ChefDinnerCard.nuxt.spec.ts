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

        it('should show åben or lukket for framelding status', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountCard({ dinnerEvent })

            const text = wrapper.text()
            expect(text).toMatch(/åben|lukket/i)
        })

        // Each badge shows deadline-specific countdown OR "mangler" when past deadline
        // Menu deadline: dinner - 10 days, Booking deadline: dinner - 8 days
        // When menu deadline passed: ALL user-action badges (Menu, Groceries) show "mangler"
        describe.each([
            {
                name: 'far future (15 days): all deadlines ahead',
                dinnerDate: new Date(2025, 0, 26, 18, 0), // Jan 26, 18:00
                expectedBadges: {
                    menu: /om\s+5\s+dage/i,           // Menu deadline: Jan 16, 5 days away
                    framelding: /åben/i,              // Booking open (before deadline)
                    groceries: /om\s+15\s+dage/i,     // Groceries deadline: dinner time
                    dinner: /om\s+15\s+dage/i         // Dinner countdown
                }
            },
            {
                name: '9 days: menu deadline passed',
                dinnerDate: new Date(2025, 0, 20, 18, 0), // Jan 20, 18:00
                expectedBadges: {
                    menu: /mangler/i,                 // Menu deadline Jan 10 passed → mangler
                    framelding: /åben/i,              // Booking still open
                    groceries: /mangler/i,            // Also mangler (chef actions cascade)
                    dinner: /om\s+9\s+dage/i          // Dinner countdown (countdownOnly)
                }
            },
            {
                name: '6 days: menu + booking deadline passed',
                dinnerDate: new Date(2025, 0, 17, 18, 0), // Jan 17, 18:00
                expectedBadges: {
                    menu: /mangler/i,                 // Menu deadline passed
                    framelding: /lukket/i,            // Booking closed
                    groceries: /mangler/i,            // Chef actions cascade
                    dinner: /om\s+6\s+dage/i          // Dinner countdown
                }
            },
            {
                name: '48 hours: imminent dinner',
                dinnerDate: new Date(2025, 0, 13, 18, 0), // Jan 13, 18:00
                expectedBadges: {
                    menu: /mangler/i,
                    framelding: /lukket/i,
                    groceries: /mangler/i,
                    dinner: /om\s+(2\s+dage|48\s+timer)/i
                }
            }
        ])('$name', ({ dinnerDate, expectedBadges }) => {
            it.each([
                { label: 'Menu', pattern: expectedBadges.menu },
                { label: 'Framelding', pattern: expectedBadges.framelding },
                { label: 'Indkøb', pattern: expectedBadges.groceries },
                { label: 'Spisning', pattern: expectedBadges.dinner }
            ])('$label badge', async ({ label, pattern }) => {
                const dinnerEvent = createDinnerEvent({ date: dinnerDate, state: DinnerState.SCHEDULED })
                const wrapper = await mountCard({ dinnerEvent })

                const badges = wrapper.findAll('[data-testid="deadline-badge"]')
                const badge = badges.find(b => b.text().includes(label))
                expect(badge?.text()).toMatch(pattern)
            })
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
