export const FORM_MODES = {
    CREATE: 'create',
    EDIT: 'edit',
    VIEW: 'view'
} as const

export type FormMode = typeof FORM_MODES[keyof typeof FORM_MODES]

export const STORE_STATES = {
    LOADING: 'loading',
    ERROR: 'error',
    CREATE: 'create',
    EDIT: 'edit',
    VIEW_SELECTED: 'viewSelected',
    VIEW_NO_SEASONS: 'viewNoSeasons'
} as const

export type StoreState = typeof STORE_STATES[keyof typeof STORE_STATES]
