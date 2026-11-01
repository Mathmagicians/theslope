export const FORM_MODES = {
    CREATE: 'create',
    EDIT: 'edit',
    VIEW: 'view'
} as const

export type FormMode = typeof FORM_MODES[keyof typeof FORM_MODES]

/** The faces CookingTeamCard renders: the kitchen monitor, the team on view, the admin's edit */
export const TEAM_CARD_MODES = {
    MONITOR: 'monitor',
    REGULAR: 'regular',
    EDIT: 'edit'
} as const

export type TeamCardMode = typeof TEAM_CARD_MODES[keyof typeof TEAM_CARD_MODES]
