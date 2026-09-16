/**
 * E-mail templates per notification kind — theslope's config (spread into app.config `theslope.notifications`).
 *
 * `{{placeholder}}` values come from the event that raises the notification (server/utils/sender/events/*);
 * `site`, `environment` and `dedupeKey` are filled by composeEmail for every kind. The signature is appended
 * to every text. Plain module (not app.config itself) so unit tests can import the real templates.
 */
export const NOTIFICATION_SENDER_NAME = 'Skråningen'
export const NOTIFICATION_SENDER_DOMAIN = 'skraaningen.dk'

/** Sender address per environment — pinned by the sender binding's allowed_sender_addresses: `no-reply@` on prod, `no-reply.<environment>@` elsewhere */
export const senderAddress = (environment: string): string =>
    environment === 'prod' ? `no-reply@${NOTIFICATION_SENDER_DOMAIN}` : `no-reply.${environment}@${NOTIFICATION_SENDER_DOMAIN}`

/** Display name next to the sender address: `Skråningen <environment>` — the sender line tells the environments apart */
export const senderDisplayName = (environment: string): string => `${NOTIFICATION_SENDER_NAME} ${environment}`

export const NOTIFICATION_SIGNATURE = `— ${NOTIFICATION_SENDER_NAME} · {{site}}`

export const NOTIFICATION_TEMPLATES = {
    TEST: {
        subject: 'Skråningen: testbesked fra theslope-sender ({{environment}})',
        text: 'Hej!\n\nDette er en testbesked sendt gennem theslope-sender.\n\nid: {{dedupeKey}}'
    },
    BILLING_PERIOD_CLOSED: {
        subject: 'Skråningen: PBS-opgørelse {{billingPeriod}}',
        text: 'Hej,\n\nVedhæftet er PBS-opgørelsen for perioden {{billingPeriod}}: {{householdCount}} husstande, i alt {{totalAmount}} kr.\n\nOversigt: {{summaryUrl}}'
    }
}
