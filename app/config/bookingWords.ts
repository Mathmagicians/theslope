/**
 * The booking words users read. Plain module without auto-imports: the app and the server import it (ADR-017).
 */
import {useBookingValidation, DinnerMode, OrderAuditAction, OrderState, TicketState, type BookingAction, type BookingOutcome} from '~/composables/useBookingValidation'

const {BookingActionSchema, TicketChangeKindSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const TicketChangeKind = TicketChangeKindSchema.enum

const ticketCount = (count: number) => `${count} billet${count === 1 ? '' : 'ter'}`
const roundPeriod = (range: string) => `periode ${range}`
const waitlistPayment = 'Du betaler, når du får en billet fra ventelisten.'
const releasedPayment = 'Du betaler, medmindre andre køber'
const releasedWord = 'Frigivet'
const claimedWord = 'Købt fra anden'
const guestOf = 'Gæst af'

export const BOOKING_WORDS = {
    /** A dinner's name while the chef has written no menu */
    untitledDinner: 'Fællesspisning',
    /** The dates a team's cooking round spans, after the team's badge in the Budget pane */
    roundPeriod,
    /** The heading of a team's cooking round in the Madbestilling hint: the team and the dates it cooks */
    roundHeading: (team: string, range: string) => `${team}, ${roundPeriod(range)}`,
    /** The figures under a block of spending lines */
    allowance: {budget: 'Rådighedsbeløb', spent: 'Brugt', left: 'Tilbage'},
    /** The units a split amount reads in (VatAmount): the ex moms figure, then the inkl. moms half */
    vatUnits: 'ex / inkl. moms',
    /** A ticket price in a select menu: its type with its price, and the age limit beside its description */
    ticketPrice: {
        label: (ticketType: string, price: string) => `${ticketType} · ${price} kr`,
        ageLimit: (years: number) => `Under ${years} år`
    },
    ticketCount,
    /** A closed dinner's supply: the Framelding badge, the chef's waiting-list box, the household's notes, the booking form's alert */
    supply: {
        forSale: (tickets: string) => `${tickets} til salg`,
        queued: (tickets: string) => `${tickets} på venteliste`,
        onWaitlist: (tickets: string) => `${tickets} på ventelisten`,
        chefAsk: (entries: number) =>
            `${entries === 1 ? 'En skråner mangler billet' : 'Skrånere mangler billetter'} til din middag — har du mulighed for at mætte flere munde?`,
        householdReleased: (count: number) =>
            ({title: `Husstanden har frigivet ${ticketCount(count)}`, description: releasedPayment}),
        householdQueued: (count: number) =>
            ({title: `Husstanden står på ventelisten med ${ticketCount(count)}`, description: waitlistPayment}),
        /** What a place on the waiting list costs: the household's note and the join mail */
        waitlistPayment,
        moreTickets: 'Har du brug for flere billetter?'
    },
    /** A deadline badge's value line */
    badge: {open: 'Åben', closed: 'Lukket', closesIn: (countdown: string) => `lukker om ${countdown}`},
    /** An eating mode: DinnerModeSelector's label and the mode a preview line names */
    modes: {
        [DinnerMode.DINEIN]: 'Spisesal',
        [DinnerMode.DINEINLATE]: 'Sen',
        [DinnerMode.TAKEAWAY]: 'Takeaway',
        [DinnerMode.NONE]: 'Ingen'
    } satisfies Record<DinnerMode, string>,
    /** The eating mode of a household whose rows disagree: DinnerModeSelector's label in power mode and its legend entry */
    mixedModes: 'Blandet',
    /** A booking action: the preview line's words after the name, the toast's words after the count */
    actions: {
        [Action.BOOK]: {preview: () => 'tilmeldes', toast: 'tilmeldt'},
        [Action.CANCEL]: {preview: () => 'frameldes', toast: 'frameldt'},
        [Action.RELEASE]: {preview: () => 'frigiver sin billet', toast: 'frigivet'},
        [Action.RECLAIM]: {preview: () => 'tilmeldes igen', toast: 'tilmeldt igen'},
        [Action.BUY]: {preview: () => 'køber en billet til salg', toast: 'købt'},
        [Action.QUEUE]: {preview: () => 'skrives på ventelisten', toast: 'på ventelisten'},
        [Action.LEAVE]: {preview: () => 'forlader ventelisten', toast: 'forlod ventelisten'},
        [Action.REQUEUE]: {preview: ({mode}) => `ændrer spisemåde til ${mode} (venteliste)`, toast: 'ændret spisemåde (venteliste)'},
        [Action.CHANGE_PRICE]: {preview: () => 'ændrer billettype', toast: 'ændret billettype'},
        [Action.CHANGE_MODE]: {preview: ({mode}) => `ændrer spisemåde til ${mode}`, toast: 'ændret spisemåde'}
    } satisfies Record<BookingAction, {preview: (words: {mode: string}) => string, toast: string}>,
    /** The booking form's save button for each outcome */
    save: {
        [Action.BOOK]: 'Book',
        [Action.BUY]: 'Køb billet',
        [Action.QUEUE]: 'Skriv på venteliste',
        [Action.LEAVE]: 'Forlad ventelisten',
        [Action.REQUEUE]: 'Opdater',
        [Action.CHANGE_MODE]: 'Opdater'
    } satisfies Record<BookingOutcome, string>,
    /**
     * The guest form's button, a booker's guests of one ticket type counted in a preview or toast line, the guests a
     * ticket's badge names, a guest row's name, and the booker a guest comes with: before the booker's face in the
     * views (`of`), before the booker's name in a line (`ofBooker`)
     */
    guests: {
        save: (count: number) => count === 1 ? 'Tilmeld gæst' : 'Tilmeld gæster',
        count: (count: number) => `×${count}`,
        label: (count: number) => count === 1 ? 'Gæst' : `${count} Gæster`,
        name: 'Gæst',
        of: guestOf,
        ofBooker: (booker: string) => `${guestOf} ${booker}`
    },
    /** A ticket's state: CostLine and the order badges */
    orderStates: {
        [OrderState.BOOKED]: 'Bestilt',
        [OrderState.RELEASED]: releasedWord,
        [OrderState.CLOSED]: 'Lukket',
        [OrderState.CANCELLED]: 'Annulleret',
        [TicketState.claimed]: claimedWord,
        [TicketState.queued]: 'På venteliste'
    } satisfies Record<OrderState | typeof TicketState.claimed | typeof TicketState.queued, string>,
    /** An order history action */
    orderActions: {
        [OrderAuditAction.USER_BOOKED]: 'Bestilt',
        [OrderAuditAction.USER_CANCELLED]: 'Afmeldt',
        [OrderAuditAction.USER_CLAIMED]: claimedWord,
        [OrderAuditAction.SYSTEM_CREATED]: 'Automatisk bestilling',
        [OrderAuditAction.SYSTEM_DELETED]: 'Slettet',
        [OrderAuditAction.SYSTEM_UPDATED]: 'Opdateret'
    } satisfies Record<OrderAuditAction, string>,
    /**
     * Billetændringer: its title, toggle, failure and columns; the events beyond the actions' toast words, an admin's
     * correction after its event's word, the household a sale bought from, the system as an actor and as the household
     * of a line over several, the control that opens a user's line over many households; a line's kuverter, the moment
     * Framelding closes and the button to the older changes
     */
    ticketChange: {
        title: 'Se billetændringer',
        toggle: (open: boolean) => open ? 'Skjul billetændringer' : 'Vis billetændringer',
        failed: 'Kunne ikke hente billetændringer',
        columns: {date: 'Dato', households: 'Husstand', performedBy: 'Af', change: 'Ændring', tickets: 'Billetter · kuverter', revenue: 'Indtægter'},
        kinds: {
            [TicketChangeKind.CLOSE]: 'lukket',
            [TicketChangeKind.EXTRA_PORTIONS]: (booked: string) => `ekstra ${booked}`
        },
        adminCorrection: (word: string) => `${word}, ADMIN korrektion`,
        seller: (seller: string) => `fra ${seller}`,
        bySystem: 'System',
        // The control after the first households: the count of the rest while folded, its word while open, its label
        households: {
            more: (count: number) => `+${count}`,
            fewer: 'skjul',
            toggle: (open: boolean, count: number) => open ? 'Skjul husstande' : `Vis alle ${count} husstande`
        },
        portions: (portions: string) => `· ${portions} kuverter`,
        deadline: (moment: string) => `Framelding lukker · ${moment}`,
        more: 'Vis fuld historik'
    },
    /** Billetændringer's household of a ticket the history cannot attribute */
    unknownHousehold: '?',
    /** A ticket's state as a badge beside the name; its value reads the detail the row gives: the seller, the place in the line */
    ticketStateBadge: {
        [TicketState.released]: {value: () => releasedWord, helpText: releasedPayment},
        [TicketState.claimed]: {value: (household: string) => `fra ${household}`, helpText: claimedWord},
        [TicketState.queued]: {value: (place: string) => place, helpText: 'Du får automatisk tildelt en billet, hvis en kommer til salg, eller chefkokken frigiver portioner.'}
    } satisfies Record<Exclude<TicketState, typeof TicketState.normal>, {value: (detail: string) => string, helpText: string}>,
    /** A person's first dinner at a new ticket type, beside the name: "Voksen fra 04/11" */
    birthdayBadge: {label: 'Ny billetpris', from: (typeLabel: string, date: string) => `${typeLabel} fra ${date}`},
    /** A booking result's lines in the toast and the "Sidste ændring" alerts: the word of a day's failed orders */
    result: {
        failed: 'FEJLET',
        /** A leave or a change the waiting list refuses while a run assigns the place */
        conflict: {
            [Action.LEAVE]: 'pladsen er ved at blive tildelt',
            [Action.REQUEUE]: 'pladsen er ved at blive tildelt'
        },
        unchanged: (count: number) => `${count} uændret`,
        householdFailed: 'Bookingen fejlede',
        nothingChanged: 'Der var ingen ændringer i dine bookinger'
    },
    /** Tickets sold to the waiting list: the preview's words before the save */
    waitlistSale: {preview: 'sælges til ventelisten'},
    /** What became of a released ticket in the toast: sold in the run, or still for sale */
    releaseFate: {sold: 'solgt', forSale: 'til salg'},
    /** The preview of a save: its title, and the guest form's */
    preview: {title: 'Du er ved at ændre familiens booking', guestTitle: 'Du er ved at tilføje gæster'},
    /** Every preview while the server works out what the save does */
    preferencePreviewLoading: 'Prøver at beregne hvad I skal spise hvornår...',
    /** The legend entry of a cell without an order, showing the booking the preferences give it */
    expectedBooking: 'Forventet bestilling ifølge præferencer',
    /** The booking views' legend entries: a cell with unsaved changes, a place on the waiting list with its number, the birthday badge */
    legend: {modified: 'Ændret', waitlist: 'På venteliste (#n)', birthday: 'Ny billetpris fra fødselsdagen'},
    /** A cancelled dinner: the corner ribbon on the chef's card and the booking form, and the booking calendar's legend entry */
    cancelledDinner: {ribbon: 'AFLYST', legend: 'Aflyst fællesspisning'},
    /** The dinner calendar: its countdown's title and time label ("spisning kl 18:00"), and its accordion's title */
    calendar: {
        countdownTitle: 'Næste Fællesspisning',
        countdownTimeLabel: 'spisning',
        title: 'Fællesspisninger'
    },
    /** The booking calendar's legend: the dinners' day circles, and the lock chips of the tickets for sale and of the waiting list */
    calendarLegend: {
        next: 'Næste fællesspisning',
        planned: 'Planlagt fællesspisning',
        past: 'Tidligere fællesspisning',
        forSale: 'Billetter til salg',
        waitlist: 'Venteliste, ingen billetter til salg'
    },
    /**
     * A dinner's deadline badges and steps, the chef's and the household's. "Framelding", as the preferences sign everybody
     * up and the deadline is the one for cancelling
     */
    deadlineLabels: {
        SCHEDULED: {
            openText: 'Fællesspisningen er i kalenderen',
            closedText: 'Fællesspisningen er i kalenderen'
        },
        ANNOUNCED: {
            label: 'Menu',
            openText: 'Chefkokken publicerer sin menu',
            closedText: 'Chefkokken har publiceret sin menu',
            deadlinePrefix: 'om'
        },
        BOOKING_CLOSED: {
            label: 'Framelding',
            openText: 'Booking kan ændres',
            closedText: 'Lukket for framelding',
            deadlinePrefix: 'åben de næste'
        },
        GROCERIES_DONE: {
            label: 'Indkøb',
            openText: 'Chefkokken bestiller madvarer',
            closedText: 'Chefkokken har bestilt madvarer',
            deadlinePrefix: 'om'
        },
        CONSUMED: {
            label: 'Spisning',
            openText: 'Fællesspisning forude',
            closedText: 'Vi har spist den dejlige mad',
            deadlinePrefix: 'om'
        },
        // The booking view's eating mode badge (DinnerBookingForm and GuestBookingForm)
        DINING_MODE: {
            label: 'Hvordan spiser I',
            openText: 'Vælg mellem spisesal, sen eller takeaway',
            closedText: 'Du kan ikke længere ændre, hvordan I spiser'
        }
    },
    /** The title of each step of a dinner's progress */
    dinnerSteps: {
        SCHEDULED: 'Planlagt',
        ANNOUNCED: 'Publiceret',
        BOOKING_CLOSED: 'Framelding',
        GROCERIES_DONE: 'Madbestilling klar',
        CONSUMED: 'Afholdt'
    },
    /** A step the chef has not done by its deadline */
    stepOverdue: 'mangler',
    /** The booking toasts' titles, per view */
    toastTitles: {
        day: 'Booking opdateret',
        guest: 'Du får gæster til middag',
        booking: 'Booking processeret',
        grid: 'Bookinger processeret',
        powerMode: 'Bookinger opdateret for hele husstanden'
    },
    /** A failed read of the orders, the waiting lists or the dinner on view, and a failed save of the bookings */
    failed: {
        orders: 'Kunne ikke hente bookinger',
        waitlist: 'Kunne ikke hente ventelisten',
        dinner: 'Kunne ikke hente fællesspisning',
        save: 'Kunne ikke gemme bookinger'
    },
    /** What the URL names and is gone: the dinner on view; the admin economy's billing period and invoice, also on a failed read */
    notFound: {
        dinner: 'Kan ikke finde middagen',
        billingPeriod: 'Kan ikke finde faktureringsperioden',
        invoice: 'Kan ikke finde fakturaen'
    },
    /** The event a dinner is announced as in Heynabo: its name, place and description lines */
    heynaboEvent: {
        NAME: (menuTitle: string) => `Fællesspisning - ${menuTitle}`,
        LOCATION: 'Fælleshuset',
        CHEF_PREFIX: '👨‍🍳 Dagens chefkok:',
        BOOKING_TEXT: 'Du kan tilmelde/framelde dig middagen, ændre status til takeaway eller sen spisning, købe eller sælge billetter i Skrånerappen.',
        BOOKING_LINK_PREFIX: 'Klik her:',
        SIGNATURE_PREFIX: 'Kh',
        SIGNATURE_FALLBACK: 'Madholdet',
        SEPARATOR: '🍳🥘🍳🥘🍳🥘🍳🥘🍳',
        WARNING_ROBOT: '🤖 Denne begivenhed synkroniseres automatisk fra skraaningen.dk',
        WARNING_EDIT: '⚠️ Ret ikke i Heynabo - ændringer overskrives!'
    }
} as const
