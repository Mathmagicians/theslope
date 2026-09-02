// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import AllergyDetailPanel from '~/components/allergy/AllergyDetailPanel.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes

// The portable detail region of the allergy catalog: the SAME
// component mounts beside the master on desktop and under the selected row on
// mobile, so its behavior is specced once, independent of the mount point.
const mountPanel = (props: Record<string, unknown> = {}) =>
    mountWithTooltipProvider(AllergyDetailPanel, {
        props: {
            allergyType: firstType,
            panelMode: 'view',
            canEdit: true,
            ...props
        },
        isMd: false
    })

describe('AllergyDetailPanel', () => {
    describe('view mode', () => {
        it('renders the selected allergy', async () => {
            const wrapper = await mountPanel()

            expect(wrapper.text()).toContain(firstType!.name)
            expect(wrapper.text()).toContain('Detaljer')
        })

        it.each([
            {control: 'edit', testId: ALLERGY_TEST_IDS.edit, event: 'edit'},
            {control: 'delete', testId: ALLERGY_TEST_IDS.delete, event: 'delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel()

            await clickByTestId(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })

        it.each([ALLERGY_TEST_IDS.edit, ALLERGY_TEST_IDS.delete])('hides %s when canEdit is false', async (testId) => {
            const wrapper = await mountPanel({canEdit: false})

            expect(findByTestId(wrapper, testId).exists()).toBe(false)
        })

        it('shows a placeholder when nothing is selected', async () => {
            const wrapper = await mountPanel({allergyType: undefined})

            expect(wrapper.text()).toContain('Vælg en allergi')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
        })
    })

    describe.each([
        {panelMode: 'edit', heading: 'Rediger allergi'},
        {panelMode: 'create', heading: 'Opret allergi'}
    ])('$panelMode mode', ({panelMode, heading}) => {
        it('renders the form', async () => {
            const wrapper = await mountPanel({panelMode})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain(heading)
        })
    })

    describe('edit mode', () => {
        it('forwards save from the form with the allergy data', async () => {
            const wrapper = await mountPanel({panelMode: 'edit'})

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.save)

            const emitted = wrapper.emitted('save')
            expect(emitted).toBeTruthy()
            expect(emitted![0]![0]).toMatchObject({name: firstType!.name})
        })
    })

    describe('confirm-delete mode', () => {
        it('names the allergy and the cascade to inhabitants', async () => {
            const wrapper = await mountPanel({panelMode: 'confirm-delete'})

            const confirmPanel = findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm)
            expect(confirmPanel.exists()).toBe(true)
            expect(confirmPanel.text()).toContain(firstType!.name)
            expect(confirmPanel.text()).toContain(String(firstType!.inhabitants!.length))
        })

        it.each([
            {control: 'cancel', testId: ALLERGY_TEST_IDS.cancelDelete, event: 'cancel-delete'},
            {control: 'confirm', testId: ALLERGY_TEST_IDS.confirmDelete, event: 'confirm-delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel({panelMode: 'confirm-delete'})

            await clickByTestId(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })
    })
})
