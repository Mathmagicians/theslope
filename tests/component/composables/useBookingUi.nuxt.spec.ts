// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {addDays} from 'date-fns'
import {useBookingUi, ORDER_STATE_LABELS, costLineMode, allowanceRows, STEP_ICONS, createBookingBadge, createDiningModeBadge, createBookingBadges, createTicketStateBadge, createBirthdayBadge, lockChip, SUPPLY_WORDS, lockedSupply, closedForCancellation, moreTicketsAlert, bookingSaveLabel, guestSaveLabel, ACTION_WORDS, MODE_WORDS, previewSaveOutcome, expectedBookings, expectedBookingKey, personOnDinner, guestItemsOf, scaffoldToastLook, scaffoldToast, formatResultLines, formatPreviewLines, ticketBadgeLabel, cookingRoundWords, dinnerSpendingFragment, teamSpendingFragment, SPENDING_KIND, ticketTypePresentation, ticketPricePresentation, resolveTicketTypePresentation, ticketPriceSelectItems, ticketChangeHouseholds, type CookingRoundRow} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {DINNER_STEP_MAP, DinnerStepState, DEADLINE_LABELS, formatPlace} from '~/composables/useBooking'
import {useBookingValidation, TicketState, type BookingAction, type BookingResult, type QueuePosition} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {lockedDinnerSupply} from '~~/tests/component/testHelpers'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {ticketTypeLabel} from '~/composables/useTicket'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {formatDate, formatDateRange, DATE_SETTINGS} from '~/utils/date'
import appConfig from '~/app.config'

const {DinnerStateSchema, DinnerModeSchema, BookingActionSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const DinnerState = DinnerStateSchema.enum
const OrderState = OrderStateSchema.enum
const {ICONS, COLOR, COMPONENTS, BOOKING_LOCK_STATUS, ORDER_STATE_COLORS} = useTheSlopeDesignSystem()
// @nuxt/test-utils 4 starts Nuxt in beforeAll: useSeason runs there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
    deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason(), new Date())
})

// Far enough ahead that every deadline is still open (app.config imported directly: the value feeds collection-time it.each data)
const FAR_FUTURE_DAYS = appConfig.theslope.defaultSeason.ticketIsCancellableDaysBefore + 20
const farFutureDinner = (overrides = {}) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), FAR_FUTURE_DAYS), ...overrides})

const {ADULT, CHILD, BABY} = TicketTypeSchema.enum

// The closed dinner's supply as the Framelding badge's value line and its help text, the booking form's alert
const SUPPLY_TABLE = [
    {desc: 'tickets for sale and a waiting list', counts: lockedDinnerSupply({[CHILD]: 1}, {[ADULT]: 8}), look: 'forSale',
        value: '1B til salg, 8V på venteliste', sentence: 'Lukket for framelding: 1 barn til salg, 8 voksne på ventelisten'},
    {desc: 'tickets for sale only', counts: lockedDinnerSupply({[CHILD]: 1}), look: 'forSale',
        value: '1B til salg', sentence: 'Lukket for framelding: 1 barn til salg'},
    {desc: 'a waiting list only', counts: lockedDinnerSupply({}, {[ADULT]: 8}), look: 'waitlist',
        value: '8V på venteliste', sentence: 'Lukket for framelding: 8 voksne på ventelisten'},
    {desc: 'neither', counts: lockedDinnerSupply(), look: 'closed',
        value: null, sentence: 'Lukket for framelding'},
    {desc: 'several ticket types', counts: lockedDinnerSupply({[ADULT]: 2, [CHILD]: 3}, {[BABY]: 1}), look: 'forSale',
        value: '2V 3B til salg, 1b på venteliste', sentence: 'Lukket for framelding: 2 voksne, 3 børn til salg, 1 baby på ventelisten'}
] as const

