import {defineEventHandler} from 'h3';
import ical from 'ical-generator';
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

class Event {
    constructor(
        public start: string,
        public end: string,
        public summary: string,
        public location: string,
        public url: string,
        public timezone: string)
    {}
}
const events = [
    new Event(
        "10-01-2025", "10-01-2025", "Fællesspisning - Lasagne",
        "Skråningen", "/api/dinner/20250110",'Europe/Copenhagen'
    )
];

async function generateICalFeed(from:Event[]): Promise<string> {
    const calendar = ical({name: 'Skråningens fællesspisning', timezone: 'Europe/Copenhagen'});

    from.forEach(event => {
        calendar.createEvent({
            start: event.start,
            end: event.end,
            summary: event.summary,
            location: event.location,
            url: event.url,
            timezone: event.timezone // Apply timezone to each event
        });
    });
    return calendar.toString();
}

const LOG = '📆 > CALENDAR_FEED'

export default defineEventHandler(async (event) => {
    const url = getRequestURL(event)
    console.info(`${LOG} > Received request: ${url.pathname}`)
    try {
        const icsFeed = await generateICalFeed(events);
        return new Response(icsFeed, {
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="skraaningen-faellesspisning.ics"',
            },
        });
    } catch (error) {
        return throwH3Error(`${LOG} > Error generating iCal feed`, error)
    }
})
