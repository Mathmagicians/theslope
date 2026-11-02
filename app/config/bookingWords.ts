/**
 * The booking words users read. Plain module without auto-imports: the app and the server import it.
 */
import {useBookingValidation, DinnerMode, DinnerState, OrderAuditAction, OrderState, TicketState, type BookingAction, type BookingOutcome} from '~/composables/useBookingValidation'
import {useBillingValidation, type VatMode} from '~/composables/useBillingValidation'
import {PRICE_WORDS} from '~/config/priceWords'
import {ADMIN_WORDS} from '~/config/adminWords'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'
import {CHEF_DEADLINE_WORDS} from '~/config/notificationTemplates'

const {BookingActionSchema, TicketChangeKindSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const TicketChangeKind = TicketChangeKindSchema.enum
const VatModeValue = useBillingValidation().VatModeSchema.enum

const ticketCount = (count: number) => `${count} billet${count === 1 ? '' : 'ter'}`
const roundPeriod = (range: string) => `periode ${range}`
const waitlistPayment = 'Du betaler, når du får en billet fra ventelisten.'
const releasedPayment = 'Du betaler, medmindre andre køber'
const releasedWord = 'Frigivet'
const claimedWord = 'Købt fra anden'
const guestOf = 'Gæst af'
const dateColumn = 'Dato'
const pbsInvoice = 'PBS Faktura'
const unknown = 'Ukendt'
const missingPrice = (who: string) => `Kan ikke booke: mangler billetpris for ${who}`
const total = 'Total'
const dinnerWord = 'Fællesspisning'
const ticketTypeWord = 'Billettype'
const guestWord = 'Gæst'
const updateWord = 'Opdater'
const scheduledWord = 'Planlagt'
const consumedWord = 'Afholdt'
const cancellationWord = 'Framelding'
const inCalendar = 'Fællesspisningen er i kalenderen'
const placeBeingAssigned = 'pladsen er ved at blive tildelt'
const revenueWord = 'Indtægter'
const deadlineIn = 'om'

export const BOOKING_WORDS = {
    /** A dinner's name while the chef has written no menu */
    untitledDinner: dinnerWord,
    /** A ticket's type, as a field and a column name it */
    ticketType: ticketTypeWord,
    /** The dates a team's cooking round spans, after the team's badge in the Budget pane */
    roundPeriod,
    /** The heading of a team's cooking round in the Madbestilling hint: the team and the dates it cooks */
    roundHeading: (team: string, range: string) => `${team}, ${roundPeriod(range)}`,
    /** The figures under a block of spending lines */
    allowance: {budget: 'Rådighedsbeløb', spent: 'Brugt', left: 'Tilbage'},
    /** The units a split amount reads in (VatAmount): the ex moms figure, then the inkl. moms half */
    vatUnits: 'ex / inkl. moms',
    /**
     * The chef's Budget pane: its title and chevron, the three boxes with the kuverter and the contribution's rate, the
     * ticket table and its sums; the spending tables' columns (CookingRoundSpending, ExpenseLines); the receipt form's
     * units and placeholders, and the line under the amount that reads it in the other unit, keyed by the unit typed
     */
    budget: {
        title: 'Budget',
        toggle: (open: boolean) => open ? 'Skjul budgettet' : 'Vis budgettet',
        boxes: {revenue: 'INDTÆGTER', allowance: 'RÅDIGHEDSBELØB', contribution: 'KØKKENBIDRAG'},
        portions: (portions: string) => `${portions} kuverter`,
        contributionRate: (percent: number) => `${percent}% af indtægter`,
        ticketColumns: {ticketType: ticketTypeWord, count: 'Antal', unitPrice: 'Stk pris', revenue: total},
        revenue: revenueWord,
        contribution: (percent: number) => `Køkkenbidrag (${percent}%)`,
        columns: {date: dateColumn, dinner: 'Middag', payer: 'Bestiller', note: 'Note'},
        vatModes: {
            [VatModeValue.inkl]: 'Inkl. moms',
            [VatModeValue.ex]: 'Ex moms'
        } satisfies Record<VatMode, string>,
        otherUnit: {
            [VatModeValue.ex]: (amount: string) => `= ${PRICE_WORDS.kroner(amount)} inkl. moms`,
            [VatModeValue.inkl]: (amount: string) => `= ${PRICE_WORDS.kroner(amount)} ex moms`
        } satisfies Record<VatMode, (amount: string) => string>,
        placeholders: {amount: 'beløb', note: 'note'}
    },
    /** A ticket price in a select menu: the age limit beside its description */
    ticketPrice: {
        ageLimit: (years: number) => `Under ${years} år`
    },
    /** A cost line's ticket badge when its ticket type is gone */
    unknownTicketType: unknown,
    ticketCount,
    /**
     * The guest form's fields: the eating mode, the number of guests, the ticket type with its placeholder and the
     * allergies; its rules: the number of guests, their ticket type and their eating mode
     */
    guestForm: {
        fields: {
            dinnerMode: 'Hvordan spiser I?',
            count: 'Antal gæster',
            ticketType: ticketTypeWord,
            ticketTypePlaceholder: 'Vælg billettype...',
            allergies: 'Allergier (valgfrit)'
        },
        countMissing: 'Indtast antal gæster',
        countNotInteger: 'Skal være et helt tal',
        countMin: 'Minimum 1 gæst',
        countMax: 'Maximum 10 gæster',
        ticketPriceMissing: 'Vælg en billettype',
        dinnerModeMissing: 'Gæster skal vælge en spisemåde'
    },
    /**
     * The economy views (HouseholdEconomy, AdminEconomy, the public billing page): a billing period's title, a
     * household's closed on its PBS invoice or the one running, the admin's settled or the next; a period's badge; the
     * counts the boxes read; the tables' columns; the facts of a billing summary; the cards' titles and sum lines; the
     * toggles that open a row's orders or transactions; the searches; a household's invoice by its payment month; the
     * share with the accountant and the share popover's links; the admin's correction of a dinner's bookings and the
     * address of a household the list lacks; the accountant's page; a failed read
     */
    billing: {
        period: {closed: pbsInvoice, open: 'Aktuel periode', settled: 'Samlet PBS Afregning', next: 'Næste PBS'},
        state: {running: 'Igangværende', closed: 'Afsluttet'},
        stats: {households: ADMIN_WORDS.tabs.households, dinners: 'Middage', tickets: 'Kuverter', total},
        columns: {
            date: dateColumn,
            menu: 'Menu',
            amount: 'Beløb',
            status: 'Status',
            period: 'Periode',
            control: 'Kontrol',
            revenue: 'Omsætning',
            share: 'Del',
            address: HOUSEHOLD_WORDS.address,
            pbs: HOUSEHOLD_WORDS.pbs,
            pbsId: 'PBS ID'
        },
        summary: {billingPeriod: 'Forbrugsperiode', cutoffDate: 'Opgørelsesdato', paymentDate: 'PBS opkræves'},
        titles: {upcoming: 'Kommende', future: 'Fremtidige bestillinger', periods: 'Faktureringsperioder', invoices: 'Fakturaer'},
        sums: {expected: 'Forventet:', total: `${total}:`, households: (count: number) => `${total}: ${count} husstande`},
        show: {orders: 'Vis ordrer', transactions: 'Vis transaktioner'},
        search: {period: 'Søg periode...', household: 'Søg adresse eller navn...'},
        invoice: (month: string) => `${pbsInvoice} for ${month}`,
        share: 'Del med bogholder:',
        shareLinks: {
            openPublicPage: 'Åbn offentlig side',
            share: 'Del links',
            shareProminent: 'Del CSV',
            publicPage: 'Offentlig side:',
            csv: 'CSV download:'
        },
        correction: {
            label: 'Admin Korrektion',
            confirm: 'Klik igen for at rette',
            household: 'Vælg husstand:',
            householdPlaceholder: 'Vælg husstand...',
            toast: 'Administrator Korrektion'
        },
        publicPage: {
            title: 'PBS Fakturaoversigt',
            community: 'Skråningen Fællesspisning',
            notFound: {title: 'Link ikke fundet', description: 'Dette link er ugyldigt eller udløbet.'}
        },
        failed: {overview: 'Kunne ikke hente økonomioversigt', invoices: 'Kunne ikke hente fakturaoversigt'}
    },
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
    /**
     * Power mode, one row for the whole household: the booking grid's row name (`name`), the booking form's (`formName`),
     * the name of the booking form's face group, its expanded row's title, the household card's toggle, the save of the
     * booking form's and the household card's power row, and the power row's warning: its title on both, its description
     * on the booking form (the household card's is the preference editor's)
     */
    power: {
        name: 'Alle',
        formName: 'Hele familien',
        faces: HOUSEHOLD_WORDS.preferences.powerRow.faces,
        editTitle: 'Vælg for hele familien',
        toggle: 'Power mode',
        save: 'Gem for alle',
        alert: {
            title: 'Du er ved at aktivere power mode',
            description: (memberCount: number) => `Ændringer påvirker alle ${memberCount} medlemmer.`
        }
    },
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
        [Action.REQUEUE]: updateWord,
        [Action.CHANGE_MODE]: updateWord
    } satisfies Record<BookingOutcome, string>,
    /**
     * The guest form's button, a booker's guests of one ticket type counted in a preview or toast line, the guests a
     * ticket's badge names, a guest row's name, and the booker a guest comes with: before the booker's face in the
     * views (`of`), before the booker's name in a line (`ofBooker`), in place of a booker no longer in the household
     * (`unknownBooker`); the add-guest row's name and the guest form's title (`add`); a guest row's expanded title
     */
    guests: {
        add: 'Tilføj gæst',
        save: (count: number) => count === 1 ? 'Tilmeld gæst' : 'Tilmeld gæster',
        count: (count: number) => `×${count}`,
        label: (count: number) => count === 1 ? guestWord : `${count} Gæster`,
        name: guestWord,
        of: guestOf,
        ofBooker: (booker: string) => `${guestOf} ${booker}`,
        unknownBooker: 'ukendt',
        editTitle: 'Opdater gæstebillet'
    },
    /**
     * The booking form's inhabitant row: its expanded title; the name column's header on a phone, where the row carries
     * its tickets; a save that finds no ticket price for a person or a guest
     */
    bookingForm: {
        editTitle: (name: string) => `Vælg spisning for ${name}`,
        ticketsColumn: 'Billetter',
        missingPrice,
        missingGuestPrice: missingPrice('gæst')
    },
    /** A dinner's state as its badge names it */
    dinnerStates: {
        [DinnerState.SCHEDULED]: scheduledWord,
        [DinnerState.ANNOUNCED]: 'Annonceret',
        [DinnerState.CANCELLED]: 'Aflyst',
        [DinnerState.CONSUMED]: consumedWord
    } satisfies Record<DinnerState, string>,
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
        columns: {date: dateColumn, households: HOUSEHOLD_WORDS.household, performedBy: 'Af', change: 'Ændring', tickets: 'Billetter · kuverter', revenue: revenueWord},
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
        deadline: (moment: string) => `${cancellationWord} lukker · ${moment}`,
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
            [Action.LEAVE]: placeBeingAssigned,
            [Action.REQUEUE]: placeBeingAssigned
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
            openText: inCalendar,
            closedText: inCalendar
        },
        ANNOUNCED: {
            label: 'Menu',
            openText: 'Chefkokken publicerer sin menu',
            closedText: 'Chefkokken har publiceret sin menu',
            deadlinePrefix: deadlineIn
        },
        BOOKING_CLOSED: {
            label: cancellationWord,
            openText: 'Booking kan ændres',
            closedText: 'Lukket for framelding',
            deadlinePrefix: 'åben de næste'
        },
        GROCERIES_DONE: {
            label: CHEF_DEADLINE_WORDS.GROCERIES_DONE.title,
            openText: 'Chefkokken bestiller madvarer',
            closedText: 'Chefkokken har bestilt madvarer',
            deadlinePrefix: deadlineIn
        },
        CONSUMED: {
            label: 'Spisning',
            openText: 'Fællesspisning forude',
            closedText: 'Vi har spist den dejlige mad',
            deadlinePrefix: deadlineIn
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
        SCHEDULED: scheduledWord,
        ANNOUNCED: 'Publiceret',
        BOOKING_CLOSED: cancellationWord,
        GROCERIES_DONE: 'Madbestilling klar',
        CONSUMED: consumedWord
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
    /** The booking grid's footer under the names: the column's sums */
    gridSum: 'Sum',
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
