// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {addDays} from 'date-fns'
import {useBookingUi, STEP_ICONS, createBookingBadge, createDiningModeBadge, createBookingBadges, createWaitlistBadge, bookingSaveLabel, guestSaveLabel, OUTCOME_WORDS, previewOutcome, dinnerSpendingFragment, teamSpendingFragment, type CookingRoundRow} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DINNER_STEP_MAP, DinnerStepState, DEADLINE_LABELS, type ReleasedTicketCounts} from '~/composables/useBooking'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import appConfig from '~/app.config'

const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum
const {ICONS} = useTheSlopeDesignSystem()
// @nuxt/test-utils 4 starts Nuxt in beforeAll: useSeason runs there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
    deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason())
})

// Far enough ahead that every deadline is still open (app.config imported directly: the value feeds collection-time it.each data)
const FAR_FUTURE_DAYS = appConfig.theslope.defaultSeason.ticketIsCancellableDaysBefore + 20
const farFutureDinner = (overrides = {}) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), FAR_FUTURE_DAYS), ...overrides})

const released = (total: number, formatted = `${total}V`): ReleasedTicketCounts => ({total, formatted})

describe('spending fragments', () => {
    const dinner = (id: number, isCurrent: boolean): CookingRoundRow => ({dinnerEventId: id, date: new Date(2026, 3, 10 + id), menuTitle: `Ret ${id}`, isCurrent, budgetGross: 1000 * id, spentGross: 100 * id})

    it('builds this dinner\'s fragment: heading with title and date, the receipts as rows, its figures in the total', () => {
        const receipts = [ExpenseFactory.defaultExpense({id: 7, amount: 101200, description: '"Ret 2" 12/04/2026, Anna H. bestiller for Madhold 2'})]
        const fragment = dinnerSpendingFragment(dinner(2, true), receipts)
        expect(fragment.heading).toBe('Ret 2, 12/04/2026')
        expect(fragment.rows).toHaveLength(1)
        // The receipt row reads the line's note
        expect(fragment.rows[0]).toMatchObject({kind: 'receipt', label: '"Ret 2" 12/04/2026, Anna H. bestiller for Madhold 2', amount: 101200})
        expect(fragment.total).toEqual({label: 'Ret 2', figures: {budgetGross: 2000, spentGross: 200}})
    })

    it('builds the team\'s fragment: its words as heading and total label, the days as rows, the sums as figures', () => {
        const fragment = teamSpendingFragment([dinner(1, false), dinner(2, true)], {team: 'Hele Madhold 2', heading: 'Hele Madhold 2, for perioden 11/04–12/04'})
        expect(fragment.heading).toBe('Hele Madhold 2, for perioden 11/04–12/04')
        expect(fragment.rows.map(row => row.kind)).toEqual(['dinner', 'dinner'])
        expect(fragment.total).toEqual({label: 'Hele Madhold 2', figures: {budgetGross: 3000, spentGross: 300}})
    })
})

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

    describe('createWaitlistBadge', () => {
        it.each([1, 3])('names queue position %i under the hourglass', (position) => {
            expect(createWaitlistBadge(position)).toMatchObject({icon: ICONS.waitlist, value: `#${position} i køen`})
        })
    })

    describe('outcome words', () => {
        it.each([
            {outcome: 'book' as const, save: 'Book', guestSave: 'Tilføj gæst', preview: 'Anna tilmeldes'},
            {outcome: 'buy' as const, save: 'Køb billet', guestSave: 'Køb billet til gæst', preview: 'Anna køber en ledig billet'},
            {outcome: 'queue' as const, save: 'Skriv på venteliste', guestSave: 'Skriv gæst på venteliste', preview: 'Anna skrives på ventelisten'},
            {outcome: 'leave' as const, save: 'Forlad ventelisten', guestSave: 'Forlad ventelisten', preview: 'Anna forlader ventelisten'},
            {outcome: 'requeue' as const, save: 'Opdater ønsket', guestSave: 'Opdater ønsket', preview: 'Anna skrives på ventelisten igen'},
            {outcome: 'none' as const, save: 'Opdater', guestSave: 'Tilføj gæst', preview: 'Anna opdaterer spisning'}
        ])('$outcome → save "$save", guest "$guestSave", preview "$preview"', ({outcome, save, guestSave, preview}) => {
            expect(bookingSaveLabel(outcome)).toBe(save)
            expect(guestSaveLabel(outcome)).toBe(guestSave)
            expect(OUTCOME_WORDS[outcome].template('Anna')).toBe(preview)
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
        let createChefBadges: ReturnType<typeof useBookingUi>['createChefBadges']
        beforeAll(() => {
            ({createChefBadges} = useBookingUi())
        })

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

describe('previewOutcome', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const desired = OrderFactory.defaultDesiredOrder({dinnerMode: DinnerModeSchema.enum.DINEIN, state: OrderStateSchema.enum.BOOKED})
    const buckets = (filled: Partial<Record<'create' | 'claim' | 'leave' | 'requeue' | 'update', typeof desired[]>>) =>
        ({create: [], update: [], delete: [], idempotent: [], claim: [], leave: [], requeue: [], ...filled})

    it.each([
        {desc: 'a new ticket before the deadline', filled: {create: [desired]}, ticketsForSale: 0, outcome: 'book'},
        {desc: 'a claim with a ticket for sale', filled: {claim: [desired]}, ticketsForSale: 1, outcome: 'buy'},
        {desc: 'a claim with nothing for sale', filled: {claim: [desired]}, ticketsForSale: 0, outcome: 'queue'},
        {desc: 'Ingen on a queued row', filled: {leave: [desired]}, ticketsForSale: 0, outcome: 'leave'},
        {desc: 'a new wish on a queued row', filled: {requeue: [desired]}, ticketsForSale: 0, outcome: 'requeue'},
        {desc: 'a mode change on a held ticket', filled: {update: [desired]}, ticketsForSale: 0, outcome: 'none'}
    ])('$desc → $outcome', ({filled, ticketsForSale, outcome}) => {
        expect(previewOutcome(buckets(filled), () => ({ticketsForSale}))).toBe(outcome)
    })
})
