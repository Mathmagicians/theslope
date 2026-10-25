/**
 * E-mail templates per notification kind — theslope's config (spread into app.config `theslope.notifications`).
 *
 * `{{placeholder}}` values come from the event that raises the notification (server/utils/sender/events/*);
 * `senderName`, `site`, `environment` and `dedupeKey` are filled by composeEmail for every kind. The signature is appended
 * to every text. Plain module (not app.config itself) so unit tests can import the real templates.
 */
import type {SenderEvent} from '~/composables/useDeliveryValidation'

export const NOTIFICATION_SENDER_NAME = 'Skråningen'
export const NOTIFICATION_SENDER_DOMAIN = 'skraaningen.dk'

/** Sender address per environment — pinned by the sender binding's allowed_sender_addresses: `no-reply@` on prod, `no-reply.<environment>@` elsewhere */
export const senderAddress = (environment: string): string =>
    environment === 'prod' ? `no-reply@${NOTIFICATION_SENDER_DOMAIN}` : `no-reply.${environment}@${NOTIFICATION_SENDER_DOMAIN}`

/** Display name next to the sender address: `Skråningen <environment>` — the sender line tells the environments apart */
export const senderDisplayName = (environment: string): string => `${NOTIFICATION_SENDER_NAME} ${environment}`

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
    }
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
