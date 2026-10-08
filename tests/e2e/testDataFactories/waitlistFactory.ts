// Factory for waiting-list test data
import type {BrowserContext} from '@playwright/test'
import {expect} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useWaitlistValidation, type WaitlistJoinRequest, type WaitlistJoinResult, type WaitlistEntryWithPosition, type WaitlistQueueSummary, type WaitlistAssignmentResult, type TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {headers} = testHelpers
const {DinnerModeSchema} = useBookingValidation()

const WAITLIST_ENDPOINT = '/api/household/waitlist'
const chefWaitlistEndpoint = (dinnerEventId: number) => `/api/chef/dinner/${dinnerEventId}/waitlist`
const chefReleaseEndpoint = (dinnerEventId: number) => `/api/chef/dinner/${dinnerEventId}/release-portions`

export class WaitlistFactory {
    static readonly defaultJoinRequest = (overrides: Partial<WaitlistJoinRequest> & Pick<WaitlistJoinRequest, 'householdId' | 'dinnerEventId' | 'inhabitantId' | 'ticketPriceId'>): WaitlistJoinRequest => ({
        dinnerMode: DinnerModeSchema.enum.DINEIN,
        isGuestTicket: false,
        ...overrides
    })

    // PUT: 201 with the entry and its position; another expected status returns null
    static readonly join = async (context: BrowserContext, request: WaitlistJoinRequest, expectedStatus = 201, adminBypass = false): Promise<WaitlistJoinResult | null> => {
        const {WaitlistJoinResultSchema} = useWaitlistValidation()
        const response = await context.request.put(`${WAITLIST_ENDPOINT}${adminBypass ? '?adminBypass=true' : ''}`, {headers, data: request})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status joining the waiting list: ${body}`).toBe(expectedStatus)
        return expectedStatus === 201 ? WaitlistJoinResultSchema.parse(await response.json()) : null
    }

    static readonly leave = async (context: BrowserContext, entryId: number, expectedStatus = 200, adminBypass = false): Promise<TicketWaitlistDisplay | null> => {
        const {TicketWaitlistDisplaySchema} = useWaitlistValidation()
        const response = await context.request.delete(`${WAITLIST_ENDPOINT}/${entryId}${adminBypass ? '?adminBypass=true' : ''}`, {headers})
        expect(response.status(), 'Unexpected status leaving the waiting list').toBe(expectedStatus)
        return expectedStatus === 200 ? TicketWaitlistDisplaySchema.parse(await response.json()) : null
    }

    static readonly entriesForHousehold = async (context: BrowserContext, householdId: number, dinnerEventIds?: number[], adminBypass = false): Promise<WaitlistEntryWithPosition[]> => {
        const {WaitlistEntryWithPositionSchema} = useWaitlistValidation()
        const params = new URLSearchParams({householdId: String(householdId), ...(adminBypass ? {adminBypass: 'true'} : {})})
        for (const id of dinnerEventIds ?? []) params.append('dinnerEventIds', String(id))
        const response = await context.request.get(`${WAITLIST_ENDPOINT}?${params}`, {headers})
        expect(response.status(), 'Unexpected status reading the household entries').toBe(200)
        return WaitlistEntryWithPositionSchema.array().parse(await response.json())
    }

    static readonly chefSummary = async (context: BrowserContext, dinnerEventId: number, expectedStatus = 200): Promise<WaitlistQueueSummary | null> => {
        const {WaitlistQueueSummarySchema} = useWaitlistValidation()
        const response = await context.request.get(chefWaitlistEndpoint(dinnerEventId), {headers})
        expect(response.status(), 'Unexpected status reading the chef queue summary').toBe(expectedStatus)
        return expectedStatus === 200 ? WaitlistQueueSummarySchema.parse(await response.json()) : null
    }

    static readonly releasePortions = async (context: BrowserContext, dinnerEventId: number, portions: number, expectedStatus = 200): Promise<WaitlistAssignmentResult | null> => {
        const {WaitlistAssignmentResultSchema} = useWaitlistValidation()
        const response = await context.request.post(chefReleaseEndpoint(dinnerEventId), {headers, data: {portions}})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status releasing portions: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? WaitlistAssignmentResultSchema.parse(await response.json()) : null
    }

    // Cleanup: a missing entry counts as removed
    static readonly cleanupEntries = async (context: BrowserContext, entryIds: number[]): Promise<void> => {
        await Promise.all(entryIds.map(async id => {
            const response = await context.request.delete(`${WAITLIST_ENDPOINT}/${id}?adminBypass=true`, {headers})
            expect([200, 404], `Unexpected status cleaning up entry ${id}`).toContain(response.status())
        }))
    }
}
