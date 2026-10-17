// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import AllergyDetailPanel from '~/components/allergy/AllergyDetailPanel.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {FORM_MODES} from '~/types/form'

// AllergyTypeCard reads the active season's ticket prices from the plan store - fake its HTTP (Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

// The next test's resetStores drops the datasets a still-mounted panel reads
enableAutoUnmount(afterEach)

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes
const CONFIRM_DELETE = 'confirm-delete'

// The portable detail region of the allergy catalog: the SAME
// component mounts beside the master on desktop and under the selected row on
// mobile, so its behavior is specced once, independent of the mount point.
const mountPanel = (props: Record<string, unknown> = {}) =>
    mountWithTooltipProvider(AllergyDetailPanel, {
        props: {
            allergyType: firstType,
            panelMode: FORM_MODES.VIEW,
            canEdit: true,
            ...props
        },
        isMd: false
    })

describe('AllergyDetailPanel', () => {
    beforeEach(() => {
        resetStores()
    })

    describe('view mode', () => {
        // The detail header carries the square pencil; form cards carry a labelled edit button
        it('renders the selected allergy, with the edit entry as the pencil with an accessible name', async () => {
            const wrapper = await mountPanel()

            expect(wrapper.text()).toContain(firstType!.name)
            expect(wrapper.text()).toContain('Detaljer')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).attributes('aria-label')).toBe('Rediger')
        })

        it.each([
            {control: 'edit', testId: ALLERGY_TEST_IDS.edit, event: 'edit'},
            {control: 'delete', testId: ALLERGY_TEST_IDS.delete, event: 'delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel()

            await clickByTestId(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })

        it('hides the edit and delete actions when canEdit is false', async () => {
            const wrapper = await mountPanel({canEdit: false})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.delete).exists()).toBe(false)
        })

        it('shows a placeholder when nothing is selected', async () => {
            const wrapper = await mountPanel({allergyType: undefined})

            expect(wrapper.text()).toContain('Vælg en allergi')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
        })
    })

    describe.each([
        {panelMode: FORM_MODES.EDIT, heading: 'Rediger allergi'},
        {panelMode: FORM_MODES.CREATE, heading: 'Opret allergi'}
    ])('$panelMode mode', ({panelMode, heading}) => {
        it('renders the form', async () => {
            const wrapper = await mountPanel({panelMode})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain(heading)
        })
    })

    describe('edit mode', () => {
        it('forwards save from the form with the allergy data', async () => {
            const wrapper = await mountPanel({panelMode: FORM_MODES.EDIT})

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.save)

            const emitted = wrapper.emitted('save')
            expect(emitted).toBeTruthy()
            expect(emitted![0]![0]).toMatchObject({name: firstType!.name})
        })
    })

    describe('confirm-delete mode', () => {
        it('names the allergy and the cascade to inhabitants', async () => {
            const wrapper = await mountPanel({panelMode: CONFIRM_DELETE})

            const confirmPanel = findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm)
            expect(confirmPanel.exists()).toBe(true)
            expect(confirmPanel.text()).toContain(firstType!.name)
            expect(confirmPanel.text()).toContain(String(firstType!.inhabitants!.length))
        })

        it.each([
            {control: 'cancel', testId: ALLERGY_TEST_IDS.cancelDelete, event: 'cancel-delete'},
            {control: 'confirm', testId: ALLERGY_TEST_IDS.confirmDelete, event: 'confirm-delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel({panelMode: CONFIRM_DELETE})

            await clickByTestId(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })
    })
})
