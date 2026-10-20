import {vi, type Mock} from 'vitest'

export type FakeSenderQueue = Queue & {send: Mock, sendBatch: Mock}

/** The SENDER binding the unit runtime lacks: it takes messages in batches, and fails the batch calls named (1 = the first) */
export const fakeSenderQueue = (failingBatches: number[] = []): FakeSenderQueue => {
    const sendBatch = vi.fn(async (_batch: Iterable<MessageSendRequest>) => {
        if (failingBatches.includes(sendBatch.mock.calls.length)) throw new Error('queue unavailable')
    })
    return {send: vi.fn().mockResolvedValue(undefined), sendBatch} as unknown as FakeSenderQueue
}

/** The messages of each batch the binding took, in call order */
export const sentBatches = (queue: FakeSenderQueue): unknown[][] =>
    queue.sendBatch.mock.calls.map(([batch]) => [...(batch as Iterable<MessageSendRequest>)].map(request => request.body))

/** Every message the binding took, by either call, in order */
export const sentMessages = <T = unknown>(queue: FakeSenderQueue): T[] =>
    [...queue.send.mock.calls.map(([message]) => message), ...sentBatches(queue).flat()] as T[]
