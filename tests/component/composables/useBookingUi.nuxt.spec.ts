// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {addDays} from 'date-fns'
import {useBookingUi, ORDER_STATE_LABELS, allowanceRows, STEP_ICONS, createBookingBadge, createDiningModeBadge, createBookingBadges, createWaitlistBadge, lockChip, SUPPLY_WORDS, bookingSaveLabel, guestSaveLabel, ACTION_WORDS, MODE_WORDS, previewOutcome, scaffoldToastLook, formatBookingResult, guestTicketsLabel, dinnerSpendingFragment, teamSpendingFragment, ticketTypePresentation, resolveTicketTypePresentation, ticketPriceSelectItems, type CookingRoundRow} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DINNER_STEP_MAP, DinnerStepState, DEADLINE_LABELS, EMPTY_RELEASED_TICKET_COUNTS, emptyOrderBuckets, type OrderBucketResult, type ReleasedTicketCounts} from '~/composables/useBooking'
import {useBookingValidation, type BookingAction, type BookingResult, type QueuePosition, type TicketType} from '~/composables/useBookingValidation'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import appConfig from '~/app.config'

const {DinnerStateSchema, DinnerModeSchema, BookingActionSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const DinnerState = DinnerStateSchema.enum
const OrderState = OrderStateSchema.enum
const {ICONS, COLOR, COMPONENTS, BOOKING_LOCK_STATUS, ORDER_STATE_COLORS} = useTheSlopeDesignSystem()
// @nuxt/test-utils 4 starts Nuxt in beforeAll: useSeason runs there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
    deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason())
})

// Far enough ahead that every deadline is still open (app.config imported directly: the value feeds collection-time it.each data)
const FAR_FUTURE_DAYS = appConfig.theslope.defaultSeason.ticketIsCancellableDaysBefore + 20
const farFutureDinner = (overrides = {}) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), FAR_FUTURE_DAYS), ...overrides})

