@api-parallel
Feature: Booking
  A household's bookings (ADR-016). The booking deadline closes the changes: the kitchen needs to know how many
  portions to prepare and what its grocery budget is. Before the deadline a user books, changes and cancels the
  household's tickets. After it, a user's cancellation releases the ticket, and a user's booking takes back the own
  released ticket, buys a released ticket of another household, or joins the waiting list. A ticket of 0 portions
  takes no portion from the kitchen, so a user can book and cancel it at any time. A dinner can't be booked while it
  is cancelled; the chef can open it again.

  Background:
    Given the admin is signed in
    And the user is signed in
    And a season of its own is not active

  Rule: A ticket of 0 portions takes no portion from the kitchen, so a user can book and cancel it at any time

    Scenario Outline: The user picks <mode> for the <person> past the booking deadline
      Given a dinner past its BOOKING_CLOSED deadline
      And <held> tickets of the <person> are BOOKED with the dinner mode DINEIN
      When the user picks the dinner mode <mode> for the <person>
      Then <tickets> tickets of the <person> are BOOKED with the dinner mode <mode>
      And the <person> has <places> places on the waiting list
      And 0 tickets are released

      Examples:
        | person          | held | mode   | tickets | places |
        | baby who tastes | 0    | DINEIN | 1       | 0      |
        | hungry baby     | 0    | DINEIN | 0       | 1      |
        | baby who tastes | 1    | NONE   | 0       | 0      |
