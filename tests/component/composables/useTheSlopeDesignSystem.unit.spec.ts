import {describe, it, expect} from 'vitest'
import {getRandomEmptyMessage, EMPTY_STATE_MESSAGES} from '~/composables/useTheSlopeDesignSystem'

const contexts = Object.keys(EMPTY_STATE_MESSAGES) as Array<keyof typeof EMPTY_STATE_MESSAGES>

describe('getRandomEmptyMessage', () => {
    // Danish evening: the local date (UTC+2) is already the 20th while UTC is still the 19th —
    // the seed must follow UTC so an SSR render (UTC server) and the browser pick the same message
    const danishEveningInstant = new Date('2026-08-19T22:30:00Z')
    const sameUtcDayMorning = new Date('2026-08-19T06:00:00Z')
    const utcSeed = 20260819

    it.each(contexts)('%s: seeds by UTC date, independent of the runtime timezone', (context) => {
        const expectedMessage = EMPTY_STATE_MESSAGES[context][utcSeed % EMPTY_STATE_MESSAGES[context].length]
        expect(getRandomEmptyMessage(context, danishEveningInstant)).toBe(expectedMessage)
    })

    it.each(contexts)('%s: every render on the same UTC day picks the same message', (context) => {
        expect(getRandomEmptyMessage(context, sameUtcDayMorning))
            .toBe(getRandomEmptyMessage(context, danishEveningInstant))
    })
})
