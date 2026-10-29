// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {findByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import AdminPlanningSeason from '~/components/admin/planning/AdminPlanningSeason.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {FORM_MODES, type FormMode} from '~/types/form'
import {computeCookingDates} from '~/utils/season'
import {BUTTON_WORDS} from '~/config/buttonWords'

// The form reads its saving state from the real plan store; only HTTP is faked (testing.md Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

// The next test's resetStores drops the datasets a still-mounted form reads
enableAutoUnmount(afterEach)

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
        resetStores()
    })

    it('mode=view renders the season form named by the season, counts the cooking days it scaffolds, offers an edit control labelled with the season that emits edit, and no footer', async () => {
        const wrapper = await mount(FORM_MODES.VIEW)
        expect(wrapper.find('form#seasonForm').exists()).toBe(true)
        expect(wrapper.find('h2').text()).toContain(season.shortName)

        const expected = computeCookingDates(season.cookingDays, season.seasonDates, season.holidays).length
        expect(expected).toBeGreaterThan(0)
        const counter = findByTestId(wrapper, PLANNING_TEST_IDS.cookingDayCount)
        expect(counter.text()).toContain(String(expected))
        expect(counter.text()).toContain('Madlavningsdage')

        expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).exists()).toBe(false)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.cancel).exists()).toBe(false)

        // The edit control keeps the imperative "Rediger"
        const label = findByTestId(wrapper, PLANNING_TEST_IDS.edit).text()
        expect(label.split(' ')[0]).toBe(BUTTON_WORDS.edit)
        expect(label).toContain(season.shortName)
        await clickByTestId(wrapper, PLANNING_TEST_IDS.edit)
        expect(wrapper.emitted('edit')).toBeTruthy()
    })

    it('mode=view without canEdit offers no edit control', async () => {
        const wrapper = await mount(FORM_MODES.VIEW, false)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(false)
    })

    // The title says what the form is doing
    it('mode=edit titles the season it edits instead of a read-only name field, offers no edit control, and a footer Annuller / Gem that cancels and submits', async () => {
        const wrapper = await mount(FORM_MODES.EDIT)
        expect(wrapper.find('h2').text()).toContain('Redigerer fællesspisning sæson')
        expect(wrapper.find('h2').text()).toContain(season.shortName)
        expect(wrapper.find('input[name="shortName"]').exists()).toBe(false)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.edit).exists()).toBe(false)

        expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).text()).toBe(BUTTON_WORDS.save)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.submit).attributes('type')).toBe('submit')
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.cancel).text()).toBe(BUTTON_WORDS.cancel)
        await clickByTestId(wrapper, PLANNING_TEST_IDS.cancel)
        expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('mode=create reads "Opretter fællesspisning sæson"', async () => {
        const wrapper = await mount(FORM_MODES.CREATE)
        expect(wrapper.find('h2').text()).toContain('Opretter fællesspisning sæson')
    })
})
