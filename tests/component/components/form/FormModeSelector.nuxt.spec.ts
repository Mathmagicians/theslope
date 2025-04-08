// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import FormModeSelector from '~/components/form/FormModeSelector.vue'
import {FORM_MODES} from '~/types/form'


describe('FormModeSelector', () => {
    it('renders with default view mode', async () => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: FORM_MODES.VIEW
            }
        })

        const buttons = wrapper.findAllComponents('Button')
        expect(buttons).toHaveLength(3)

        // Check view button (should be active and solid)
        const viewButton = buttons
            .find(button => button.text().includes('Vis'))
        expect(viewButton).toBeDefined()
        expect(viewButton?.attributes('value')).toBe('view')
        expect(viewButton?.props('variant')).toBe('solid')
        expect(viewButton?.props('disabled')).toBe(false)

        const otherButtons = buttons.filter(button =>
            !button.text().includes('Vis')
        )
        expect(otherButtons).toHaveLength(2)
        otherButtons.forEach(button => {
            expect(button).toBeDefined()
            expect(button?.attributes('value')).not.toBe('view')
            expect(button?.props('variant')).toBe('outline')
            expect(button?.props('disabled')).toBe(false)
        })
    })

    it('emits update:modelValue when button is clicked', async () => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: FORM_MODES.VIEW
            }
        })

        const editButton = wrapper.findAllComponents('Button')
            .find(button => button.text().includes('Rediger'))
        await editButton?.trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([FORM_MODES.EDIT])
    })

    it('disables specified modes', async () => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: FORM_MODES.VIEW,
                disabledModes: [FORM_MODES.EDIT]
            }
        })

        const editButton = wrapper.findAllComponents('Button')
            .find(button => button.text().includes('Rediger'))
        expect(editButton?.props('disabled')).toBe(true)
    })

    it('changes button variant when selected', async () => {
        const wrapper = await mountSuspended(FormModeSelector, {
            props: {
                modelValue: FORM_MODES.VIEW
            }
        })

        const createButton = wrapper.findAllComponents('Button')
            .find(button => button.text().includes('Opret'))
        expect(createButton?.props('variant')).toBe('outline')

        await createButton?.trigger('click')
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([FORM_MODES.CREATE])
    })
})
