/**
 * Shared `data-testid` contract for the /admin/planning surface.
 *
 * One source for component specs and for reading the e2e specs next to them, so a
 * renamed hook fails in one place instead of drifting per spec.
 * `create` and `edit` land with the "Planning form" package; the ids are listed here
 * so the contract is read as a whole.
 */
export const PLANNING_TEST_IDS = {
    card: 'admin-planning',
    create: 'create-season',
    edit: 'edit-season',
    submit: 'submit-season',
    cancel: 'cancel-season',
    createFirst: 'create-first-season',
    holidayAdd: 'holiday-range-add',
    holidayItem: (index: number) => `holidayRangeList-${index}`,
    holidayRemove: (index: number) => `holiday-range-remove-${index}`,
    ticketAdd: 'ticket-price-add',
    ticketRemove: (index: number) => `ticket-price-remove-${index}`,
    activate: 'activate-season',
    deactivate: 'deactivate-season'
} as const
