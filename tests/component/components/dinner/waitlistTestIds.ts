// data-testid contract of the waiting list UI, shared by every spec that drives it
// (ChefMenuCard's release form, DinnerBookingForm's queue position, the Waitlist e2e flow)
export const WAITLIST_TEST_IDS = {
    // ChefMenuCard - the queue's alert and the one release form behind its two triggers
    chefAlert: 'chef-waitlist-alert',
    extraPortionsEntry: 'chef-extra-portions',
    extraPortionsCta: 'chef-extra-portions-cta',
    extraPortionsForm: 'chef-extra-portions-form',
    extraPortionsSubmit: 'chef-extra-portions-submit',
    extraPortionsCancel: 'chef-extra-portions-cancel',
    // DinnerBookingForm - the position badge of a queued row, keyed by the row id, and the closed dinner's
    // "Har du brug for flere billetter?" bar with the tickets for sale and the waiting list
    position: (rowId: number | string) => `waitlist-position-${rowId}`,
    moreTickets: 'more-tickets-alert'
} as const
