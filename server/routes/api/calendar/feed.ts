import {defineEventHandler} from 'h3';
import ical from 'ical-generator';

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

export default defineEventHandler(async (event) => {
    console.log("Received request:" , event);
    try {
        const icsFeed = await generateICalFeed(events);
        return new Response(icsFeed, {
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="skraaningen-faellesspisning.ics"',
            },
        });
    } catch (error) {
        console.error('Error generating iCal feed:', error);
        return new Response('Error generating iCal feed', {status: 500});
    }
})
