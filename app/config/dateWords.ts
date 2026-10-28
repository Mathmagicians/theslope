/**
 * The words users read around a date (app/utils/date.ts). Plain module without auto-imports (ADR-017).
 */
export const DATE_WORDS = {
    /** A week by its ISO number: "Uge 3" */
    week: 'Uge',
    /** A countdown whose moment has passed */
    overdue: 'Overskredet',
    /** The countdown's units under a day: "2T 30M" */
    hour: 'T',
    minute: 'M'
}
