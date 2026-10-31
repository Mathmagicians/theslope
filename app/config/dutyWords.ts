/**
 * The duty words users read: the rules of a joker slot the admin adds to a team. Plain module without imports, so the
 * validation composable the server imports reads it (ADR-017).
 */
export const DUTY_WORDS = {
    /** The joker slot form's rules: its weekdays and its period */
    jokerSlot: {
        noWeekday: 'Vælg mindst én ugedag',
        endBeforeStart: 'Slutdato skal være på eller efter startdato'
    }
} as const