describe('spending fragments', () => {
    const dinner = (id: number, isCurrent: boolean): CookingRoundRow => ({dinnerEventId: id, date: new Date(2026, 3, 10 + id), menuTitle: `Ret ${id}`, isCurrent, budgetGross: 1000 * id, spentGross: 100 * id})

    it('builds this dinner\'s fragment: heading with title and date, the receipts as rows, its figures in the total', () => {
        const receipts = [ExpenseFactory.defaultExpense({id: 7, amount: 101200, description: '"Ret 2" 12/04/2026, Anna H. bestiller for Madhold 2'})]
        const fragment = dinnerSpendingFragment(dinner(2, true), receipts)
        expect(fragment.kind).toBe(SPENDING_KIND.dinner)
        expect(fragment.heading).toBe(`Ret 2, ${formatDate(dinner(2, true).date, DATE_SETTINGS.DAY_MONTH_MASK)}`)
        expect(fragment.rows).toHaveLength(1)
        // The receipt row reads the line's note
        expect(fragment.rows[0]).toMatchObject({kind: SPENDING_KIND.receipt, label: '"Ret 2" 12/04/2026, Anna H. bestiller for Madhold 2', amount: 101200})
        expect(fragment.total).toEqual({label: 'Ret 2', figures: {budgetGross: 2000, spentGross: 200}})
    })

    it('GIVEN a dinner without a menu title THEN its heading and its total row read Fællesspisning', () => {
        const untitled = {...dinner(2, true), menuTitle: ''}
        const fragment = dinnerSpendingFragment(untitled, [])
        expect(fragment.heading).toBe(`Fællesspisning, ${formatDate(untitled.date, DATE_SETTINGS.DAY_MONTH_MASK)}`)
        expect(fragment.total.label).toBe('Fællesspisning')
    })

    it('builds the team\'s fragment: the team for its badge with the period, the days as rows, the team in the total row with the sums', () => {
        const words = cookingRoundWords('Madhold 2', 2, dinner(1, false).date, dinner(2, true).date)
        const range = formatDateRange({start: dinner(1, false).date, end: dinner(2, true).date}, DATE_SETTINGS.DAY_MONTH_MASK)
        // The round reads the team's short name and number, its period, and the Madbestilling hint's heading
        expect(words).toEqual({team: 'Madhold 2', teamNumber: 2, period: `periode ${range}`, heading: `Madhold 2, periode ${range}`})
        const fragment = teamSpendingFragment([dinner(1, false), dinner(2, true)], words)
        expect(fragment).toMatchObject({kind: SPENDING_KIND.team, team: 'Madhold 2', teamNumber: 2, period: words.period})
        expect(fragment.rows.map(row => row.kind)).toEqual([SPENDING_KIND.dinner, SPENDING_KIND.dinner])
        expect(fragment.total).toEqual({label: 'Madhold 2', figures: {budgetGross: 3000, spentGross: 300}})
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
        // The badge's glyph and colour per supply: the tickets for sale lead, the waiting list alone wears the queued order state
        const LOOKS = {
            open: {icon: ICONS.lockOpen, color: COLOR.success},
            closed: {icon: ICONS.lockClosed, color: COLOR.error},
            forSale: {icon: ICONS.released, color: COLOR.warning},
            waitlist: ORDER_STATE_LABELS.queued
        }
        it.each([
            {desc: 'open', isOpen: true, counts: undefined, look: 'open', value: 'Åben', helpText: 'Booking kan ændres'},
            {desc: 'closed, no supply counted', isOpen: false, counts: undefined, look: 'closed', value: 'Lukket', helpText: 'Lukket for framelding'},
            ...SUPPLY_TABLE.map(({desc, counts, look, value, sentence}) => ({desc: `closed, ${desc}`, isOpen: false, counts, look, value: value ?? 'Lukket', helpText: sentence}))
        ] as const)('$desc → $value', ({isOpen, counts, look, value, helpText}) => {
            const {icon, color} = LOOKS[look]
            expect(createBookingBadge(isOpen, counts)).toEqual({label: DEADLINE_LABELS.BOOKING_CLOSED.label, icon, color, value, helpText})
        })
    })

    // The booking form's alert on a closed dinner reads the sentence: buy a ticket for sale, else join the waiting list;
    // no alert with neither
    describe('a closed dinner\'s supply', () => {
        const ALERT_ICONS = {forSale: ICONS.claim, waitlist: ICONS.waitlist, closed: null}

        it.each(SUPPLY_TABLE)('$desc: the value line reads "$value", the sentence "$sentence", and the booking form\'s alert follows the supply ($look)', ({counts, look, value, sentence}) => {
            expect(lockedSupply(counts)).toBe(value)
            expect(closedForCancellation(counts)).toBe(sentence)
            const icon = ALERT_ICONS[look]
            expect(moreTicketsAlert(counts)).toEqual(icon === null ? null : {icon, title: BOOKING_WORDS.supply.moreTickets, description: sentence})
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

    // The badge beside a name: the label, glyph and colour of the order state the ticket shows, the badge's words with
    // the caller's detail (the household a ticket was bought from, the place in the line of its ticket type)
    describe('createTicketStateBadge', () => {
        it.each([
            {ticketState: TicketState.released, shown: OrderState.RELEASED, detail: ''},
            {ticketState: TicketState.claimed, shown: TicketState.claimed, detail: HouseholdFactory.defaultHouseholdDetail('seller').shortName},
            {ticketState: TicketState.queued, shown: TicketState.queued, detail: formatPlace(2, ADULT)}
        ] as const)('a $ticketState ticket wears the $shown order state and reads its words with the detail "$detail"', ({ticketState, shown, detail}) => {
            const {label, icon, color} = ORDER_STATE_LABELS[shown]
            const {value, helpText} = BOOKING_WORDS.ticketStateBadge[ticketState]
            expect(createTicketStateBadge(ticketState, detail)).toEqual({label, icon, color, value: value(detail), helpText})
        })

        it('a normal ticket has no state badge', () => {
            expect(createTicketStateBadge(TicketState.normal)).toBeNull()
        })
    })

    // The badge beside a name on a person's first dinner at a new ticket type: the birthday glyph, the type's label from
    // the dinner's day and month in the badge's words, the legend's words as its help text
    describe('createBirthdayBadge', () => {
        it.each([ADULT, CHILD])('a first dinner at %s reads "<type> fra <day/month>" in the birthday glyph, with the legend\'s words as help text', (ticketType) => {
            const from = addDays(new Date(), 10)
            expect(createBirthdayBadge(ticketType, from)).toEqual({
                label: BOOKING_WORDS.birthdayBadge.label,
                icon: ICONS.birthday,
                color: COLOR.neutral,
                value: BOOKING_WORDS.birthdayBadge.from(ticketTypeLabel(ticketType), formatDate(from, DATE_SETTINGS.DAY_MONTH_MASK)),
                helpText: BOOKING_WORDS.legend.birthday
            })
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
            {count: 1, tickets: '1 billet'},
            {count: 3, tickets: '3 billetter'}
        ])('the household notes count $tickets', ({count, tickets}) => {
            expect(SUPPLY_WORDS.householdReleased(count)).toEqual({title: `Husstanden har frigivet ${tickets}`, description: 'Du betaler, medmindre andre køber'})
            expect(SUPPLY_WORDS.householdQueued(count)).toEqual({title: `Husstanden står på ventelisten med ${tickets}`, description: 'Du betaler, når du får en billet fra ventelisten.'})
        })

        it.each([
            {entries: 1, missing: 'En skråner mangler billet'},
            {entries: 3, missing: 'Skrånere mangler billetter'}
        ])('the chef is asked for portions while $entries waits: $missing', ({entries, missing}) => {
            expect(SUPPLY_WORDS.chefAsk(entries)).toBe(`${missing} til din middag — har du mulighed for at mætte flere munde?`)
        })
    })

    describe('lockChip', () => {
        const dinner = DinnerEventFactory.dinnerEventAt(1, 1)

        it.each([
            {desc: 'tickets for sale count up', supply: lockedDinnerSupply({[ADULT]: 2}), chip: {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: '2'}},
            {desc: 'tickets for sale lead a waiting list', supply: lockedDinnerSupply({[CHILD]: 2}, {[ADULT]: 1}), chip: {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: '2'}},
            {desc: 'a waiting list shows the hourglass without a number', supply: lockedDinnerSupply({}, {[ADULT]: 3}), chip: {color: BOOKING_LOCK_STATUS.lockedWithQueue.color, icon: ICONS.waitlist}},
            {desc: 'neither leaves the closed chip without a number or a glyph', supply: lockedDinnerSupply(), chip: {color: BOOKING_LOCK_STATUS.locked.color}},
            {desc: 'an open dinner has no chip', supply: null, chip: null}
        ])('$desc', ({supply, chip}) => {
            expect(lockChip(dinner, new Map([[dinner.id, supply]]), new Date())).toEqual(chip)
        })

        it('a dinner outside the lock map has no chip', () => {
            expect(lockChip(dinner, new Map(), new Date())).toBeNull()
        })

        it('a dinner that has started has no chip, whatever its supply', () => {
            const started = DinnerEventFactory.dinnerEventAt(2, -1)
            expect(lockChip(started, new Map([[started.id, lockedDinnerSupply({[ADULT]: 2})]]), new Date())).toBeNull()
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
            const badges = createBookingBadges(farFutureDinner(), deadlines, new Date())
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
            const badges = createChefBadges(farFutureDinner(), deadlines, new Date())
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
            const badge = createChefBadges(farFutureDinner(overrides), deadlines, new Date()).get(step)!
            expect(badge.alarm).toBe(done ? -1 : 0)
            if (done) expect(badge.value).toBe('')
            else expect(badge.value).not.toBe('')
        })

        it('booking badge carries released ticket counts once booking is closed', () => {
            const yesterday = {...DinnerEventFactory.defaultDinnerEventDisplay(), date: addDays(new Date(), -1)}
            const badge = createChefBadges(yesterday, deadlines, new Date(), lockedDinnerSupply({[ADULT]: 2})).get(2)!
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
            {desc: 'a released ticket reads its state, claimed or not', overrides: {state: OrderState.RELEASED, provenanceHousehold: 'S31'}, shown: ORDER_STATE_LABELS[OrderState.RELEASED]},
            {desc: 'a closed ticket with Ingen reads released', overrides: {state: OrderState.CLOSED, dinnerMode: DinnerModeSchema.enum.NONE}, shown: ORDER_STATE_LABELS[OrderState.RELEASED]},
            {desc: 'a closed ticket with Spisesal reads closed', overrides: {state: OrderState.CLOSED, dinnerMode: DinnerModeSchema.enum.DINEIN}, shown: ORDER_STATE_LABELS[OrderState.CLOSED]}
        ])('$desc', ({overrides, shown}) => {
            expect(formatOrder(OrderFactory.defaultOrder(undefined, overrides)))
                .toMatchObject({stateText: shown.label, stateColor: shown.color, stateIcon: shown.icon, guest: null})
        })

        it('badges a guest ticket with its booker', () => {
            const formatted = formatOrder(OrderFactory.defaultOrder(undefined, {isGuestTicket: true}), 'Anna')
            expect(formatted.guest).toEqual({label: 'Gæst af Anna', color: COLOR.info, icon: ICONS.userPlus})
        })
    })

    // A billed line carries no order state; its eating mode, when its snapshot kept one, tells a released ticket
    describe('cost lines', () => {
        let formatCostLine: ReturnType<typeof useBookingUi>['formatCostLine']
        beforeAll(() => {
            ({formatCostLine} = useBookingUi())
        })
        const {DINEIN, TAKEAWAY, NONE} = DinnerModeSchema.enum

        it.each([
            {desc: 'a billed released ticket reads released', line: {dinnerMode: NONE}, shown: ORDER_STATE_LABELS[OrderState.RELEASED], mode: undefined},
            {desc: 'a billed eaten ticket reads closed', line: {dinnerMode: TAKEAWAY}, shown: ORDER_STATE_LABELS[OrderState.CLOSED], mode: undefined},
            {desc: 'a billed ticket whose snapshot has no mode reads closed', line: {dinnerMode: null}, shown: ORDER_STATE_LABELS[OrderState.CLOSED], mode: undefined},
            {desc: 'a live order reads its state and shows its mode', line: {state: OrderState.BOOKED, dinnerMode: DINEIN}, shown: ORDER_STATE_LABELS[OrderState.BOOKED], mode: DINEIN}
        ])('$desc', ({line, shown, mode}) => {
            expect(formatCostLine(line)).toMatchObject({stateText: shown.label, stateColor: shown.color, stateIcon: shown.icon, guest: null})
            expect(costLineMode(line)).toBe(mode)
        })
    })
})

// What the save does, read from the preview's reply: its first supply outcome, else a mode change
describe('previewSaveOutcome', () => {
    const replyOf = (...actions: BookingAction[]) =>
        OrderFactory.defaultScaffoldResult({results: actions.map(action => OrderFactory.defaultBookingResult({action}))})

    it.each([
        {desc: 'a new ticket before the deadline', actions: [Action.BOOK], outcome: Action.BOOK},
        {desc: 'a ticket for sale bought', actions: [Action.BUY], outcome: Action.BUY},
        {desc: 'a place on the waiting list', actions: [Action.QUEUE], outcome: Action.QUEUE},
        {desc: 'guests where the first buys and the next queues', actions: [Action.BUY, Action.QUEUE], outcome: Action.BUY},
        {desc: 'Ingen on a queued row', actions: [Action.LEAVE], outcome: Action.LEAVE},
        {desc: 'a new wish on a queued row', actions: [Action.REQUEUE], outcome: Action.REQUEUE},
        {desc: 'a mode change on a held ticket', actions: [Action.CHANGE_MODE], outcome: Action.CHANGE_MODE},
        {desc: 'a ticket released', actions: [Action.RELEASE], outcome: Action.CHANGE_MODE},
        {desc: 'a reply without results', actions: [], outcome: Action.CHANGE_MODE}
    ])('$desc → $outcome', ({actions, outcome}) => {
        expect(previewSaveOutcome(replyOf(...actions))).toBe(outcome)
    })
})

describe('ticket type presentation', () => {
    const {TICKET_TYPE_COLORS, TICKET_TYPE_ICONS} = useTheSlopeDesignSystem()
    const prices = TicketFactory.defaultTicketPrices()

    it.each(TicketTypeSchema.options)('%s shows its words with the design system colour and glyph of its type', (ticketType) => {
        expect(ticketTypePresentation(ticketType)).toEqual({
            label: ticketTypeLabel(ticketType), color: TICKET_TYPE_COLORS[ticketType], icon: TICKET_TYPE_ICONS[ticketType]
        })
    })

    it('a price row shows the presentation of its ticket type; no row shows none', () => {
        expect(ticketPricePresentation(TicketFactory.defaultPriceOf(TicketTypeSchema.enum.BABY)))
            .toEqual(ticketTypePresentation(TicketTypeSchema.enum.BABY))
        expect(ticketPricePresentation(undefined)).toBeNull()
    })

    it('a person shows the presentation of the ticket type they resolve to', () => {
        expect(resolveTicketTypePresentation(new Date('2017-01-01'), prices, new Date('2025-01-15')))
            .toEqual(ticketTypePresentation(TicketTypeSchema.enum.CHILD))
    })

    it('a price as a select item carries its type presentation, its label with the price, and its age limit with its description', () => {
        const child = TicketFactory.defaultPriceOf(TicketTypeSchema.enum.CHILD)
        const item = ticketPriceSelectItems([child])[0]!
        expect(item.presentation).toEqual(ticketTypePresentation(TicketTypeSchema.enum.CHILD))
        expect(item.label).toBe(`${ticketTypeLabel(TicketTypeSchema.enum.CHILD)} · ${useTicket().formatPrice(child.price)} kr`)
        expect(item.description).toBe(`Under ${child.maximumAgeLimit} år · ${child.description}`)
        expect(ticketPriceSelectItems([child], true)[0]!.description).toBeUndefined()
    })
})

// Every toast that reports a booking result: the ticket, red as soon as one order failed, one line per day
describe('scaffoldToastLook', () => {
    it.each([
        {desc: 'a run with a failed order', errored: 1, color: COLOR.error},
        {desc: 'a run where every order landed', errored: 0, color: COLOR.success}
    ])('$desc toasts in $color with the ticket and breaks its lines', ({errored, color}) => {
        expect(scaffoldToastLook(OrderFactory.defaultScaffoldResult({errored}))).toEqual({color, icon: ICONS.ticket, ui: {description: COMPONENTS.bookingResult.lines}})
    })
})

// The season's prices a result carries, in the config's order: the baby who tastes, the hungry baby, the child, the adult
const [TASTING_TICKET, HUNGRY_TICKET, CHILD_TICKET, ADULT_TICKET] = TicketFactory.defaultTicketPrices() as [TicketPrice, TicketPrice, TicketPrice, TicketPrice]
// The people of a booking result: Anna and her guests of one ticket type and price, Lars, Knud and Lene
const adult = (inhabitantId: number, inhabitantName: string) => ({inhabitantId, inhabitantName, ticketType: ADULT, priceAtBooking: ADULT_TICKET.price})
const ANNA = adult(1, 'Anna')
const guestsOfAnna = ({ticketType, price}: TicketPrice) => ({...ANNA, isGuestTicket: true, ticketType, priceAtBooking: price})
const LARS = adult(2, 'Lars')
const KNUD = adult(3, 'Knud')
const LENE = adult(4, 'Lene')
type Person = Pick<BookingResult, 'inhabitantId' | 'inhabitantName' | 'ticketType'> & {isGuestTicket?: boolean, priceAtBooking: number}

// One order's result per action listed, all on one dinner: a booker's guests at one table
const resultsOnDinner = (dinnerEventId: number, person: Person, ...actions: BookingAction[]): BookingResult[] =>
    actions.map(action => OrderFactory.defaultBookingResult({...person, dinnerEventId, action}))
// One order's result per dinner listed, all with one action
const resultsAt = (person: Person, action: BookingAction, ...dinnerEventIds: number[]): BookingResult[] =>
    dinnerEventIds.map(dinnerEventId => OrderFactory.defaultBookingResult({...person, dinnerEventId, action}))
const placeOf = (person: Person, position: number, dinnerEventId = 1): QueuePosition =>
    ({inhabitantId: person.inhabitantId, dinnerEventId, isGuestTicket: !!person.isGuestTicket, position, ticketType: person.ticketType, priceAtBooking: person.priceAtBooking})
const soldToWaitlist = (count: number, dinnerEventId = 1) =>
    Array.from({length: count}, (_, index) => ({
        dinnerEventId, ticketPriceId: 1, orderId: 80 + index, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false, buyerInhabitantId: 9, buyerHouseholdId: 2,
        sellerHouseholdId: 1, sellerInhabitantId: 8
    }))
const run = (overrides: Parameters<typeof OrderFactory.defaultScaffoldResult>[0]) => OrderFactory.defaultScaffoldResult(overrides)
// A run's outcomes with the tickets it sold to the waiting list
const withSold = (waitlistTicketsSold: ReturnType<typeof soldToWaitlist>) => ({...run({}).outcomes, waitlistTicketsSold})

// The dinners a booking result names: one a week from Monday 19/10/2026, and 13/01/2027; the day each line starts with
const RESULT_DINNERS = [...[19, 26, 33, 40].map((day, index) => ({id: 11 + index, date: new Date(2026, 9, day)})), {id: 15, date: new Date(2027, 0, 13)}]
const dayOf = (dinnerEventId: number) => formatDate(RESULT_DINNERS.find(({id}) => id === dinnerEventId)!.date, DATE_SETTINGS.DAY_MONTH_MASK)
const inResultDays = (overrides: Parameters<typeof OrderFactory.defaultScaffoldResult>[0]) => run({dinners: RESULT_DINNERS, ...overrides})
// A ticket the person released, sold on the dinner: to the waiting list or to a claim
const saleOf = (seller: Person, dinnerEventId: number) =>
    ({
        dinnerEventId, ticketPriceId: 1, orderId: 80, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false, buyerInhabitantId: 9, buyerHouseholdId: 2, sellerHouseholdId: 1,
        sellerInhabitantId: seller.inhabitantId
    })

// The toast and the "Sidste ændring" alerts: the preview compacted, a line per day
describe('formatResultLines', () => {
    const SKRAANINGEN = adult(5, 'Skraaningen')
    const MARIE = adult(6, 'Marie')
    const BO = adult(7, 'Bo')
    const CARL = adult(8, 'Carl')
    const HOUSEHOLD = [ANNA, LARS, KNUD, LENE, SKRAANINGEN, MARIE, BO, CARL].map(person => person.inhabitantId)
    const conflictsAt = (person: Person, action: BookingAction, dinnerEventId: number): BookingResult[] =>
        resultsAt(person, action, dinnerEventId).map(result => ({...result, reason: useBookingValidation().BookingFailureSchema.enum.CONFLICT}))

    it.each([
        {
            // The mockup's preference change: the results name each person's dinners in turn, the days gather them; a
            // released ticket carries its fate in the word of the names that share it; a line's groups stand apart by " · "
            desc: 'released tickets sold or still for sale, and cancellations, a line per day',
            result: inResultDays({
                results: [...resultsAt(SKRAANINGEN, Action.RELEASE, 11, 12), ...resultsAt(SKRAANINGEN, Action.CANCEL, 13, 14), ...resultsAt(MARIE, Action.RELEASE, 11, 12), ...resultsAt(MARIE, Action.CANCEL, 13, 14)],
                outcomes: {...run({}).outcomes, waitlistTicketsSold: [saleOf(SKRAANINGEN, 11), saleOf(MARIE, 11), saleOf(SKRAANINGEN, 12)]}
            }),
            text: () => [
                `${dayOf(11)}  frigivet (solgt): Skraaningen, Marie`,
                `${dayOf(12)}  frigivet (solgt): Skraaningen · frigivet (til salg): Marie`,
                `${dayOf(13)}  frameldt: Skraaningen, Marie`,
                `${dayOf(14)}  frameldt: Skraaningen, Marie`
            ].join('\n')
        },
        {
            // The mockup's red toast: the failed orders are the day's last group, under their word
            desc: 'a mode change beside a failed order',
            result: inResultDays({
                results: [...resultsAt(BO, Action.CHANGE_MODE, 15), ...resultsAt(ANNA, Action.CHANGE_MODE, 15)],
                failed: resultsAt(CARL, Action.CHANGE_MODE, 15),
                errored: 1
            }),
            text: () => `${dayOf(15)}  ændret spisemåde: Anna, Bo · FEJLET: Carl`
        },
        {
            // A claim of the same run buys the released ticket: sold, as to the waiting list
            desc: 'a released ticket bought by a claim',
            result: inResultDays({
                results: [...resultsAt(LARS, Action.BUY, 11), ...resultsAt(ANNA, Action.RELEASE, 11)],
                outcomes: {...run({}).outcomes, ticketsSold: [saleOf(ANNA, 11)]}
            }),
            text: () => `${dayOf(11)}  frigivet (solgt): Anna · købt: Lars`
        },
        {
            desc: 'a day\'s actions in the word table\'s order, the people in the household\'s order',
            result: inResultDays({results: [...resultsAt(LARS, Action.CANCEL, 11), ...resultsAt(KNUD, Action.BOOK, 11), ...resultsAt(ANNA, Action.BOOK, 11)]}),
            text: () => `${dayOf(11)}  tilmeldt: Anna, Knud · frameldt: Lars`
        },
        {
            // A booker's guests of one ticket type and price at one dinner are one name, named by the ticket and counted
            desc: 'a booker\'s guests after the booker',
            result: inResultDays({results: [...resultsOnDinner(11, guestsOfAnna(CHILD_TICKET), Action.BOOK, Action.BOOK), ...resultsAt(ANNA, Action.BOOK, 11)]}),
            text: () => `${dayOf(11)}  tilmeldt: Anna, Gæst af Anna (Barn · 17 kr ×2)`
        },
        {
            // A place on the waiting list follows its person's name
            desc: 'places on the waiting list',
            result: inResultDays({
                results: [...resultsAt(ANNA, Action.QUEUE, 11, 12), ...resultsAt(guestsOfAnna(ADULT_TICKET), Action.QUEUE, 12)],
                positions: [placeOf(ANNA, 5, 12), placeOf(guestsOfAnna(ADULT_TICKET), 6, 12), placeOf(ANNA, 3, 11)]
            }),
            text: () => [
                `${dayOf(11)}  på ventelisten: Anna (Voksen #3)`,
                `${dayOf(12)}  på ventelisten: Anna (Voksen #5), Gæst af Anna (Voksen · 40 kr) (Voksen #6)`
            ].join('\n')
        },
        {
            // The failed orders close their day; a place being assigned refuses its leave and says so
            desc: 'failed orders and a refused leave of a place being assigned',
            result: inResultDays({
                results: resultsAt(KNUD, Action.BOOK, 11),
                failed: [...resultsAt(LENE, Action.BOOK, 11), ...conflictsAt(ANNA, Action.LEAVE, 12)],
                errored: 2
            }),
            text: () => [`${dayOf(11)}  tilmeldt: Knud · FEJLET: Lene`, `${dayOf(12)}  FEJLET: Anna (pladsen er ved at blive tildelt)`].join('\n')
        },
        {
            // A household whose run failed as a whole names no person; the household lines follow the days
            desc: 'unchanged orders and a household that failed beside the orders that landed',
            result: inResultDays({results: resultsAt(KNUD, Action.BOOK, 11), unchanged: 3, errored: 1}),
            text: () => `${dayOf(11)}  tilmeldt: Knud\n3 uændret\nBookingen fejlede`
        },
        {
            // A ticket sold that the run did not release has no line of its own
            desc: 'tickets sold to the waiting list and nothing else changed',
            result: inResultDays({unchanged: 5, outcomes: withSold(soldToWaitlist(2, 11))}),
            text: () => '5 uændret'
        },
        {
            desc: 'nothing changed',
            result: inResultDays({}),
            text: () => 'Der var ingen ændringer i dine bookinger'
        }
    ])('$desc', ({result, text}) => {
        expect(formatResultLines(result, HOUSEHOLD)).toBe(text())
    })
})

// Every toast that reports a booking result: the view's title, the result's lines, the look of the result
describe('scaffoldToast', () => {
    it.each([
        {desc: 'a run where every order landed', result: inResultDays({results: resultsAt(ANNA, Action.BOOK, 11)})},
        {desc: 'a run with a failed order', result: inResultDays({failed: resultsAt(ANNA, Action.BOOK, 11), errored: 1})}
    ])('$desc toasts the view\'s title with the result\'s lines in the result\'s look', ({result}) => {
        expect(scaffoldToast('Præferencer opdateret', result, [ANNA.inhabitantId]))
            .toEqual({title: 'Præferencer opdateret', description: formatResultLines(result, [ANNA.inhabitantId]), ...scaffoldToastLook(result)})
    })
})

// The preview of a booking: a day per dinner, ascending; within a day a line per action in the word table's order,
// then per person in the household's order; the tickets sold to the waiting list last in their day
describe('formatPreviewLines', () => {
    const {TAKEAWAY} = DinnerModeSchema.enum
    // The dinners a preview's run decided, one a day from 19/10/2026
    const dinners = Array.from({length: 8}, (_, index) => ({id: index + 1, date: new Date(2026, 9, 19 + index)}))
    const dateOf = (dinnerEventId: number) => dinners[dinnerEventId - 1]!.date
    const inDays = (overrides: Parameters<typeof OrderFactory.defaultScaffoldResult>[0]) => run({dinners, ...overrides})
    const HOUSEHOLD = [ANNA, LARS, KNUD].map(person => person.inhabitantId)
    // Each day's lines, keyed by its dinner
    const daysOf = (days: ReturnType<typeof formatPreviewLines>) => days.map(({dinnerEventId, lines}) => ({dinnerEventId, lines: lines.map(line => line.text)}))

    it.each([
        {
            // The mockup's grid power mode: the results name each person's dinners in turn, the days gather them
            desc: 'a day per dinner, its people in the household\'s order',
            results: [...resultsAt(LARS, Action.CHANGE_MODE, 4), ...resultsAt(LARS, Action.RELEASE, 5), ...resultsAt(ANNA, Action.CHANGE_MODE, 4), ...resultsAt(ANNA, Action.RELEASE, 5)]
                .map(result => ({...result, dinnerMode: TAKEAWAY})),
            days: [
                {dinnerEventId: 4, lines: [`Anna ændrer spisemåde til ${MODE_WORDS[TAKEAWAY].label}`, `Lars ændrer spisemåde til ${MODE_WORDS[TAKEAWAY].label}`]},
                {dinnerEventId: 5, lines: ['Anna frigiver sin billet', 'Lars frigiver sin billet']}
            ]
        },
        {
            desc: 'the days ascending, each day\'s lines per action in the word table\'s order',
            results: [...resultsAt(KNUD, Action.CANCEL, 3), ...resultsAt(LARS, Action.CANCEL, 1), ...resultsAt(KNUD, Action.BOOK, 1), ...resultsAt(ANNA, Action.BOOK, 1)],
            days: [
                {dinnerEventId: 1, lines: ['Anna tilmeldes', 'Knud tilmeldes', 'Lars frameldes']},
                {dinnerEventId: 3, lines: ['Knud frameldes']}
            ]
        },
        {
            // A booker's guests of one ticket type and price at one dinner are one group, named by the ticket and counted
            desc: 'a booker\'s guests after the booker',
            results: [...resultsOnDinner(1, guestsOfAnna(TASTING_TICKET), Action.BOOK, Action.BOOK), ...resultsAt(ANNA, Action.BOOK, 1), ...resultsAt(guestsOfAnna(TASTING_TICKET), Action.BOOK, 2)],
            days: [
                {dinnerEventId: 1, lines: ['Anna tilmeldes', 'Gæst af Anna (Baby · 0 kr ×2) tilmeldes']},
                {dinnerEventId: 2, lines: ['Gæst af Anna (Baby · 0 kr) tilmeldes']}
            ]
        },
        {
            // One group per ticket type and price, in the order the results name them
            desc: 'a booker\'s guests of two ticket types at one dinner',
            results: [...resultsOnDinner(1, guestsOfAnna(CHILD_TICKET), Action.BOOK, Action.BOOK), ...resultsOnDinner(1, guestsOfAnna(ADULT_TICKET), Action.BOOK)],
            days: [{dinnerEventId: 1, lines: ['Gæst af Anna (Barn · 17 kr ×2) tilmeldes', 'Gæst af Anna (Voksen · 40 kr) tilmeldes']}]
        },
        {
            desc: 'a booker\'s guests of one ticket type at two prices at one dinner',
            results: [...resultsOnDinner(1, guestsOfAnna(TASTING_TICKET), Action.BOOK), ...resultsOnDinner(1, guestsOfAnna(HUNGRY_TICKET), Action.BOOK)],
            days: [{dinnerEventId: 1, lines: ['Gæst af Anna (Baby · 0 kr) tilmeldes', 'Gæst af Anna (Baby · 9 kr) tilmeldes']}]
        },
        {
            // A baby who tastes books at any time; the hungry baby's place is the one of its type and price
            desc: 'a booker\'s baby who tastes booked and hungry baby queued at one dinner',
            results: [...resultsOnDinner(1, guestsOfAnna(TASTING_TICKET), Action.BOOK), ...resultsOnDinner(1, guestsOfAnna(HUNGRY_TICKET), Action.QUEUE)],
            positions: [placeOf(guestsOfAnna(HUNGRY_TICKET), 2)],
            days: [{dinnerEventId: 1, lines: ['Gæst af Anna (Baby · 0 kr) tilmeldes', 'Gæst af Anna (Baby · 9 kr) skrives på ventelisten (Baby #2)']}]
        },
        {
            // The save buys the one ticket for sale for the first guest and queues the rest: a group per action
            desc: 'a booker\'s guests of one ticket type split by what the save does for them',
            results: resultsOnDinner(1, guestsOfAnna(ADULT_TICKET), Action.BUY, Action.QUEUE, Action.QUEUE),
            days: [{dinnerEventId: 1, lines: ['Gæst af Anna (Voksen · 40 kr) køber en billet til salg', 'Gæst af Anna (Voksen · 40 kr ×2) skrives på ventelisten']}]
        },
        {
            // A ticket type the result no longer names leaves the guests their count
            desc: 'a booker\'s guests whose ticket type is gone',
            results: [...resultsOnDinner(1, {...ANNA, isGuestTicket: true, ticketType: null}, Action.BOOK, Action.BOOK, Action.BOOK), ...resultsAt({...ANNA, isGuestTicket: true, ticketType: null}, Action.BOOK, 2)],
            days: [{dinnerEventId: 1, lines: ['Gæst af Anna (×3) tilmeldes']}, {dinnerEventId: 2, lines: ['Gæst af Anna tilmeldes']}]
        },
        {
            desc: 'a ticket for sale bought',
            results: resultsAt(ANNA, Action.BUY, 1),
            days: [{dinnerEventId: 1, lines: ['Anna køber en billet til salg']}]
        },
        {
            // Each line carries its places on its dinner, ascending, as the toast names them
            desc: 'places on the waiting list',
            results: [...resultsAt(ANNA, Action.QUEUE, 2, 3), ...resultsAt(guestsOfAnna(ADULT_TICKET), Action.QUEUE, 3)],
            positions: [placeOf(ANNA, 5, 3), placeOf(guestsOfAnna(ADULT_TICKET), 6, 3), placeOf(ANNA, 3, 2)],
            days: [
                {dinnerEventId: 2, lines: ['Anna skrives på ventelisten (Voksen #3)']},
                {dinnerEventId: 3, lines: ['Anna skrives på ventelisten (Voksen #5)', 'Gæst af Anna (Voksen · 40 kr) skrives på ventelisten (Voksen #6)']}
            ]
        },
        {
            // The sale the save causes closes its day, after the actions that come later in the word table
            desc: 'a released ticket sold to the waiting list',
            results: [...resultsAt(ANNA, Action.RELEASE, 1), ...resultsAt(LARS, Action.CHANGE_MODE, 1)],
            sold: soldToWaitlist(1, 1),
            days: [{dinnerEventId: 1, lines: ['Anna frigiver sin billet', `Lars ændrer spisemåde til ${MODE_WORDS[DinnerModeSchema.enum.DINEIN].label}`, '1 billet sælges til ventelisten']}]
        },
        {
            desc: 'tickets sold to the waiting list on two dinners',
            results: [],
            sold: [...soldToWaitlist(2, 2), ...soldToWaitlist(1, 1)],
            days: [
                {dinnerEventId: 1, lines: ['1 billet sælges til ventelisten']},
                {dinnerEventId: 2, lines: ['2 billetter sælges til ventelisten']}
            ]
        },
        {
            desc: 'nothing to do',
            results: [],
            days: []
        }
    ])('$desc', ({results, positions = [], sold = [], days}) => {
        expect(daysOf(formatPreviewLines(inDays({results, positions, outcomes: withSold(sold)}), HOUSEHOLD))).toEqual(days)
    })

    // Each action's line: the person and the action's words, in the action's glyph and the colour of the order state it
    // leads to (a buy or a place on the waiting list wears the bought ticket's colour)
    const ACTION_TO_STATE = {
        [Action.BOOK]: OrderState.BOOKED,
        [Action.CANCEL]: OrderState.CANCELLED,
        [Action.RELEASE]: OrderState.RELEASED,
        [Action.RECLAIM]: OrderState.BOOKED,
        [Action.BUY]: TicketState.claimed,
        [Action.QUEUE]: TicketState.claimed,
        [Action.LEAVE]: OrderState.CANCELLED,
        [Action.REQUEUE]: TicketState.claimed,
        [Action.CHANGE_PRICE]: OrderState.CLOSED,
        [Action.CHANGE_MODE]: OrderState.CLOSED
    } as const satisfies Record<BookingAction, keyof typeof ORDER_STATE_LABELS>
    it.each(BookingActionSchema.options)('a %s line reads the person and the action\'s words in its glyph and colour', (action) => {
        const [day] = formatPreviewLines(inDays({results: resultsAt(ANNA, action, 1)}))
        expect(day!.lines).toEqual([{
            name: ANNA.inhabitantName,
            action,
            icon: ACTION_WORDS[action].icon,
            color: ORDER_STATE_LABELS[ACTION_TO_STATE[action]].color,
            text: `${ANNA.inhabitantName} ${ACTION_WORDS[action].preview({mode: MODE_WORDS[DinnerModeSchema.enum.DINEIN].label})}`
        }])
    })

    it('without the household\'s order the people keep the order the results first name them', () => {
        const days = formatPreviewLines(inDays({results: [...resultsAt(LARS, Action.BOOK, 1), ...resultsAt(ANNA, Action.BOOK, 1)]}))
        expect(daysOf(days)).toEqual([{dinnerEventId: 1, lines: ['Lars tilmeldes', 'Anna tilmeldes']}])
    })

    it('a day carries its dinner\'s date and its weekday with the date as the separator reads it', () => {
        const [day] = formatPreviewLines(inDays({results: resultsAt(ANNA, Action.BOOK, 4)}))
        expect(day).toMatchObject({date: dateOf(4), label: `${formatDate(dateOf(4), 'EEEEEE')} ${formatDate(dateOf(4))}`})
    })

    it('a ticket sold to the waiting list wears the glyph and the colour of a ticket bought', () => {
        const [day] = formatPreviewLines(inDays({results: resultsAt(ANNA, Action.BUY, 1), outcomes: withSold(soldToWaitlist(1, 1))}))
        const [bought, sold] = day!.lines
        expect(bought).toMatchObject({name: ANNA.inhabitantName, action: Action.BUY, icon: ACTION_WORDS[Action.BUY].icon})
        expect(sold).toMatchObject({action: Action.BUY, icon: bought!.icon, color: bought!.color})
    })
})

// A ticket's badge, in the day view and in the grid: its type and its price, then its guests
describe('ticketBadgeLabel', () => {
    it.each([
        {holder: 'a person', label: 'Voksen', price: 5500, guestCount: undefined, text: 'Voksen · 55 kr'},
        {holder: 'one guest', label: 'Baby', price: 900, guestCount: 1, text: 'Baby · 9 kr · Gæst'},
        {holder: 'two guests', label: 'Baby', price: 0, guestCount: 2, text: 'Baby · 0 kr · 2 Gæster'}
    ])('$label at $price øre for $holder reads "$text"', ({label, price, guestCount, text}) => {
        expect(ticketBadgeLabel(label, price, guestCount)).toBe(text)
    })
})

// A dry run with no orders names what the scaffold will book in the people's own cells
describe('expectedBookings', () => {
    const {DINEIN, TAKEAWAY, NONE} = DinnerModeSchema.enum
    it.each([
        {desc: 'an eating mode is the cell\'s expected booking', results: [OrderFactory.defaultBookingResult({...ANNA, dinnerEventId: 4, dinnerMode: TAKEAWAY})], expected: [[expectedBookingKey(ANNA.inhabitantId, 4), TAKEAWAY]]},
        {desc: 'Ingen expects no booking', results: [OrderFactory.defaultBookingResult({...ANNA, dinnerEventId: 4, dinnerMode: NONE, action: Action.CANCEL})], expected: []},
        {desc: 'a guest ticket is no person\'s own cell', results: [OrderFactory.defaultBookingResult({...guestsOfAnna(ADULT_TICKET), dinnerEventId: 4, dinnerMode: DINEIN})], expected: []},
        {desc: 'no reply yet expects nothing', results: null, expected: []}
    ])('$desc', ({results, expected}) => {
        expect([...expectedBookings(results === null ? null : run({results}))]).toEqual(expected)
    })
})

// What a person holds on a dinner: an order supersedes a place on the waiting list, a place supersedes the plan, and a
// guest ticket booked on the person is none of theirs
describe('personOnDinner', () => {
    const {DINEIN, DINEINLATE, TAKEAWAY, NONE} = DinnerModeSchema.enum
    const DINNER = 4
    const annaOrder = OrderFactory.defaultOrder('anna', {inhabitantId: ANNA.inhabitantId, dinnerEventId: DINNER, dinnerMode: TAKEAWAY})
    const annaGuest = OrderFactory.defaultOrder('anna-guest', {id: 2, inhabitantId: ANNA.inhabitantId, dinnerEventId: DINNER, isGuestTicket: true})
    const annaEntry = WaitlistFactory.defaultEntry({inhabitantId: ANNA.inhabitantId, dinnerEventId: DINNER, dinnerMode: DINEINLATE})
    const annaPlan = new Map([[expectedBookingKey(ANNA.inhabitantId, DINNER), DINEIN]])
    it.each([
        {holds: 'a ticket', orders: [annaOrder], entries: [annaEntry], plan: annaPlan,
            person: {order: annaOrder, waitlistEntry: undefined, expectedMode: undefined, heldMode: TAKEAWAY, shownMode: TAKEAWAY}},
        {holds: 'a place on the waiting list', orders: [], entries: [annaEntry], plan: annaPlan,
            person: {order: null, waitlistEntry: annaEntry, expectedMode: undefined, heldMode: DINEINLATE, shownMode: DINEINLATE}},
        {holds: 'a plan', orders: [], entries: [], plan: annaPlan,
            person: {order: null, waitlistEntry: undefined, expectedMode: DINEIN, heldMode: NONE, shownMode: DINEIN}},
        {holds: 'a guest ticket and a plan', orders: [annaGuest], entries: [], plan: annaPlan,
            person: {order: null, waitlistEntry: undefined, expectedMode: DINEIN, heldMode: NONE, shownMode: DINEIN}},
        {holds: 'nothing', orders: [], entries: [], plan: new Map(),
            person: {order: null, waitlistEntry: undefined, expectedMode: undefined, heldMode: NONE, shownMode: NONE}}
    ])('GIVEN Anna holds $holds THEN she shows $person.shownMode', ({orders, entries, plan, person}) => {
        expect(personOnDinner(orders, entries, plan)(ANNA.inhabitantId, DINNER)).toEqual(person)
    })
})

// The guest rows: a placed group per booker, ticket type, price and dinner, then one row per queued guest; a guest has
// no birth date, so the orders' price or the place's price row names the ticket type
describe('guestItemsOf', () => {
    const PRICES = TicketFactory.defaultTicketPrices()
    const guestOrder = (id: number) => OrderFactory.defaultOrder(`guest-${id}`, {id, inhabitantId: ANNA.inhabitantId, isGuestTicket: true, ticketType: CHILD, priceAtBooking: CHILD_TICKET.price, ticketPriceId: CHILD_TICKET.id!})
    const [firstGuest, secondGuest] = [guestOrder(21), guestOrder(22)]
    const ownOrder = OrderFactory.defaultOrder('own', {id: 23, inhabitantId: ANNA.inhabitantId})
    const queuedGuest = WaitlistFactory.defaultEntry({id: 31, inhabitantId: ANNA.inhabitantId, isGuestTicket: true, ticketPrice: HUNGRY_TICKET})
    const ownEntry = WaitlistFactory.defaultEntry({id: 32, inhabitantId: ANNA.inhabitantId})
    const placed = {id: expect.stringMatching(/^guest-group-/), orders: [firstGuest, secondGuest], waitlistEntry: undefined, held: firstGuest, ticketPrice: CHILD_TICKET}
    const queued = {id: `guest-entry-${queuedGuest.id}`, orders: [], waitlistEntry: queuedGuest, held: queuedGuest.order, ticketPrice: HUNGRY_TICKET}
    it.each([
        {given: 'two guest tickets of one group and the booker\'s own', orders: [firstGuest, ownOrder, secondGuest], entries: [], items: [placed]},
        {given: 'a queued guest and the booker\'s own place', orders: [], entries: [ownEntry, queuedGuest], items: [queued]},
        {given: 'a queued guest and a placed group', orders: [firstGuest, secondGuest], entries: [queuedGuest], items: [placed, queued]},
        {given: 'only the booker\'s own ticket and place', orders: [ownOrder], entries: [ownEntry], items: []}
    ])('GIVEN $given THEN the guest rows are the placed groups, then the queued guests', ({orders, entries, items}) => {
        expect(guestItemsOf(orders, entries, PRICES)).toEqual(items)
    })
})

// Billetændringer's Husstand: the system's line over several reads System; a user's line over more than two reads the
// first two and a control that opens the rest
describe('ticketChangeHouseholds', () => {
    const WORDS = BOOKING_WORDS.ticketChange
    const FIVE = ['S_14', 'S_22', 'S_31', 'S_32', 'S_40']
    it.each([
        {line: 'the system\'s over several, folded', households: FIVE, bySystem: true, open: false, shown: {names: WORDS.bySystem}},
        {line: 'the system\'s over several, open', households: FIVE, bySystem: true, open: true, shown: {names: WORDS.bySystem}},
        {line: 'the system\'s over one', households: ['S_31'], bySystem: true, open: false, shown: {names: 'S_31'}},
        {line: 'a user\'s over one', households: ['S_14'], bySystem: false, open: false, shown: {names: 'S_14'}},
        {line: 'a user\'s over two', households: ['S_31', 'S_22'], bySystem: false, open: false, shown: {names: 'S_31, S_22'}},
        {line: 'a user\'s over five, folded', households: FIVE, bySystem: false, open: false,
            shown: {names: 'S_14, S_22', toggle: {label: WORDS.households.more(3), ariaLabel: WORDS.households.toggle(false, 5)}}},
        {line: 'a user\'s over five, open', households: FIVE, bySystem: false, open: true,
            shown: {names: 'S_14, S_22, S_31, S_32, S_40', toggle: {label: WORDS.households.fewer, ariaLabel: WORDS.households.toggle(true, 5)}}}
    ])('$line reads "$shown.names"', ({households, bySystem, open, shown}) => {
        expect(ticketChangeHouseholds(OrderFactory.defaultTicketChange({households, bySystem}), open)).toEqual(shown)
    })
})
