import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {emit} from '~~/server/utils/sender/emit'
import {buildTestEmail} from '~~/server/utils/sender/events/test'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {fakeSenderQueue, sentBatches} from '~~/tests/component/utils/sender/fakeSenderQueue'
import type {EmailMessage} from '~/composables/useNotificationValidation'
import {spyOnLogs} from '~~/tests/component/logSpies'

// Each message composes its own dedupe key
const message = () => buildTestEmail(NotificationFactory.config())
const messages = (count: number) => Array.from({length: count}, message)
const invalidOf = (valid: EmailMessage) => ({...valid, to: 'not-an-email'})

const queued = (sent: EmailMessage) => ({queued: true, dedupeKey: sent.meta.dedupeKey, degraded: false})
const notQueued = (sent: EmailMessage, degraded = false) => ({queued: false, dedupeKey: sent.meta.dedupeKey, degraded})

describe('emit', () => {
    const logs = spyOnLogs()
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    // One message or a list: the valid ones go to the binding in batches of a hundred, one result per message in order
    it.each([
        {desc: 'one message goes in a batch of its own', failingBatches: [], given: () => {
            const one = message()
            return {input: one, batches: [[one]], results: [queued(one)], errors: 0}
        }},
        {desc: '250 messages go in batches of 100, 100 and 50, answered in order', failingBatches: [], given: () => {
            const all = messages(250)
            return {input: all, batches: [all.slice(0, 100), all.slice(100, 200), all.slice(200)], results: all.map(sent => queued(sent)), errors: 0}
        }},
        {desc: 'a message failing the contract is rejected alone and the others go', failingBatches: [], given: () => {
            const [first, second, third] = messages(3)
            return {input: [first!, invalidOf(second!), third!], batches: [[first, third]], results: [queued(first!), notQueued(second!), queued(third!)], errors: 1}
        }},
        {desc: 'a failed second batch leaves its messages not queued and the first batch queued', failingBatches: [2], given: () => {
            const all = messages(150)
            return {input: all, batches: [all.slice(0, 100), all.slice(100)], results: [...all.slice(0, 100).map(sent => queued(sent)), ...all.slice(100).map(sent => notQueued(sent))], errors: 1}
        }}
    ])('$desc', async ({failingBatches, given}) => {
        const {input, batches, results, errors} = given()
        const queue = fakeSenderQueue(failingBatches)

        expect(await emit(queue, input)).toEqual(results)

        expect(sentBatches(queue)).toEqual(batches)
        expect(queue.send).not.toHaveBeenCalled()
        expect(logs.error).toHaveBeenCalledTimes(errors)
    })

    it('reports every message degraded without throwing when the binding is missing', async () => {
        const all = messages(3)

        expect(await emit(undefined, all)).toEqual(all.map(sent => notQueued(sent, true)))
        expect(logs.warn).toHaveBeenCalledOnce()
    })
})
