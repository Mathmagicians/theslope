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
import {FORM_MODES, type FormMode} from '~/types/form'
import {COMPONENTS} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

const NAME = 'dinner-mode'
const {DINEIN, DINEINLATE, TAKEAWAY, NONE} = useBookingValidation().DinnerModeSchema.enum
// The modes in the app's order, the order the selector shows
const ALL = DINNER_MODE_ORDER
const EATING = ALL.filter(mode => mode !== NONE)
const labelsOf = (modes: DinnerMode[]) => modes.length > 0 ? modes.map(mode => MODE_WORDS[mode].label).join(', ') : 'nothing'

// The parent's v-model: an emitted mode comes back as the next modelValue, and a plan once touched is the person's own
// draft, as the booking form's and the grid's drafts do
const mountSelector = async (props: {interaction: 'toggle' | 'buttons', enabledModes: DinnerMode[], modelValue: DinnerMode, expected?: boolean, ghost?: boolean, formMode?: FormMode}) => {
    const wrapper = await mountSuspended(DinnerModeSelector, {
        props: {formMode: FORM_MODES.EDIT, ...props, name: NAME},
        attrs: {'onUpdate:modelValue': (value: DinnerMode) => wrapper.setProps({modelValue: value, expected: false})}
    })
    return wrapper
}
type Mounted = Awaited<ReturnType<typeof mountSelector>>

// The clicks on the toggle, settled one after another, and the modes they emitted
const clickToggle = async (wrapper: Mounted, clicks: number) => {
    for (let click = 0; click < clicks; click++) {
        await clickByTestId(wrapper, NAME)
        await flushPromises()
    }
    return emittedModes(wrapper)
}
const emittedModes = (wrapper: Mounted) => wrapper.emitted('update:modelValue')?.map(([mode]) => mode) ?? []
// The toggle's face: the colour and variant its button renders
const toggleFaceOf = (wrapper: Mounted) => {
    const {color, variant} = wrapper.findComponent({name: 'UButton'}).props()
    return {color, variant}
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

        expect(await clickToggle(wrapper, clicks)).toEqual(emits)
    })

    it('GIVEN no mode THEN the toggle renders disabled', async () => {
        const wrapper = await mountSelector({interaction: 'toggle', enabledModes: [], modelValue: NONE})

        expect(findByTestId(wrapper, NAME).attributes()).toHaveProperty('disabled')
    })

    // A wish on the waiting list is no booking: the toggle shows it as a ghost, and a click cycles as on any cell
    it('GIVEN the toggle on a wish (ghost) THEN it renders the ghost face, not the solid one, and a click still cycles', async () => {
        const onWish = (ghost: boolean) => mountSelector({interaction: 'toggle', enabledModes: [TAKEAWAY, NONE], modelValue: TAKEAWAY, ghost})
        const wish = await onWish(true)
        const solid = toggleFaceOf(await onWish(false))

        const {color, variant} = COMPONENTS.waitlist.ghostBadge
        expect(toggleFaceOf(wish)).toEqual({color, variant})
        expect(toggleFaceOf(wish)).not.toEqual(solid)
        expect(await clickToggle(wish, 1)).toEqual([NONE])
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

// A plan is the booking the preferences would make: a ghost until the person touches it, and the first touch adopts it
// as the person's own intent
describe('DinnerModeSelector on a plan', () => {
    const PLAN = TAKEAWAY
    const onPlan = (interaction: 'toggle' | 'buttons') => mountSelector({interaction, enabledModes: ALL, modelValue: PLAN, expected: true})

    // A grid cell without an order shows the plan on its view face: outlined on the waiting list's neutral, in the muted ink
    it('GIVEN a plan in view mode THEN its badge binds the expected token and its glyph the expected ink', async () => {
        const wrapper = await mountSelector({formMode: FORM_MODES.VIEW, interaction: 'toggle', enabledModes: ALL, modelValue: PLAN, expected: true})

        const {color, variant, ink} = COMPONENTS.bookingGrid.expectedBadge
        expect(wrapper.findComponent({name: 'UBadge'}).props()).toMatchObject({color, variant})
        expect(wrapper.findComponent({name: 'UIcon'}).classes()).toEqual(expect.arrayContaining(ink.split(' ')))
    })

    it('GIVEN the toggle on a plan THEN it renders the plan\'s ghost face', async () => {
        const planned = toggleFaceOf(await onPlan('toggle'))
        const solid = toggleFaceOf(await mountSelector({interaction: 'toggle', enabledModes: ALL, modelValue: PLAN}))

        const {color, variant} = COMPONENTS.bookingGrid.expectedBadge
        expect(planned).toEqual({color, variant})
        expect(planned).not.toEqual(solid)
    })

    it('GIVEN the toggle on a plan WHEN clicked twice THEN the first click adopts the plan and the second moves to the next mode', async () => {
        const wrapper = await onPlan('toggle')

        expect(await clickToggle(wrapper, 2)).toEqual([PLAN, NONE])
    })

    // A button's look: the colour and variant it renders
    const looksOf = (wrapper: Mounted) => Object.fromEntries(ALL.map(mode => {
        const button = wrapper.findAllComponents({name: 'UButton'}).find(candidate => candidate.attributes('data-testid') === `${NAME}-${mode}`)!
        return [mode, {color: button.props('color'), variant: button.props('variant')}]
    }))

    it('GIVEN the buttons on a plan THEN no button renders selected and the plan\'s button carries the planned token', async () => {
        const planned = looksOf(await onPlan('buttons'))
        // The same buttons with the plan's mode selected: its button selected, every other one not
        const selected = looksOf(await mountSelector({interaction: 'buttons', enabledModes: ALL, modelValue: PLAN}))
        const others = ALL.filter(mode => mode !== PLAN)

        const {color, variant} = COMPONENTS.dinnerModeSelector.plannedButton
        expect(planned[PLAN]).toEqual({color, variant})
        expect(planned[PLAN]).not.toEqual(selected[PLAN])
        expect(others.map(mode => planned[mode])).toEqual(others.map(mode => selected[mode]))
    })

    it.each([
        {which: 'the plan\'s', mode: PLAN},
        {which: 'another', mode: DINEIN}
    ])('GIVEN the buttons on a plan WHEN $which button is clicked THEN it emits that mode', async ({mode}) => {
        const wrapper = await onPlan('buttons')

        await clickByTestId(wrapper, `${NAME}-${mode}`)

        expect(emittedModes(wrapper)).toEqual([mode])
    })
})
