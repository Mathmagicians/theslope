import {defineEventHandler} from 'h3';
import ical from 'ical-generator';

const events = [{
    start: "10-01-2025",
    end: "10-01-2025",
    summary: "Fællesspisning - Lasagne",
    location: "Skråningen",
    url: "/api/dinner/20250110",
    timezone: 'Europe/Copenhagen'
}];

async function generateICalFeed(from): Promise<string> {
    const calendar = ical({name: 'Skråningens fællesspisning', timezone: 'Europe/Copenhagen'});

    events.forEach(event => {
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
