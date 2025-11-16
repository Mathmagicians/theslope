export const FORM_MODES = {
    CREATE: 'create',
    EDIT: 'edit',
    VIEW: 'view'
} as const

export type FormMode = typeof FORM_MODES[keyof typeof FORM_MODES]
