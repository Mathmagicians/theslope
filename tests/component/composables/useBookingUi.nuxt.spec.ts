// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {addDays} from 'date-fns'
import {useBookingUi, STEP_ICONS, createBookingBadge, createDiningModeBadge, createBookingBadges} from '~/composables/useBookingUi'
import {DINNER_STEP_MAP, DinnerStepState, DEADLINE_LABELS, type ReleasedTicketCounts} from '~/composables/useBooking'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum
const {ICONS} = useTheSlopeDesignSystem()
const {deadlinesForSeason} = useSeason()
const deadlines = deadlinesForSeason(SeasonFactory.defaultSeason())

// Far enough ahead that every deadline is still open
const FAR_FUTURE_DAYS = useAppConfig().theslope.defaultSeason.ticketIsCancellableDaysBefore + 20
const farFutureDinner = (overrides = {}) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), FAR_FUTURE_DAYS), ...overrides})

const released = (total: number, formatted = `${total}V`): ReleasedTicketCounts => ({total, formatted})

describe('useBookingUi', () => {
    describe('STEP_ICONS', () => {
        it.each(Object.values(DinnerStepState).filter((v): v is DinnerStepState => typeof v === 'number'))(
            'has an icon for step state %s (DINNER_STEP_MAP stays icon-free)', (state) => {
                expect(STEP_ICONS[state]).toBeTruthy()
                expect(DINNER_STEP_MAP[state]).not.toHaveProperty('icon')
            })
    })

    describe('createBookingBadge', () => {
        it.each([
            {desc: 'open', isOpen: true, counts: undefined, icon: ICONS.lockOpen, color: 'success', value: 'Åben', helpText: DEADLINE_LABELS.BOOKING_CLOSED.openText},
            {desc: 'closed, nothing released', isOpen: false, counts: undefined, icon: ICONS.lockClosed, color: 'error', value: 'Lukket', helpText: DEADLINE_LABELS.BOOKING_CLOSED.closedText},
            {desc: 'closed, one released ticket', isOpen: false, counts: released(1), icon: ICONS.released, color: 'warning', value: '1V ledig', helpText: DEADLINE_LABELS.BOOKING_CLOSED.availableText(1)},
            {desc: 'closed, several released tickets', isOpen: false, counts: released(2, '2V'), icon: ICONS.released, color: 'warning', value: '2V ledige', helpText: DEADLINE_LABELS.BOOKING_CLOSED.availableText(2)}
        ])('$desc', ({isOpen, counts, icon, color, value, helpText}) => {
            expect(createBookingBadge(isOpen, counts)).toEqual({label: DEADLINE_LABELS.BOOKING_CLOSED.label, icon, color, value, helpText})
        })
    })

    describe('createDiningModeBadge', () => {
        it.each([
            {desc: 'open, far from deadline', isOpen: true, countdown: {hours: 48, formatted: '2 Dage'}, icon: ICONS.lockOpen, color: 'success', value: 'Åben'},
            {desc: 'open, under 24h', isOpen: true, countdown: {hours: 5, formatted: '5 Timer'}, icon: ICONS.lockOpen, color: 'warning', value: 'lukker om 5 timer'},
            {desc: 'open, under 1h', isOpen: true, countdown: {hours: 0.5, formatted: '30 Min'}, icon: ICONS.lockOpen, color: 'error', value: 'lukker om 30 min'},
            {desc: 'closed', isOpen: false, countdown: {hours: 0, formatted: ''}, icon: ICONS.lockClosed, color: 'error', value: 'Lukket'}
        ])('$desc', ({isOpen, countdown, icon, color, value}) => {
            expect(createDiningModeBadge(isOpen, countdown)).toMatchObject({label: DEADLINE_LABELS.DINING_MODE.label, icon, color, value})
        })
    })

    describe('createBookingBadges', () => {
        it('returns open booking and dining-mode badges for a far-future dinner', () => {
            const badges = createBookingBadges(farFutureDinner(), deadlines)
            expect(badges.booking.color).toBe('success')
            expect(badges.diningMode.color).toBe('success')
        })
    })

    describe('createChefBadges', () => {
        const {createChefBadges} = useBookingUi()

        it('returns badges for steps 1-4', () => {
            const badges = createChefBadges(farFutureDinner(), deadlines)
            expect([...badges.keys()]).toEqual([1, 2, 3, 4])
            badges.forEach((badge, step) => expect(badge.step).toBe(step))
        })

        it.each([
            {desc: 'scheduled dinner: menu step pending', overrides: {state: DinnerState.SCHEDULED}, step: 1, done: false},
            {desc: 'announced dinner: menu step done', overrides: {state: DinnerState.ANNOUNCED}, step: 1, done: true},
            {desc: 'no groceries yet: groceries step pending', overrides: {totalCost: 0}, step: 3, done: false},
            {desc: 'groceries bought: groceries step done', overrides: {totalCost: 1200}, step: 3, done: true},
            {desc: 'consumed dinner: dinner step done', overrides: {state: DinnerState.CONSUMED}, step: 4, done: true}
        ])('$desc', ({overrides, step, done}) => {
            const badge = createChefBadges(farFutureDinner(overrides), deadlines).get(step)!
            expect(badge.alarm).toBe(done ? -1 : 0)
            if (done) expect(badge.value).toBe('')
            else expect(badge.value).not.toBe('')
        })

        it('booking badge carries released ticket counts once booking is closed', () => {
            const yesterday = {...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), -1)}
            const badge = createChefBadges(yesterday, deadlines, released(2, '2V')).get(2)!
            expect(badge.alarm).toBe(-1)
            expect(badge.value).toBe('2V ledige')
        })
    })
})
