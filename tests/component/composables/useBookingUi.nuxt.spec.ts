// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {addDays} from 'date-fns'
import {useBookingUi, ORDER_STATE_LABELS, allowanceRows, STEP_ICONS, createBookingBadge, createDiningModeBadge, createBookingBadges, createWaitlistBadge, lockChip, bookingSaveLabel, guestSaveLabel, ACTION_WORDS, MODE_WORDS, previewOutcome, dinnerSpendingFragment, teamSpendingFragment, ticketTypePresentation, resolveTicketTypePresentation, ticketPriceSelectItems, type CookingRoundRow} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DINNER_STEP_MAP, DinnerStepState, DEADLINE_LABELS, emptyOrderBuckets, type OrderBucketResult, type ReleasedTicketCounts} from '~/composables/useBooking'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import appConfig from '~/app.config'

const {DinnerStateSchema, DinnerModeSchema, BookingActionSchema, OrderStateSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const DinnerState = DinnerStateSchema.enum
const OrderState = OrderStateSchema.enum
const {ICONS, COLOR, BOOKING_LOCK_STATUS} = useTheSlopeDesignSystem()
// @nuxt/test-utils 4 starts Nuxt in beforeAll: useSeason runs there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
    deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason())
})

// Far enough ahead that every deadline is still open (app.config imported directly: the value feeds collection-time it.each data)
const FAR_FUTURE_DAYS = appConfig.theslope.defaultSeason.ticketIsCancellableDaysBefore + 20
const farFutureDinner = (overrides = {}) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), FAR_FUTURE_DAYS), ...overrides})

