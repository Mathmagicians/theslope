// @vitest-environment nuxt
/**
 * DinnerModeSelector in edit mode offers a row's enabledModes: the toggle cycles to the next of them after the current
 * one, the buttons render a mode outside them disabled. Real component, real design system (testing.md Rule 6).
 */
import {describe, it, expect, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {useBookingValidation, type DinnerMode} from '~/composables/useBookingValidation'
import {DINNER_MODE_ORDER} from '~/composables/useBooking'
import {MODE_WORDS} from '~/composables/useBookingUi'
import {FORM_MODES} from '~/types/form'

enableAutoUnmount(afterEach)

const NAME = 'dinner-mode'
const {DINEIN, DINEINLATE, TAKEAWAY, NONE} = useBookingValidation().DinnerModeSchema.enum
// The modes in the app's order, the order the selector shows
const ALL = DINNER_MODE_ORDER
const EATING = ALL.filter(mode => mode !== NONE)
const labelsOf = (modes: DinnerMode[]) => modes.length > 0 ? modes.map(mode => MODE_WORDS[mode].label).join(', ') : 'nothing'

// The parent's v-model: an emitted mode comes back as the next modelValue, as the booking form's draft does
const mountSelector = async (props: {interaction: 'toggle' | 'buttons', enabledModes: DinnerMode[], modelValue: DinnerMode}) => {
    const wrapper = await mountSuspended(DinnerModeSelector, {
        props: {...props, formMode: FORM_MODES.EDIT, name: NAME},
        attrs: {'onUpdate:modelValue': (value: DinnerMode) => wrapper.setProps({modelValue: value})}
    })
    return wrapper
}

describe('DinnerModeSelector toggle', () => {
    const cases = [
        {enabledModes: ALL, current: DINEIN, emits: [DINEINLATE, TAKEAWAY, NONE, DINEIN]},
        {enabledModes: [DINEIN, NONE], current: DINEIN, emits: [NONE, DINEIN]},
        {enabledModes: [TAKEAWAY, NONE], current: TAKEAWAY, emits: [NONE, TAKEAWAY]},
        // A full round: Ingen never comes
        {enabledModes: EATING, current: TAKEAWAY, emits: [DINEIN, DINEINLATE, TAKEAWAY]},
        {enabledModes: [DINEIN], current: DINEIN, emits: []},
        {enabledModes: [], current: NONE, emits: []}
    ].map(({enabledModes, current, emits}) => ({
        enabledModes, current, emits,
        // A list that emits nothing is clicked twice: it stays put
        clicks: Math.max(emits.length, 2),
        desc: `GIVEN ${labelsOf(enabledModes)} on ${MODE_WORDS[current].label} WHEN clicked THEN it emits ${labelsOf(emits)}`
    }))

    it.each(cases)('$desc', async ({enabledModes, current, emits, clicks}) => {
        const wrapper = await mountSelector({interaction: 'toggle', enabledModes, modelValue: current})

        for (let click = 0; click < clicks; click++) {
            await clickByTestId(wrapper, NAME)
            await flushPromises()
        }

        expect(wrapper.emitted('update:modelValue')?.map(([mode]) => mode) ?? []).toEqual(emits)
    })

    it('GIVEN no mode THEN the toggle renders disabled', async () => {
        const wrapper = await mountSelector({interaction: 'toggle', enabledModes: [], modelValue: NONE})

        expect(findByTestId(wrapper, NAME).attributes()).toHaveProperty('disabled')
    })
})

describe('DinnerModeSelector buttons', () => {
    it('GIVEN Takeaway and Ingen THEN the button of every other mode renders disabled', async () => {
        const enabledModes: DinnerMode[] = [TAKEAWAY, NONE]
        const wrapper = await mountSelector({interaction: 'buttons', enabledModes, modelValue: TAKEAWAY})

        const disabledOf = (modes: DinnerMode[]) => Object.fromEntries(modes.map(mode => [mode, findByTestId(wrapper, `${NAME}-${mode}`).attributes('disabled') !== undefined]))
        expect(disabledOf(ALL)).toEqual(Object.fromEntries(ALL.map(mode => [mode, !enabledModes.includes(mode)])))
    })
})
