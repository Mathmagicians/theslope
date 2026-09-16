import {describe, expect, it} from 'vitest'
import {buildTestEmail, type TestEmailInput} from '~~/server/utils/sender/events/test'
import {useNotificationValidation} from '~/composables/useNotificationValidation'
import {maskEmail} from '~~/workers/common/mask'

const {NotificationMessageSchema} = useNotificationValidation()

const ENVIRONMENT_INPUTS: Array<[string, TestEmailInput]> = [
    ['dev', {to: 'anna@example.com', from: 'no-reply.dev@skraaningen.dk', fromName: 'Skråningen dev', site: 'dev.skraaningen.dk', environment: 'dev'}],
    ['prod', {to: 'anna@example.com', from: 'no-reply@skraaningen.dk', fromName: 'Skråningen', site: 'www.skraaningen.dk', environment: 'prod'}]
]

describe('buildTestEmail', () => {
    describe.each(ENVIRONMENT_INPUTS)('for %s', (_env, input) => {
        const message = buildTestEmail(input)

        it('is a contract-valid EMAIL message', () => {
            expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
            expect(message.channel).toBe('EMAIL')
        })

        it('carries the sender address and display name of the environment', () => {
            expect(message.from).toBe(input.from)
            expect(message.fromName).toBe(input.fromName)
            expect(message.to).toBe(input.to)
        })

        it('signs with the sending site so a reader can tell the environment apart', () => {
            expect(message.text).toContain(`— Skråningen · ${input.site}`)
            expect(message.subject).toContain(input.environment)
        })

        it('has TEST metadata with a dedupeKey that identifies this send', () => {
            expect(message.meta.kind).toBe('TEST')
            expect(message.meta.source).toBe('theslope-app')
            expect(message.meta.environment).toBe(input.environment)
            expect(message.meta.dedupeKey).toMatch(new RegExp(`^TEST:EMAIL:${maskEmail(input.to).replace(/[.*]/g, '\\$&')}:[0-9a-f-]{36}$`))
            expect(message.meta.dedupeKey).not.toContain(input.to)
            expect(message.text).toContain(message.meta.dedupeKey)
        })
    })

    it.each([
        ['omits replyTo when none is given', undefined],
        ['carries replyTo when given', 'kasserer@skraaningen.dk']
    ])('%s', (_name, replyTo) => {
        const message = buildTestEmail({...ENVIRONMENT_INPUTS[0]![1], replyTo})
        expect(message.replyTo).toBe(replyTo)
    })

    it('produces distinct dedupeKeys for consecutive sends', () => {
        const a = buildTestEmail(ENVIRONMENT_INPUTS[0]![1])
        const b = buildTestEmail(ENVIRONMENT_INPUTS[0]![1])
        expect(a.meta.dedupeKey).not.toBe(b.meta.dedupeKey)
    })
})
