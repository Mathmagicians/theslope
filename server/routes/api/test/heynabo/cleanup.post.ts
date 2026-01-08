import {deleteHeynaboEventsAsSystem, listHeynaboEventsAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {z} from 'zod'

// Test event title patterns from our test factories (full prefix to avoid false positives)
const TEST_EVENT_PATTERNS = [
    'Fællesspisning - Test Menu-',               // dinnerEventFactory, orderFactory
    'Fællesspisning - Updated Delicious Pasta-'  // dinnerAnnounce.e2e.spec.ts
]

const CleanupSchema = z.object({
    eventIds: z.array(z.number().int().positive()).default([]),
    nuke: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, CleanupSchema.parse)

    // Start with explicit event IDs
    const eventIds = [...body.eventIds]

    // If nuke, add test events from Heynabo
    if (body.nuke) {
        const allEvents = await listHeynaboEventsAsSystem()
        const testEventIds = allEvents
            .filter(e => TEST_EVENT_PATTERNS.some(p => e.name?.includes(p)))
            .map(e => e.id)
        eventIds.push(...testEventIds)
    }

    if (eventIds.length === 0) {
        return {deleted: 0, total: 0, patterns: TEST_EVENT_PATTERNS}
    }

    const deleted = await deleteHeynaboEventsAsSystem(eventIds)
    return {deleted, total: eventIds.length, patterns: TEST_EVENT_PATTERNS}
})
