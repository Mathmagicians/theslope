// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {nextTick} from 'vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId, pollFor} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import AdminPlanning from '~/components/admin/AdminPlanning.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {usePlanStore} from '~/stores/plan'
import {useAuthStore} from '~/stores/auth'
import {FORM_MODES} from '~/types/form'

// The test environment has no router to navigate: useEntityFormManager writes ?mode=
// through navigateTo (ADR-006 / ADR-008), which is what this spec asserts on
const {mockNavigateTo} = vi.hoisted(() => ({mockNavigateTo: vi.fn()}))
mockNuxtImport('navigateTo', () => mockNavigateTo)

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last.
// The session drives isAdmin on the auth store and disabledModes on the plan store.
const season = {...SeasonFactory.defaultSeason('planning'), id: 1}
const seasonsEndpoint = vi.fn()
const sessionEndpoint = vi.fn()
registerEndpoint('/api/_auth/session', sessionEndpoint)
registerEndpoint('/api/admin/season/active', () => 1)
registerEndpoint('/api/admin/season/1', () => season)
registerEndpoint('/api/admin/season', seasonsEndpoint)

// Container spec: every test mounts the whole planning card with the real plan store
vi.setConfig({testTimeout: 20_000})

const mountPlanning = async (props: Record<string, unknown> = {}) => {
    await useAuthStore().fetch()
    const store = usePlanStore()
    await store.loadSeasons()
    store.initPlanStore()
    await pollFor(() => store.isPlanStoreReady, 40, false)

    const wrapper = await mountWithTooltipProvider(AdminPlanning, {props: {canEdit: true, ...props}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

const lastModeQuery = () => {
    const call = mockNavigateTo.mock.calls.at(-1)
    return (call?.[0] as {query?: {mode?: string}})?.query?.mode
}

describe('AdminPlanning', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        sessionEndpoint.mockReturnValue({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: ['ADMIN']}})
        seasonsEndpoint.mockReturnValue([season])
    })

    describe('header controls', () => {
        it('shows the create action and no form-mode selector for an admin', async () => {
            const wrapper = await mountPlanning()
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.create).exists()).toBe(true)
            expect(findByTestId(wrapper, 'form-mode-edit').exists()).toBe(false)
        })

        it('shows the pencil and no save button in view mode', async () => {
            const wrapper = await mountPlanning()
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(true)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).exists()).toBe(false)
        })

        it('shows neither create nor edit control for a member', async () => {
            sessionEndpoint.mockReturnValue({user: {id: 2, email: 'member@skraaningen.dk', systemRoles: []}})
            const wrapper = await mountPlanning({canEdit: false})
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.create).exists()).toBe(false)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(false)
        })

        it('offers create but no pencil when no season exists', async () => {
            seasonsEndpoint.mockReturnValue([])
            const wrapper = await mountPlanning()
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.create).exists()).toBe(true)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(false)
        })
    })

    describe('mode transitions', () => {
        it('opens the form in edit mode from the pencil', async () => {
            const wrapper = await mountPlanning()
            await clickByTestId(wrapper, PLANNING_TEST_IDS.edit)
            await flushPromises()

            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).exists()).toBe(true)
            expect(lastModeQuery()).toBe(FORM_MODES.EDIT)
        })

        it('returns to view mode from cancel', async () => {
            const wrapper = await mountPlanning()
            await clickByTestId(wrapper, PLANNING_TEST_IDS.edit)
            await flushPromises()
            await clickByTestId(wrapper, PLANNING_TEST_IDS.cancel)
            await flushPromises()

            expect(lastModeQuery()).toBe(FORM_MODES.VIEW)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(true)
        })

        it('opens the form in create mode from the create action', async () => {
            const wrapper = await mountPlanning()
            await clickByTestId(wrapper, PLANNING_TEST_IDS.create)
            await flushPromises()

            expect(lastModeQuery()).toBe(FORM_MODES.CREATE)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).exists()).toBe(true)
        })
    })
})
