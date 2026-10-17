# Feature: GuestBookingForm

**Status:** Shipped | **Archived:** 2026-10-05

Guest ticket booking with allergy selection, deadline awareness and admin override.

| Piece | Where |
|---|---|
| Component | `app/components/booking/GuestBookingForm.vue` |
| Consumers | `/household/[shortname]/bookings`, `/admin/economy` |
| Logic | `useBooking`, `useBookingUi`, `useBookingValidation` (guest orders: `isGuestTicket`, `allergyTypeIds`) |
| Coverage row | `docs/adr-compliance-frontend.md` § Household Booking Components |
