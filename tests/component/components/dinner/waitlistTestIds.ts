// data-testid contract of the waiting list UI, shared by every spec that drives it
// (ChefMenuCard's release form, DinnerBookingForm's queue position, the dinner calendar's lock chip, the Waitlist e2e flow)
export const WAITLIST_TEST_IDS = {
    // DinnerCalendarDisplay - the hourglass in the lock chip of a day whose dinner has a waiting list, keyed by the day of the month
    calendarHourglass: (dayOfMonth: number) => `calendar-dinner-waitlist-${dayOfMonth}`,
    // ChefMenuCard - the queue's alert and the one release form behind its two triggers
    chefAlert: 'chef-waitlist-alert',
    extraPortionsEntry: 'chef-extra-portions',
    extraPortionsCta: 'chef-extra-portions-cta',
    extraPortionsForm: 'chef-extra-portions-form',
    extraPortionsSubmit: 'chef-extra-portions-submit',
    extraPortionsCancel: 'chef-extra-portions-cancel',
    // DinnerBookingForm - the position badge of a queued row, keyed by the row id, the closed dinner's
    // "Har du brug for flere billetter?" bar with the tickets for sale and the waiting list, and the note on the
    // household's own places on the waiting list
    position: (rowId: number | string) => `waitlist-position-${rowId}`,
    moreTickets: 'more-tickets-alert',
    householdQueued: 'household-waitlist-alert'
} as const
