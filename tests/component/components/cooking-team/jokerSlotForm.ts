import {flushPromises} from '@vue/test-utils'
import {nextTick} from 'vue'
import {findByTestId, type clickByTestId} from '~~/tests/component/testHelpers'
import {JOKER_SLOT_IDS} from '~~/tests/component/components/cooking-team/jokerSlotIds'

export {JOKER_SLOT_IDS}

type Searchable = Parameters<typeof clickByTestId>[0]

/** Toggles every weekday checkbox the form shows */
export const toggleEveryWeekday = async (wrapper: Searchable) => {
    for (const weekday of findByTestId(wrapper, JOKER_SLOT_IDS.form).findAll('[role="checkbox"]')) {
        await weekday.trigger('click')
    }
    await nextTick()
}

/** Tilføj validates through the form schema before it emits */
export const submitJokerSlotForm = async (wrapper: Searchable) => {
    await findByTestId(wrapper, JOKER_SLOT_IDS.submit).trigger('click')
    await flushPromises()
    await nextTick()
}
