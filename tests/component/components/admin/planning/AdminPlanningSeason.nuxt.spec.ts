// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {nextTick} from 'vue'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import AdminPlanningSeason from '~/components/admin/planning/AdminPlanningSeason.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {FORM_MODES, type FormMode} from '~/types/form'

// The form reads its saving state from the real plan store; only HTTP is faked (testing.md Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

const season = {...SeasonFactory.defaultSeason('form'), id: 1}

const mount = async (mode: FormMode, canEdit = true) => {
    const wrapper = await mountSuspended(AdminPlanningSeason, {
        props: {modelValue: structuredClone(season), mode, canEdit}
    })
    await nextTick()
    return wrapper
}

describe('AdminPlanningSeason', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
    })

    it('renders the season form', async () => {
        const wrapper = await mount(FORM_MODES.VIEW)
        expect(wrapper.find('form#seasonForm').exists()).toBe(true)
    })

    describe('title', () => {
        it.each([FORM_MODES.VIEW, FORM_MODES.EDIT])('mode=%s names the season being shown', async (mode) => {
            const wrapper = await mount(mode)
            expect(wrapper.find('h2').text()).toContain(season.shortName)
        })

        // The title says what the form is doing; the edit control keeps the imperative "Rediger"
        it.each([
            {mode: FORM_MODES.EDIT, heading: 'Redigerer fællesspisning sæson'},
            {mode: FORM_MODES.CREATE, heading: 'Opret fællesspisning sæson'}
        ])('mode=$mode reads "$heading"', async ({mode, heading}) => {
            const wrapper = await mount(mode)
            expect(wrapper.find('h2').text()).toContain(heading)
        })

        it('carries the name instead of a read-only field', async () => {
            const wrapper = await mount(FORM_MODES.EDIT)
            expect(wrapper.find('input[name="shortName"]').exists()).toBe(false)
        })
    })

    describe('edit control', () => {
        const editCases = [
            {mode: FORM_MODES.VIEW, canEdit: true, expected: true},
            {mode: FORM_MODES.VIEW, canEdit: false, expected: false},
            {mode: FORM_MODES.EDIT, canEdit: true, expected: false},
            {mode: FORM_MODES.CREATE, canEdit: true, expected: false}
        ] as const

        it.each(editCases)('mode=$mode canEdit=$canEdit → edit control exists=$expected', async ({mode, canEdit, expected}) => {
            const wrapper = await mount(mode, canEdit)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(expected)
        })

        it('is labelled with the season it edits', async () => {
            const wrapper = await mount(FORM_MODES.VIEW)
            const label = findByTestId(wrapper, PLANNING_TEST_IDS.edit).text()
            expect(label.split(' ')[0]).toBe('Rediger')
            expect(label).toContain(season.shortName)
        })

        it('emits edit when it is clicked', async () => {
            const wrapper = await mount(FORM_MODES.VIEW)
            await clickByTestId(wrapper, PLANNING_TEST_IDS.edit)
            expect(wrapper.emitted('edit')).toBeTruthy()
        })
    })

    describe('footer', () => {
        const footerCases = [
            {mode: FORM_MODES.VIEW, expected: false},
            {mode: FORM_MODES.EDIT, expected: true},
            {mode: FORM_MODES.CREATE, expected: true}
        ] as const

        it.each(footerCases)('mode=$mode → footer buttons exist=$expected', async ({mode, expected}) => {
            const wrapper = await mount(mode)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).exists()).toBe(expected)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.cancel).exists()).toBe(expected)
        })

        it.each([FORM_MODES.EDIT, FORM_MODES.CREATE])('mode=%s labels the footer Annuller / Gem', async (mode) => {
            const wrapper = await mount(mode)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.cancel).text()).toBe('Annuller')
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).text()).toBe('Gem')
        })

        it('submits the form from the save button', async () => {
            const wrapper = await mount(FORM_MODES.EDIT)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).attributes('type')).toBe('submit')
        })

        it('emits cancel from the cancel button', async () => {
            const wrapper = await mount(FORM_MODES.EDIT)
            await clickByTestId(wrapper, PLANNING_TEST_IDS.cancel)
            expect(wrapper.emitted('cancel')).toBeTruthy()
        })
    })
})
