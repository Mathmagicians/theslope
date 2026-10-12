/**
 * The `data-testid` contract of JokerSlotForm and the team card's joker box, shared by their component specs and
 * the AdminTeams e2e spec so one rename lands in both.
 */
export const JOKER_SLOT_IDS = {
    form: 'joker-slot-form',
    add: 'joker-slot-add',
    delete: (slotId: number) => `joker-slot-delete-${slotId}`,
    submit: 'joker-slot-submit',
    cancel: 'joker-slot-cancel',
    roleSelect: 'joker-slot-role-select'
} as const
