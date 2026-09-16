import {describe, expect, it} from 'vitest'
import {composeEmail, missingAddress} from '~~/server/utils/sender/compose'
import {deploymentFromUrl, useNotificationValidation} from '~/composables/useNotificationValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {senderAddress, senderDisplayName} from '~/config/notificationTemplates'
import {maskEmail} from '~~/workers/common/mask'

const {NotificationMessageSchema} = useNotificationValidation()
const config = NotificationFactory.config()
const toAnna = {kind: 'TEST', to: 'anna@example.com', values: {}} as const

describe('senderDisplayName', () => {
    it.each([
        ['local', 'Skråningen local'],
        ['dev', 'Skråningen dev'],
        ['prod', 'Skråningen prod']
    ])('derives the sender line for %s as %s', (environment, expected) => {
        expect(senderDisplayName(environment)).toBe(expected)
    })
})

describe('senderAddress', () => {
    it.each([
        ['local', 'no-reply.local@skraaningen.dk'],
        ['dev', 'no-reply.dev@skraaningen.dk'],
        ['prod', 'no-reply@skraaningen.dk']
    ])('derives the sender address for %s as %s', (environment, expected) => {
        expect(senderAddress(environment)).toBe(expected)
    })
})

describe('deploymentFromUrl', () => {
    it.each([
        ['https://dev.skraaningen.dk', 'dev', 'dev.skraaningen.dk'],
        ['https://www.skraaningen.dk', 'prod', 'www.skraaningen.dk'],
        ['https://skraaningen.dk', 'prod', 'skraaningen.dk'],
        ['http://localhost:3000', 'local', 'localhost:3000'],
        ['http://127.0.0.1:3000', 'local', '127.0.0.1:3000']
    ])('derives %s → environment %s, site %s', (url, environment, site) => {
        expect(deploymentFromUrl(url)).toEqual({environment, site})
    })
})

describe('missingAddress', () => {
    it.each([
        ['a complete config', {}, null],
        ['no admin mailbox', {adminEmail: ''}, 'NUXT_NOTIFICATIONS_ADMIN_EMAIL']
    ])('names the variable to set for %s', (_name, overrides, expected) => {
        expect(missingAddress(NotificationFactory.config(overrides), 'adminEmail')).toBe(expected)
    })
})

describe('composeEmail', () => {
    it('renders the kind\'s template with the built-in values and appends the signature', () => {
        const message = composeEmail(config, toAnna)

        expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
        expect(message.subject).toBe('Skråningen: testbesked fra theslope-sender (dev)')
        expect(message.text).toContain(`id: ${message.meta.dedupeKey}`)
        expect(message.text.endsWith('— Skråningen · dev.skraaningen.dk')).toBe(true)
    })

    it('takes sender, display name and environment from the config, the admin mailbox as reply-to', () => {
        const message = composeEmail(config, toAnna)

        expect(message).toMatchObject({from: config.from, fromName: config.fromName, replyTo: config.adminEmail, meta: {environment: 'dev', source: 'theslope-app', kind: 'TEST'}})
    })

    it('sends without a Reply-To when no admin mailbox is configured', () => {
        expect(composeEmail(NotificationFactory.config({adminEmail: ''}), toAnna).replyTo).toBeUndefined()
    })

    it('keys the message on the masked recipient and a message id', () => {
        const message = composeEmail(config, toAnna)

        expect(message.meta.dedupeKey).toMatch(new RegExp(`^TEST:EMAIL:${maskEmail(toAnna.to).replace(/[.*]/g, '\\$&')}:[0-9a-f-]{36}$`))
        expect(message.meta.dedupeKey).not.toContain(toAnna.to)
    })

    it('carries cc and a correlation id when given', () => {
        const message = composeEmail(config, {...toAnna, cc: ['admin@example.com'], correlationId: 'jobRun:1'})

        expect(message.cc).toEqual(['admin@example.com'])
        expect(message.meta.correlationId).toBe('jobRun:1')
    })

    it('base64-encodes a UTF-8 text attachment so Danish characters survive the round trip', () => {
        const content = '"Kunde nr",Adresse\n2053,"Skråningen 12, Lejre"\n'
        const message = composeEmail(config, {...toAnna, attachments: [{filename: 'PBS-Opgørelse.csv', contentType: 'text/csv; charset=utf-8', content}]})

        expect(message.attachments).toHaveLength(1)
        expect(Buffer.from(message.attachments[0]!.contentBase64, 'base64').toString('utf8')).toBe(content)
        expect(message.attachments[0]).toMatchObject({filename: 'PBS-Opgørelse.csv', contentType: 'text/csv; charset=utf-8'})
    })

    it.each([
        ['an unknown kind', {...toAnna, kind: 'NOPE'}, /template.*NOPE/i],
        ['a value no template uses', {...toAnna, values: {unused: 'x'}}, /unused/]
    ])('throws on %s — a template bug must fail in tests', (_name, input, error) => {
        expect(() => composeEmail(config, input)).toThrow(error)
    })
})
