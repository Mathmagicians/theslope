/**
 * E-mail templates per notification kind — theslope's config (spread into app.config `theslope.notifications`).
 *
 * `{{placeholder}}` values come from the event that raises the notification (server/utils/sender/events/*);
 * `senderName`, `site`, `environment` and `dedupeKey` are filled by composeEmail for every kind. The signature is appended
 * to every text. Plain module (not app.config itself) so unit tests can import the real templates.
 */
import type {SenderEvent} from '~/composables/useDeliveryValidation'
import {useNotificationValidation, type NotificationEnvironment} from '~/composables/useNotificationValidation'

const {EnvironmentSchema} = useNotificationValidation()

export const NOTIFICATION_SENDER_NAME = 'Skråningen'
export const NOTIFICATION_SENDER_DOMAIN = 'skraaningen.dk'

/** Sender address per environment — pinned by the sender binding's allowed_sender_addresses: `no-reply@` on prod, `no-reply.<environment>@` elsewhere */
export const senderAddress = (environment: NotificationEnvironment): string =>
    environment === EnvironmentSchema.enum.prod ? `no-reply@${NOTIFICATION_SENDER_DOMAIN}` : `no-reply.${environment}@${NOTIFICATION_SENDER_DOMAIN}`

/** Display name next to the sender address: `Skråningen <environment>` — the sender line tells the environments apart */
export const senderDisplayName = (environment: NotificationEnvironment): string => `${NOTIFICATION_SENDER_NAME} ${environment}`

export const NOTIFICATION_SIGNATURE = 'De bedste hilsner fra — {{senderName}} · {{site}}'

/** A ticket that became the person's, bought from the waiting list or directly: one mail reads both */
const TICKET_RECEIVED = {
    subject: '{{senderName}}: {{person}} har fået en billet til {{dinner}}',
    text: 'Kære {{name}},\n\n{{dinner}}\n{{person}}: 1 {{action}}\n{{ticket}}\nDu betaler for billetten. Vi glæder os til at se jer.\n\nSe bookingen: {{bookingUrl}}'
}

/** The buyer a sale to the waiting list names in the seller's mail */
export const WAITLIST_BUYER = 'ventelisten'

export const NOTIFICATION_TEMPLATES = {
    TEST: {
        subject: '{{senderName}}: testbesked fra theslope-sender ({{environment}})',
        text: 'Hejsa!\n\nDette er en testbesked sendt gennem theslope-sender.\n\nid: {{dedupeKey}}'
    },
    BILLING_PERIOD_CLOSED: {
        subject: '{{senderName}}: PBS-opgørelse {{billingPeriod}}',
        text: 'Hejsa,\n\nVedhæftet er PBS-opgørelsen for perioden {{billingPeriod}}: {{householdCount}} husstande, i alt {{totalAmount}} kr.\n\nOversigt: {{summaryUrl}}'
    },
    BILLING_PERIOD_UPDATED: {
        subject: '{{senderName}}: PBS-opgørelse {{billingPeriod}} — opdatering v{{version}}',
        text: 'Hejsa,\n\nPBS-opgørelsen for perioden {{billingPeriod}} er opdateret (version {{version}}) og erstatter den tidligere fremsendte: {{householdCount}} husstande, i alt {{totalAmount}} kr.\n\nOversigt: {{summaryUrl}}'
    },
    WAITLIST_JOINED: {
        subject: '{{senderName}}: {{person}} står på ventelisten til {{dinner}}',
        text: 'Kære {{name}},\n\n{{dinner}}\n{{person}}: 1 {{action}} ({{place}})\n{{ticket}}\n\n{{helpText}}\n{{payment}}\nDu kan altid afmelde din ventelisteplads, hvis du ikke har brug for den alligevel.\n\nSe bookingen: {{bookingUrl}}'
    },
    WAITLIST_TICKET_ASSIGNED: TICKET_RECEIVED,
    TICKET_BOUGHT: TICKET_RECEIVED,
    WAITLIST_EXTRA_PORTION: {
        subject: '{{senderName}}: {{person}} har fået en billet til {{dinner}}',
        text: 'Kære {{name}},\n\n{{dinner}}\n{{person}}: 1 {{action}}\n{{ticket}}\nKøkkenholdet laver flere portioner, og en af dem er til {{person}}. Vi glæder os til at se jer.\n\nSe bookingen: {{bookingUrl}}'
    },
    WAITLIST_BUILDUP: {
        subject: '{{senderName}}: {{queued}} til {{dinner}}',
        text: 'Kære {{name}},\n\n{{queued}} · {{portions}} portioner\n{{ask}}\nDet gør du under Flere på middagen: {{dinnerUrl}}'
    },
    TICKET_SOLD: {
        subject: '{{senderName}}: {{tickets}} til {{dinner}} er solgt',
        text: 'Kære {{name}},\n\n{{dinner}}\n{{tickets}} solgt til {{buyer}}\n{{ticket}}\nI betaler ikke længere for den.\n\nSe bookingen: {{bookingUrl}}'
    },
    CHEF_DINNER_DEADLINES: {
        subject: '{{senderName}}: Din middag d. {{date}} mangler noget fra din side',
        text: 'Kære chefkok,\n\nDu er chefkok på fællesspisningen d. {{date}}, og din middag mangler noget fra din side:\n\n{{deadlines}}\n\nSe din middag: {{chefUrl}}'
    }
}

