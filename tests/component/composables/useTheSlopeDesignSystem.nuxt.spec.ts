// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {getResidencyDisplay} from '~/composables/useTheSlopeDesignSystem'
import {formatDate} from '~/utils/date'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'
import {ResidencyStatus} from '~/composables/useHousehold'

// getResidencyDisplay reads the residency status and the date format through auto-imports
describe('getResidencyDisplay', () => {
    const now = new Date(2026, 2, 1)
    const longAgo = new Date(2020, 0, 1)
    const lastMonth = new Date(2026, 1, 1)
    const nextMonth = new Date(2026, 3, 1)

    it.each([
        {status: ResidencyStatus.pending, movedIn: nextMonth, moveOut: null, date: nextMonth},
        {status: ResidencyStatus.leaving, movedIn: longAgo, moveOut: nextMonth, date: nextMonth},
        {status: ResidencyStatus['moved-out'], movedIn: longAgo, moveOut: lastMonth, date: lastMonth}
    ] as const)('a $status household reads its words beside its date', ({status, movedIn, moveOut, date}) => {
        const words = HOUSEHOLD_WORDS.residency.status[status]
        const dateText = `${words.description} ${formatDate(date)}`

        expect(getResidencyDisplay(movedIn, moveOut, now)).toMatchObject({
            prefix: words.prefix,
            dateText,
            badgeText: `${words.prefix} ${formatDate(date)}`,
            alertTitle: HOUSEHOLD_WORDS.residency.alert.title,
            alertDescription: HOUSEHOLD_WORDS.residency.alert.description(dateText)
        })
    })

    it('an active household shows no residency', () => {
        expect(getResidencyDisplay(longAgo, null, now)).toBeNull()
    })
})
