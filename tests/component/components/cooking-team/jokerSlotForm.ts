import {flushPromises} from '@vue/test-utils'
import {nextTick} from 'vue'
import {findByTestId, type clickByTestId} from '~~/tests/component/testHelpers'

type Searchable = Parameters<typeof clickByTestId>[0]

/** The joker slot test-id contract, shared by the form and the team card specs */
export const JOKER_SLOT_IDS = {
    form: 'joker-slot-form',
    add: 'joker-slot-add',
    delete: (slotId: number) => `joker-slot-delete-${slotId}`,
    submit: 'joker-slot-submit',
    cancel: 'joker-slot-cancel',
    roleSelect: 'joker-slot-role-select'
} as const

/** Ticks the first weekday checkbox the form shows */
export const tickFirstWeekday = async (wrapper: Searchable) => {
    await findByTestId(wrapper, JOKER_SLOT_IDS.form).find('[role="checkbox"]').trigger('click')
    await nextTick()
}

/** Opret validates through the form schema before it emits */
export const submitJokerSlotForm = async (wrapper: Searchable) => {
    await findByTestId(wrapper, JOKER_SLOT_IDS.submit).trigger('click')
    await flushPromises()
    await nextTick()
}
