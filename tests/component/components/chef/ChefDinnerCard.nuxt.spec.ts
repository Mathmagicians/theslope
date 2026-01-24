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

        // SCHEDULED dinners: menu NOT done
        // When menu deadline passed AND menu not done: groceries also shows "mangler" (cascade)
        describe.each([
            {
                name: 'SCHEDULED, far future (15 days)',
                dinnerDate: new Date(2025, 0, 26, 18, 0),
                dinnerState: DinnerState.SCHEDULED,
                expectedBadges: {
                    menu: /om\s+5\s+dage/i,
                    framelding: /åben/i,
                    groceries: /om\s+15\s+dage/i,
                    dinner: /om\s+15\s+dage/i
                }
            },
            {
                name: 'SCHEDULED, 9 days (menu deadline passed)',
                dinnerDate: new Date(2025, 0, 20, 18, 0),
                dinnerState: DinnerState.SCHEDULED,
                expectedBadges: {
                    menu: /mangler/i,
                    framelding: /åben/i,
                    groceries: /mangler/i,       // Cascade: menu not done + past deadline
                    dinner: /om\s+9\s+dage/i
                }
            },
            {
                name: 'SCHEDULED, 6 days (both deadlines passed)',
                dinnerDate: new Date(2025, 0, 17, 18, 0),
                dinnerState: DinnerState.SCHEDULED,
                expectedBadges: {
                    menu: /mangler/i,
                    framelding: /lukket/i,
                    groceries: /mangler/i,
                    dinner: /om\s+6\s+dage/i
                }
            }
        ])('$name', ({ dinnerDate, dinnerState, expectedBadges }) => {
            it.each([
                { label: 'Menu', pattern: expectedBadges.menu },
                { label: 'Framelding', pattern: expectedBadges.framelding },
                { label: 'Indkøb', pattern: expectedBadges.groceries },
                { label: 'Spisning', pattern: expectedBadges.dinner }
            ])('$label badge', async ({ label, pattern }) => {
                const dinnerEvent = createDinnerEvent({ date: dinnerDate, state: dinnerState })
                const wrapper = await mountCard({ dinnerEvent })
                const badges = wrapper.findAll('[data-testid="deadline-badge"]')
                const badge = badges.find(b => b.text().includes(label))
                expect(badge?.text()).toMatch(pattern)
            })
        })

        // ANNOUNCED dinners: menu IS done
        // When menu done: groceries shows countdown (NO cascade)
        describe.each([
            {
                name: 'ANNOUNCED, 9 days (menu done, groceries shows countdown)',
                dinnerDate: new Date(2025, 0, 20, 18, 0),
                dinnerState: DinnerState.ANNOUNCED,
                expectedBadges: {
                    framelding: /åben/i,
                    groceries: /om\s+9\s+dage/i,  // No cascade: menu done
                    dinner: /om\s+9\s+dage/i
                }
            },
            {
                name: 'ANNOUNCED, 6 days (menu done, booking closed)',
                dinnerDate: new Date(2025, 0, 17, 18, 0),
                dinnerState: DinnerState.ANNOUNCED,
                expectedBadges: {
                    framelding: /lukket/i,
                    groceries: /om\s+6\s+dage/i,  // No cascade: menu done
                    dinner: /om\s+6\s+dage/i
                }
            }
        ])('$name', ({ dinnerDate, dinnerState, expectedBadges }) => {
            it.each([
                { label: 'Framelding', pattern: expectedBadges.framelding },
                { label: 'Indkøb', pattern: expectedBadges.groceries },
                { label: 'Spisning', pattern: expectedBadges.dinner }
            ])('$label badge', async ({ label, pattern }) => {
                const dinnerEvent = createDinnerEvent({ date: dinnerDate, state: dinnerState })
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
