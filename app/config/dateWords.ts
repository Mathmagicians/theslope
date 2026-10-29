/**
 * The words users read around a date (app/utils/date.ts) and on every calendar. Plain module without auto-imports (ADR-017).
 */
export const DATE_WORDS = {
    /** A week by its ISO number: "Uge 3" */
    week: 'Uge',
    /** A countdown whose moment has passed */
    overdue: 'Overskredet',
    /** The countdown's units under a day: "2T 30M" */
    hour: 'T',
    minute: 'M',
    /** A date range that is not set */
    noRange: '?->?',
    /**
     * The countdown's words: no event ahead, the event under way, the lead into the time left ("OM 2 DAGE"), the lead
     * into the start hour ("spisning kl 18:00"), and the blinking dot's name while the event is under way
     */
    countdown: {
        none: 'Ingen',
        now: 'NU',
        in: 'OM',
        at: 'kl',
        happeningNow: (title: string) => `${title} er i gang nu`
    },
    /** The legend entries the calendars share: the selected day, and a holiday of the season */
    calendarLegend: {selected: 'Valgt dato', holiday: 'Ferie'}
}