const released = (total: number, formatted = `${total}V`, queued = 0, queuedFormatted = queued > 0 ? `${queued}V` : '-'): ReleasedTicketCounts =>
    ({...EMPTY_RELEASED_TICKET_COUNTS, total, formatted, queued, queuedFormatted})

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
        const {openText, closedText, availableText} = DEADLINE_LABELS.BOOKING_CLOSED
        // The badge's glyph and colour per supply: the tickets for sale lead, the waiting list alone wears the queued order state
        const LOOKS = {
            open: {icon: ICONS.lockOpen, color: COLOR.success},
            closed: {icon: ICONS.lockClosed, color: COLOR.error},
            forSale: {icon: ICONS.released, color: COLOR.warning},
            waitlist: ORDER_STATE_LABELS.queued
        }
        it.each([
            {desc: 'open', isOpen: true, counts: undefined, look: 'open', value: 'Åben', helpText: openText},
            {desc: 'closed, no supply counted', isOpen: false, counts: undefined, look: 'closed', value: 'Lukket', helpText: closedText},
            {desc: 'closed, neither tickets for sale nor a waiting list', isOpen: false, counts: released(0, '-'), look: 'closed', value: 'Lukket', helpText: closedText},
            {desc: 'closed, one ticket for sale', isOpen: false, counts: released(1), look: 'forSale', value: '1V til salg', helpText: availableText(1)},
            {desc: 'closed, tickets for sale only', isOpen: false, counts: released(4, '3V 1B'), look: 'forSale', value: '3V 1B til salg', helpText: availableText(4)},
            // The tooltip reads the waiting list in the sentence of the booking form's bar
            {desc: 'closed, a waiting list only', isOpen: false, counts: released(0, '-', 3, '2V 1B'), look: 'waitlist', value: '2V 1B på venteliste', helpText: SUPPLY_WORDS.waitlist(released(0, '-', 3, '2V 1B'))},
            {desc: 'closed, tickets for sale and a waiting list', isOpen: false, counts: released(4, '4V', 1, '1B'), look: 'forSale', value: '4V til salg, 1B på venteliste', helpText: `${availableText(4)}. ${SUPPLY_WORDS.waitlist(released(4, '4V', 1, '1B'))}`}
        ] as const)('$desc → $value', ({isOpen, counts, look, value, helpText}) => {
            const {icon, color} = LOOKS[look]
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
        it.each([
            {position: 2, ticketType: TicketTypeSchema.enum.ADULT, value: 'Voksen #2'},
            {position: 3, ticketType: TicketTypeSchema.enum.CHILD, value: 'Barn #3'}
        ])('names the place $value in the glyph and colour of the queued order state', ({position, ticketType, value}) => {
            const {icon, color} = ORDER_STATE_LABELS.queued
            expect(createWaitlistBadge(position, ticketType)).toMatchObject({icon, color, value})
        })
    })

    describe('ORDER_STATE_LABELS', () => {
        // A label shown beside a ticket wears the colour of that ticket's state
        it.each([
            {shown: OrderState.BOOKED, state: 'normal'},
            {shown: OrderState.RELEASED, state: 'released'},
            {shown: 'claimed', state: 'claimed'},
            {shown: 'queued', state: 'queued'}
        ] as const)('$shown wears the $state ticket colour', ({shown, state}) => {
            expect(ORDER_STATE_LABELS[shown].color).toBe(ORDER_STATE_COLORS[state])
        })
    })

    describe('SUPPLY_WORDS', () => {
        it.each([
            {desc: 'tickets for sale', counts: released(4, '4V'), line: 'Lukket for ændringer, men der er 4 billetter til salg (4V).'},
            {desc: 'one ticket for sale', counts: released(1, '1V'), line: 'Lukket for ændringer, men der er 1 billet til salg (1V).'},
            {desc: 'nothing for sale', counts: released(0, '-', 3), line: null}
        ])('the tickets for sale: $desc', ({counts, line}) => {
            expect(SUPPLY_WORDS.forSale(counts)).toBe(line)
        })

        it.each([
            {desc: 'alone it names the closure', counts: released(0, '-', 6, '2V 3B 1b'),
                sentence: 'Lukket for ændringer, men du kan få en plads på ventelisten. Pt står 2V 3B 1b på ventelisten.'},
            {desc: 'after the tickets for sale it adds itself', counts: released(4, '4V', 1, '1B'),
                sentence: 'Du kan også få en plads på ventelisten. Pt står 1B på ventelisten.'},
            {desc: 'nobody waiting', counts: released(4, '4V'), sentence: null}
        ])('the waiting list: $desc', ({counts, sentence}) => {
            expect(SUPPLY_WORDS.waitlist(counts)).toBe(sentence)
        })

        it.each([
            {count: 1, tickets: '1 billet'},
            {count: 3, tickets: '3 billetter'}
        ])('the household notes count $tickets', ({count, tickets}) => {
            expect(SUPPLY_WORDS.householdReleased(count)).toEqual({title: `Husstanden har frigivet ${tickets}`, description: 'Du betaler, medmindre andre køber'})
            expect(SUPPLY_WORDS.householdQueued(count)).toEqual({title: `Husstanden står på ventelisten med ${tickets}`, description: 'Du betaler, når du får en billet fra ventelisten.'})
        })
    })

    describe('lockChip', () => {
        it.each([
            {desc: 'tickets for sale count up', supply: released(2), chip: {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: '2'}},
            {desc: 'tickets for sale lead a waiting list', supply: released(2, '2V', 1), chip: {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: '2'}},
            {desc: 'a waiting list shows the hourglass without a number', supply: released(0, '-', 3), chip: {color: BOOKING_LOCK_STATUS.lockedWithQueue.color, icon: ICONS.waitlist}},
            {desc: 'neither leaves the closed chip without a number or a glyph', supply: released(0, '-'), chip: {color: BOOKING_LOCK_STATUS.locked.color}},
            {desc: 'an open dinner has no chip', supply: null, chip: null},
            {desc: 'a dinner outside the lock map has no chip', supply: undefined, chip: null}
        ])('$desc', ({supply, chip}) => {
            expect(lockChip(supply)).toEqual(chip)
        })
    })

    describe('outcome words', () => {
        // One word table: the preview line's words after the name, the toast's words after the count; the mode comes from
        // the one mode-words table
        const LATE = MODE_WORDS[DinnerModeSchema.enum.DINEINLATE].label
        it.each([
            {action: Action.BOOK, preview: 'tilmeldes', toast: 'tilmeldt'},
            {action: Action.CANCEL, preview: 'frameldes', toast: 'frameldt'},
            {action: Action.RELEASE, preview: 'frigiver sin billet', toast: 'frigivet'},
            {action: Action.RECLAIM, preview: 'tilmeldes igen', toast: 'tilmeldt igen'},
            {action: Action.BUY, preview: 'køber en billet til salg', toast: 'købt'},
            {action: Action.QUEUE, preview: 'skrives på ventelisten', toast: 'på ventelisten'},
            {action: Action.LEAVE, preview: 'forlader ventelisten', toast: 'forlod ventelisten'},
            {action: Action.REQUEUE, preview: `ændrer spisemåde til ${LATE} (venteliste)`, toast: 'ændret spisemåde (venteliste)'},
            {action: Action.CHANGE_MODE, preview: `ændrer spisemåde til ${LATE}`, toast: 'ændret spisemåde'},
            {action: Action.CHANGE_PRICE, preview: 'ændrer billettype', toast: 'ændret billettype'}
        ])('$action previews "$preview" and toasts "$toast"', ({action, preview, toast}) => {
            expect(ACTION_WORDS[action].preview({mode: LATE})).toBe(preview)
            expect(ACTION_WORDS[action].toast).toBe(toast)
        })

        it.each([
            {outcome: Action.BOOK, save: 'Book'},
            {outcome: Action.BUY, save: 'Køb billet'},
            {outcome: Action.QUEUE, save: 'Skriv på venteliste'},
            {outcome: Action.LEAVE, save: 'Forlad ventelisten'},
            {outcome: Action.REQUEUE, save: 'Opdater'},
            {outcome: Action.CHANGE_MODE, save: 'Opdater'}
        ])('$outcome saves as "$save"', ({outcome, save}) => {
            expect(bookingSaveLabel(outcome)).toBe(save)
        })

        // The guest form's button names the guests; its preview lines name the guests per outcome
        it.each([
            {count: 1, label: 'Tilmeld gæst'},
            {count: 3, label: 'Tilmeld gæster'}
        ])('the guest form saves $count as "$label"', ({count, label}) => {
            expect(guestSaveLabel(count)).toBe(label)
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
            expect(badge.value).toBe('2V til salg')
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

// Every toast that reports a booking result: the ticket, red as soon as one order failed, one line per person
describe('scaffoldToastLook', () => {
    it.each([
        {desc: 'a run with a failed order', errored: 1, color: COLOR.error},
        {desc: 'a run where every order landed', errored: 0, color: COLOR.success}
    ])('$desc toasts in $color with the ticket and breaks its lines', ({errored, color}) => {
        expect(scaffoldToastLook({errored})).toEqual({color, icon: ICONS.ticket, ui: {description: COMPONENTS.bookingResult.lines}})
    })
})

describe('formatBookingResult', () => {
    const {ADULT, CHILD} = TicketTypeSchema.enum
    const ANNA = {inhabitantId: 1, inhabitantName: 'Anna', ticketType: ADULT}
    const guestsOfAnna = (ticketType: TicketType | null) => ({...ANNA, isGuestTicket: true, ticketType})
    const LARS = {inhabitantId: 2, inhabitantName: 'Lars', ticketType: ADULT}
    const KNUD = {inhabitantId: 3, inhabitantName: 'Knud', ticketType: ADULT}
    const LENE = {inhabitantId: 4, inhabitantName: 'Lene', ticketType: ADULT}
    type Person = Pick<BookingResult, 'inhabitantId' | 'inhabitantName' | 'ticketType'> & {isGuestTicket?: boolean}

    // One order's result per action listed, each on its own dinner
    const resultsOf = (person: Person, ...actions: BookingAction[]): BookingResult[] =>
        actions.map((action, index) => OrderFactory.defaultBookingResult({...person, dinnerEventId: index + 1, action}))
    // One order's result per action listed, all on one dinner: a booker's guests at one table
    const resultsOnDinner = (dinnerEventId: number, person: Person, ...actions: BookingAction[]): BookingResult[] =>
        actions.map(action => OrderFactory.defaultBookingResult({...person, dinnerEventId, action}))
    const times = (count: number, action: BookingAction): BookingAction[] => Array.from({length: count}, () => action)
    const placeOf = (person: Person, position: number): QueuePosition =>
        ({inhabitantId: person.inhabitantId, dinnerEventId: 1, isGuestTicket: !!person.isGuestTicket, position, ticketType: person.ticketType})
    const soldToWaitlist = (count: number) =>
        Array.from({length: count}, () => ({dinnerEventId: 1, ticketPriceId: 1, buyerInhabitantId: 9, buyerHouseholdId: 2, sellerHouseholdId: 1}))
    const run = (overrides: Parameters<typeof OrderFactory.defaultScaffoldResult>[0]) => OrderFactory.defaultScaffoldResult(overrides)

    it.each([
        {
            // People in the order they first appear, their counts in the order of the actions, the places ascending
            desc: 'the grid save after the deadline',
            result: run({
                results: [...resultsOf(ANNA, Action.QUEUE), ...resultsOnDinner(1, guestsOfAnna(ADULT), Action.QUEUE), ...resultsOf(ANNA, Action.BUY, Action.QUEUE)],
                positions: [placeOf(ANNA, 5), placeOf(guestsOfAnna(ADULT), 6), placeOf(ANNA, 3)]
            }),
            text: 'Anna: 1 købt, 2 på ventelisten (Voksen #3, Voksen #5)\nGæst af Anna (Voksen): 1 på ventelisten (Voksen #6)'
        },
        {
            // A booker's guests of one ticket type are one line, named with the count, as the guest row badges them
            desc: 'two guests of one ticket type at one dinner',
            result: run({results: resultsOnDinner(1, guestsOfAnna(CHILD), Action.BUY, Action.QUEUE), positions: [placeOf(guestsOfAnna(CHILD), 3)]}),
            text: 'Gæst af Anna (Barn ×2): 1 købt, 1 på ventelisten (Barn #3)'
        },
        {
            // The count is the guests at one dinner; another ticket type is another line
            desc: 'guests of two ticket types over two dinners',
            result: run({results: [
                ...resultsOnDinner(1, guestsOfAnna(CHILD), Action.BOOK, Action.BOOK),
                ...resultsOnDinner(2, guestsOfAnna(CHILD), Action.BOOK, Action.BOOK),
                ...resultsOnDinner(1, guestsOfAnna(ADULT), Action.BOOK)
            ]}),
            text: 'Gæst af Anna (Barn ×2): 4 tilmeldt\nGæst af Anna (Voksen): 1 tilmeldt'
        },
        {
            desc: 'guests whose ticket price is gone',
            result: run({results: resultsOnDinner(1, guestsOfAnna(null), Action.BOOK, Action.BOOK)}),
            text: 'Gæst af Anna (×2): 2 tilmeldt'
        },
        {
            desc: 'the grid power mode',
            result: run({results: [...resultsOf(ANNA, Action.CHANGE_MODE), ...resultsOf(LARS, Action.CHANGE_MODE), ...resultsOf(ANNA, Action.RELEASE), ...resultsOf(LARS, Action.RELEASE)]}),
            text: 'Anna: 1 frigivet, 1 ændret spisemåde\nLars: 1 frigivet, 1 ændret spisemåde'
        },
        {
            // The failures close a person's line; the household lines follow the people
            desc: 'the preference power mode with a failed order',
            result: run({
                results: [...resultsOf(KNUD, ...times(7, Action.CANCEL), ...times(2, Action.RELEASE)), ...resultsOf(LENE, ...times(6, Action.CANCEL), ...times(2, Action.RELEASE))],
                failed: resultsOf(LENE, Action.RELEASE),
                errored: 1,
                unchanged: 42,
                outcomes: {joined: [], ticketsSold: [], waitlistTicketsSold: soldToWaitlist(1)}
            }),
            text: 'Knud: 7 frameldt, 2 frigivet\nLene: 6 frameldt, 2 frigivet, 1 opdatering fejlede\n1 billet solgt til ventelisten\n42 uændret'
        },
        {
            desc: 'a person with only failed orders',
            result: run({results: resultsOf(KNUD, Action.BOOK), failed: resultsOf(LENE, Action.BOOK, Action.BOOK), errored: 2}),
            text: 'Knud: 1 tilmeldt\nLene: 2 opdateringer fejlede'
        },
        {
            // A household whose run failed as a whole names no person
            desc: 'a household that failed beside the orders that landed',
            result: run({results: resultsOf(KNUD, Action.BOOK), unchanged: 3, errored: 1}),
            text: 'Knud: 1 tilmeldt\n3 uændret\nBookingen fejlede'
        },
        {
            desc: 'tickets sold to the waiting list and nothing else changed',
            result: run({unchanged: 5, outcomes: {joined: [], ticketsSold: [], waitlistTicketsSold: soldToWaitlist(2)}}),
            text: '2 billetter solgt til ventelisten\n5 uændret'
        },
        {
            desc: 'nothing changed',
            result: run({}),
            text: 'Der var ingen ændringer i dine bookinger'
        }
    ])('$desc', ({result, text}) => {
        expect(formatBookingResult(result)).toBe(text)
    })
})

// A booker's guest tickets of one type, as the guest row badges them and the preview and the toast name them
describe('guestTicketsLabel', () => {
    it.each([
        {label: 'Barn', count: 1, text: 'Barn'},
        {label: 'Barn', count: 2, text: 'Barn ×2'},
        {label: undefined, count: 3, text: '×3'}
    ])('$count of $label read "$text"', ({label, count, text}) => {
        expect(guestTicketsLabel(label, count)).toBe(text)
    })
})
