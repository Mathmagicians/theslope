import {describe, it, expect, vi} from 'vitest'
import {createError} from 'h3'
import {Prisma} from '~~/prisma/generated/client/client'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

// The helper reads createError from the Nitro auto-import scope
vi.stubGlobal('createError', createError)

const {nuxtErrorFromPrismaError, nuxtErrorFromCatch} = eventHandlerHelper

const PREPEND = '🎟️ > ORDER > [BATCH CREATE]'

const prismaError = (code: string, message: string) =>
    new Prisma.PrismaClientKnownRequestError(message, {code, clientVersion: 'test'})

// Prisma's known request errors map to the HTTP code that describes the client's situation (ADR-002)
describe.each([
    {code: 'P2002', message: 'Unique constraint failed on the fields: (`inhabitantId`,`dinnerEventId`)', statusCode: 409, statusMessage: 'Conflict'},
    {code: 'P2025', message: 'Record to update not found.', statusCode: 404, statusMessage: 'Not Found'},
    {code: 'P2003', message: 'Foreign key constraint failed', statusCode: 500, statusMessage: 'Internal Server Error'}
])('Prisma error $code', ({code, message, statusCode, statusMessage}) => {
    it(`maps to ${statusCode} ${statusMessage} and keeps the database message`, () => {
        const error = nuxtErrorFromPrismaError(PREPEND, prismaError(code, message))

        expect(error.statusCode).toBe(statusCode)
        expect(error.statusMessage).toBe(statusMessage)
        expect(error.message).toContain(PREPEND)
        expect(error.message).toContain(message)
    })

    it(`reaches ${statusCode} through nuxtErrorFromCatch`, () => {
        const error = nuxtErrorFromCatch(PREPEND, prismaError(code, message))

        expect(error.statusCode).toBe(statusCode)
    })
})
