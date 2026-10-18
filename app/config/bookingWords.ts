/**
 * The booking words users read. Plain module without auto-imports: the app and the server import it (ADR-017).
 */
export const BOOKING_WORDS = {
    /** A dinner's name while the chef has written no menu */
    untitledDinner: 'Fællesspisning',
    /** The heading of a team's cooking round: the team and the dates it cooks */
    roundHeading: (team: string, range: string) => `${team}, periode ${range}`
} as const
