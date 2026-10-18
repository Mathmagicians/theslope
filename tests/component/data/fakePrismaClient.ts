import {vi, type Mock, type MockInstance} from 'vitest'

type Models = Record<string, readonly string[]>
export type FakePrismaClient<M extends Models> = {[Model in keyof M]: {[Method in M[Model][number]]: Mock}}

/** A client standing for the D1 binding the unit runtime lacks: one mock per model method the spec names */
export const fakePrismaClient = <const M extends Models>(models: M): FakePrismaClient<M> =>
    Object.fromEntries(Object.entries(models).map(([model, methods]) =>
        [model, Object.fromEntries(methods.map(method => [method, vi.fn()]))])) as FakePrismaClient<M>

/** The statements the client received, `model.method`, in the order they were sent */
export const statementsInCallOrder = (client: Record<string, Record<string, Mock>>): string[] =>
    Object.entries(client)
        .flatMap(([model, methods]) => Object.entries(methods).flatMap(([method, mock]) =>
            mock.mock.invocationCallOrder.map(order => ({statement: `${model}.${method}`, order}))))
        .sort((a, b) => a.order - b.order)
        .map(({statement}) => statement)

/**
 * Answers the calls of the mocks it is handed one tick later, as D1 does, and keeps the most calls in flight at once:
 * reads sent one after another keep it at 1
 */
export const callsInFlight = () => {
    let now = 0
    let peak = 0
    const answer = <T extends (...args: never[]) => unknown>(mock: MockInstance<T>, reply: (...args: Parameters<T>) => Awaited<ReturnType<T>>): void => {
        mock.mockImplementation((async (...args: Parameters<T>) => {
            now++
            peak = Math.max(peak, now)
            await new Promise(resolve => setTimeout(resolve, 0))
            now--
            return reply(...args)
        }) as unknown as Parameters<typeof mock.mockImplementation>[0])
    }
    return {
        answer,
        get peak() {
            return peak
        }
    }
}