const released = (total: number, formatted = `${total}V`, queued = 0): ReleasedTicketCounts => ({total, formatted, queued})

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

    it('builds the allowance rows: the allowance, Brugt and Tilbage with its balance, or Brugt alone without an allowance', () => {
        const rows = allowanceRows({budgetGross: 2000, spentGross: 500})
        expect(rows.map(row => row.label)).toEqual(['Rådighedsbeløb', 'Brugt', 'Tilbage'])
        expect(rows[0]).toEqual({label: 'Rådighedsbeløb', gross: 2000})
        expect(rows[2]).toEqual({label: 'Tilbage', gross: 1500, balance: true, pending: false, rule: true})
        expect(allowanceRows({budgetGross: 0, spentGross: 500})[2]).toMatchObject({pending: true})
        expect(allowanceRows({budgetGross: null, spentGross: 500})).toEqual([{label: 'Brugt', gross: 500, rule: true}])
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

    // A locked dinner holds tickets for sale or a waiting list, never both
    describe('lockChip', () => {
        it.each([
            {desc: 'tickets for sale count up', supply: released(2), chip: {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: '2'}},
            {desc: 'a waiting list counts down', supply: released(0, '-', 3), chip: {color: BOOKING_LOCK_STATUS.lockedWithQueue.color, text: '-3'}},
            {desc: 'neither leaves the closed chip without a number', supply: released(0, '-'), chip: {color: BOOKING_LOCK_STATUS.locked.color, text: undefined}},
            {desc: 'an open dinner has no chip', supply: null, chip: null},
            {desc: 'a dinner outside the lock map has no chip', supply: undefined, chip: null}
        ])('$desc', ({supply, chip}) => {
            expect(lockChip(supply)).toEqual(chip)
        })
    })

    describe('outcome words', () => {
        // The words a requeue names: the mode, from the one mode-words table, and the queue place it keeps
        const LATE_AT_TWO = {mode: MODE_WORDS[DinnerModeSchema.enum.DINEINLATE].label, position: 2}
        it.each([
            {outcome: Action.BOOK, save: 'Book', guestSave: 'Tilføj gæst', preview: 'Anna tilmeldes'},
            {outcome: Action.BUY, save: 'Køb billet', guestSave: 'Køb billet til gæst', preview: 'Anna køber en ledig billet'},
            {outcome: Action.QUEUE, save: 'Skriv på venteliste', guestSave: 'Skriv gæst på venteliste', preview: 'Anna skrives på ventelisten'},
            {outcome: Action.LEAVE, save: 'Forlad ventelisten', guestSave: 'Forlad ventelisten', preview: 'Anna forlader ventelisten'},
            {outcome: Action.REQUEUE, save: 'Opdater', guestSave: 'Opdater', preview: `Anna ændrer ønsket tilmelding til ${MODE_WORDS[DinnerModeSchema.enum.DINEINLATE].label}, beholder plads #2 i køen`},
            {outcome: Action.CHANGE_MODE, save: 'Opdater', guestSave: 'Tilføj gæst', preview: 'Anna opdaterer spisning'}
        ])('$outcome → save "$save", guest "$guestSave", preview "$preview"', ({outcome, save, guestSave, preview}) => {
            expect(bookingSaveLabel(outcome)).toBe(save)
            expect(guestSaveLabel(outcome)).toBe(guestSave)
            expect(ACTION_WORDS[outcome].template('Anna', LATE_AT_TWO)).toBe(preview)
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

    describe('formatOrder', () => {
        let formatOrder: ReturnType<typeof useBookingUi>['formatOrder']
        beforeAll(() => {
            ({formatOrder} = useBookingUi())
        })

        it.each([
            {desc: 'a booked ticket reads its state', overrides: {state: OrderState.BOOKED}, shown: ORDER_STATE_LABELS[OrderState.BOOKED]},
            {desc: 'a booked ticket claimed from another household reads as bought', overrides: {state: OrderState.BOOKED, provenanceHousehold: 'S31'}, shown: ORDER_STATE_LABELS.claimed},
            {desc: 'a released ticket reads its state, claimed or not', overrides: {state: OrderState.RELEASED, provenanceHousehold: 'S31'}, shown: ORDER_STATE_LABELS[OrderState.RELEASED]}
        ])('$desc', ({overrides, shown}) => {
            expect(formatOrder(OrderFactory.defaultOrder(undefined, overrides)))
                .toMatchObject({stateText: shown.label, stateColor: shown.color, stateIcon: shown.icon, guest: null})
        })

        it('badges a guest ticket with its booker', () => {
            const formatted = formatOrder(OrderFactory.defaultOrder(undefined, {isGuestTicket: true}), 'Anna')
            expect(formatted.guest).toEqual({label: 'Gæst af Anna', color: COLOR.info, icon: ICONS.userPlus})
        })
    })
})

describe('previewOutcome', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const desired = OrderFactory.defaultDesiredOrder({dinnerMode: DinnerModeSchema.enum.DINEIN, state: OrderStateSchema.enum.BOOKED})
    const buckets = (filled: Partial<OrderBucketResult>): OrderBucketResult => ({...emptyOrderBuckets(), ...filled})

    it.each([
        {desc: 'a new ticket before the deadline', filled: {create: [desired]}, ticketsForSale: 0, outcome: Action.BOOK},
        {desc: 'a claim with a ticket for sale', filled: {claim: [desired]}, ticketsForSale: 1, outcome: Action.BUY},
        {desc: 'a claim with nothing for sale', filled: {claim: [desired]}, ticketsForSale: 0, outcome: Action.QUEUE},
        {desc: 'Ingen on a queued row', filled: {leave: [desired]}, ticketsForSale: 0, outcome: Action.LEAVE},
        {desc: 'a new wish on a queued row', filled: {requeue: [desired]}, ticketsForSale: 0, outcome: Action.REQUEUE},
        {desc: 'a mode change on a held ticket', filled: {update: [desired]}, ticketsForSale: 0, outcome: Action.CHANGE_MODE}
    ])('$desc → $outcome', ({filled, ticketsForSale, outcome}) => {
        expect(previewOutcome(buckets(filled), () => ({ticketsForSale}))).toBe(outcome)
    })
})

describe('ticket type presentation', () => {
    const {TicketTypeSchema} = useBookingValidation()
    const {TICKET_TYPE_COLORS, TICKET_TYPE_ICONS} = useTheSlopeDesignSystem()
    const prices = TicketFactory.defaultTicketPrices()

    it.each(TicketTypeSchema.options)('%s shows its words with the design system colour and glyph of its type', (ticketType) => {
        expect(ticketTypePresentation(ticketType)).toEqual({
            ...useTicket().ticketTypeWords[ticketType], color: TICKET_TYPE_COLORS[ticketType], icon: TICKET_TYPE_ICONS[ticketType]
        })
    })

    it('a person shows the presentation of the ticket type they resolve to', () => {
        expect(resolveTicketTypePresentation(new Date('2017-01-01'), prices, new Date('2025-01-15')))
            .toEqual(ticketTypePresentation(TicketTypeSchema.enum.CHILD))
    })

    it('a price as a select item carries its type presentation, its label with the price, and its age limit with its description', () => {
        const child = prices.find(price => price.ticketType === TicketTypeSchema.enum.CHILD)!
        const item = ticketPriceSelectItems([child])[0]!
        expect(item.presentation).toEqual(ticketTypePresentation(TicketTypeSchema.enum.CHILD))
        expect(item.label).toBe(`${useTicket().ticketTypeWords[TicketTypeSchema.enum.CHILD].label} · ${useTicket().formatPrice(child.price)} kr`)
        expect(item.description).toBe(`Under ${child.maximumAgeLimit} år · ${child.description}`)
        expect(ticketPriceSelectItems([child], true)[0]!.description).toBeUndefined()
    })
})
