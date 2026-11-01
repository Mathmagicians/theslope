/**
 * The words users read around a date (app/utils/date.ts) and on every calendar. Plain module without auto-imports (ADR-017).
 */
import {PERIOD_VIEWS, type PeriodView} from '~/types/dateTypes'

const [DAY, WEEK, MONTH] = PERIOD_VIEWS

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
    /** The legend every calendar shows: its panel's title, and the entries the calendars share (the selected day, a holiday of the season) */
    calendarLegend: {title: 'Forklaring', selected: 'Valgt dato', holiday: 'Ferie'},
    /** A period view's name: the booking view switcher's labels */
    periodViews: {[DAY]: 'Dag', [WEEK]: 'Uge', [MONTH]: 'Måned'} satisfies Record<PeriodView, string>,
    /**
     * A date's rules: a missing date, a typed date in the wrong format, a typed date that does not exist, an ISO date that
     * does not parse, a period that ends before it starts or spans a year; the typed field's description names its format
     */
    rules: {
        missing: 'Dato mangler',
        wrongFormat: (mask: string) => `Forkert dato format, brug (${mask})`,
        useFormat: (mask: string) => `Brug formatet ${mask}`,
        invalid: (mask: string) => `Ugyldig dato. Brug formatet ${mask}`,
        invalidIso: 'Invalid ISO date',
        description: (mask: string) => `Dato ${mask}`,
        endAfterStart: 'Tidsmaskinen er ikke opfundet endnu - slutdato skal være efter startdato',
        maxOneYear: 'Wow, wow, lidt for meget planlægning - max et år ad gangen'
    },
    /**
     * The date pickers' default labels, one date and a period; the holiday list's add button, the heading over its
     * holidays and a holiday's remove button by its period
     */
    picker: {
        date: 'Dato',
        range: 'Start dato - Slut dato',
        holidays: {
            add: 'Tilføj ferie',
            chosen: 'Valgte ferieperioder',
            remove: (period: string) => `Fjern ferieperiode ${period}`
        }
    }
}
