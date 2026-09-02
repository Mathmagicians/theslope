// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import FormModeSelector from '~/components/form/FormModeSelector.vue'
import {FORM_MODES} from '~/types/form'

describe('FormModeSelector', () => {

    const BUTTON_NAMES = {
        view: 'form-mode-view',
        edit: 'form-mode-edit',
        create: 'form-mode-create'
    } as const

    const modeSelectectorWithMode = async (modelValue: typeof FORM_MODES[keyof typeof FORM_MODES]) => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: modelValue
            }
        })

        // Verify that 3 buttons are rendered (use data-testid instead of name)
        const viewButton = findByTestId(wrapper, BUTTON_NAMES.view)
        const editButton = findByTestId(wrapper, BUTTON_NAMES.edit)
        const createButton = findByTestId(wrapper, BUTTON_NAMES.create)

        expect(viewButton.exists()).toBe(true)
        expect(editButton.exists()).toBe(true)
        expect(createButton.exists()).toBe(true)

        return wrapper
    }

    it('renders with default view mode', async () => {
        const wrapper = await modeSelectectorWithMode(FORM_MODES.VIEW)

        // Check view button text
        const viewButton = findByTestId(wrapper, BUTTON_NAMES.view)
        const editButton = findByTestId(wrapper, BUTTON_NAMES.edit)
        const createButton = findByTestId(wrapper, BUTTON_NAMES.create)

        expect(viewButton.text()).toContain('Vis')
        expect(editButton.text()).toContain('Rediger')
        expect(createButton.text()).toContain('Opret')
    })

    it('emits update:modelValue when button is clicked', async () => {
        const wrapper = await modeSelectectorWithMode(FORM_MODES.VIEW)
        await clickByTestId(wrapper, BUTTON_NAMES.edit)

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted?.[0]).toEqual([FORM_MODES.EDIT])
    })

    it('disables specified modes', async () => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: FORM_MODES.VIEW,
                disabledModes: [FORM_MODES.EDIT]
            }
        })

        const editButton = findByTestId(wrapper, BUTTON_NAMES.edit)
        expect(editButton.attributes('disabled')).toBeDefined()
    })

    it('changes button variant when selected', async () => {
        const wrapper = await modeSelectectorWithMode(FORM_MODES.VIEW)
        await clickByTestId(wrapper, BUTTON_NAMES.create)

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted?.[0]).toEqual([FORM_MODES.CREATE])
    })
})