/**
 * The moments a chef deadline's lines name, as the chef reads them: "10/10/2026 kl. 18:00"; and the deadline's day on
 * the run's day, which the red lines name: a red alarm starts 24 hours before its deadline, so the deadline falls on
 * the run's day or the day after
 */
export interface ChefDeadlineTimes {
    deadline: string
    booking: string
    day: string
}

type ChefDeadlineLine = (times: ChefDeadlineTimes) => string

/** A chef deadline's words: its title and the line of each alarm level it reads while missing */
export interface ChefDeadlineWords {
    title: string
    yellow: ChefDeadlineLine
    red: ChefDeadlineLine
    overdue?: ChefDeadlineLine
}

const MENU_DEADLINE: ChefDeadlineWords = {
    title: 'Menu publiceret',
    yellow: ({booking}) => `Skrånerne kan framelde sig indtil ${booking}, så de skal kunne se menuen inden.`,
    red: ({day}) => `Fristen er tæt på. Publicer menuen ${day}, så skrånerne når at se den, før de ikke længere kan framelde sig.`,
    overdue: ({deadline}) => `Fristen var ${deadline}. Skrånerne venter på at se, hvad de skal spise. Publicer menuen, så snart du kan.`
}

// A dinner that has started sends no notice, so the groceries are never overdue in one
const GROCERIES_DEADLINE: ChefDeadlineWords = {
    title: 'Indkøb',
    yellow: () => 'Bestil madvarerne i god tid, så køkkenholdet har det hele på dagen.',
    red: ({day}) => `Middagen er ${day}. Husk madvarerne, så køkkenholdet har det hele.`
}

/**
 * The chef deadlines notice's line per deadline, by its dinner step: a met deadline reads check; a missing one names its
 * deadline, the countdown while the deadline is ahead or the time since it once overdue, and under it the line of its
 * alarm level
 */
export const CHEF_DEADLINE_WORDS = {
    met: (title: string): string => `${title} – check`,
    missing: (title: string, deadline: string, countdown: string): string => `${title} – mangler, senest ${deadline}, ${countdown}`,
    alarm: (line: string): string => `  ${line}`,
    deadlineDay: {today: 'i dag', tomorrow: 'i morgen'},
    ANNOUNCED: MENU_DEADLINE,
    GROCERIES_DONE: GROCERIES_DEADLINE
}

/** The job runs page's line of the notifications a run sent: a symbol per sender event */
export const NOTIFICATION_COUNT_WORDS = {
    label: 'Notifikationer',
    symbols: {BOOKING_STATUS: 'booking', MONTHLY_BILLING: 'bill', CHEF_DEADLINES: 'chef'} satisfies Record<SenderEvent, string>,
    none: '0'
}

/** The mail kinds, one per template: `NotificationKind.WAITLIST_JOINED` */
export const NotificationKind = Object.fromEntries(Object.keys(NOTIFICATION_TEMPLATES).map(kind => [kind, kind])) as {[K in keyof typeof NOTIFICATION_TEMPLATES]: K}
export type NotificationKind = keyof typeof NOTIFICATION_TEMPLATES
