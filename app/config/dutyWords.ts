/**
 * The duty words users read: the rules of a joker slot the admin adds to a team. Plain module without imports, so the
 * validation composable the server imports reads it (ADR-017).
 */
export const DUTY_WORDS = {
    /** The joker slot form: its fields (the period, the weekdays, the role, the optional note with its example) and its rules */
    jokerSlot: {
        period: 'Periode',
        weekdays: 'Ugedage',
        role: 'Rolle',
        note: {label: 'Note', hint: 'Valgfri', placeholder: 'Fx Anna barsel'},
        noWeekday: 'Vælg mindst én ugedag',
        endBeforeStart: 'Slutdato skal være på eller efter startdato'
    }
} as const
