@api-serial
Feature: Booking notifications
  Past a dinner's booking deadline, the waiting list and the sales email the inhabitants they concern, once per version
  of the subject. An email about an inhabitant goes to the inhabitant's closest user: the inhabitant's own user, else
  the first user of the inhabitant's household. A delivery record is written per email sent; the nightly run sends
  what the dinners still owe.

  Background:
    Given the admin is signed in
    And a season is active

  Scenario Outline: The <event> <deadline> the deadline: <notification> email to the closest user of the <inhabitant>
    Given a dinner <deadline> its booking deadline
    And the seller has a ticket
    And an inhabitant without a ticket
    And <waiting> inhabitants are on the waiting list
    And <for sale> tickets are for sale
    When the <event>
    Then <records> delivery records are written for the dinner
    And <emails sent> <notification> emails are sent to the closest user of the <inhabitant>

    Examples:
      | deadline | waiting | for sale | event                      | records | notification     | inhabitant    | emails sent |
      | before   | 0       | 0        | dinner is booked           | 0       | waitlist joined  | inhabitant    | 0           |
      | past     | 0       | 0        | dinner is booked           | 1       | waitlist joined  | inhabitant    | 1           |
      | past     | 1       | 0        | ticket is released         | 3       | ticket sold      | seller        | 1           |
      | past     | 1       | 0        | ticket is released         | 3       | ticket assigned  | first in line | 1           |
      | past     | 0       | 1        | dinner is booked           | 2       | ticket sold      | seller        | 1           |
      | past     | 0       | 1        | dinner is booked           | 2       | ticket bought    | inhabitant    | 1           |
      | past     | 2       | 0        | dinner is booked           | 4       | waitlist buildup | chef          | 1           |
      | past     | 3       | 0        | portion is added           | 5       | extra portion    | first in line | 1           |
      | past     | 1       | 1        | daily maintenance job runs | 3       | ticket sold      | seller        | 1           |

  Rule: The nightly run sends what the dinners still owe

    Background:
      Given a dinner past its booking deadline
      And an inhabitant of a household without a user is on the waiting list
      And the inhabitant's household gets a user

    Scenario: The daily maintenance job sends the owed email
      When the daily maintenance job runs
      Then 1 delivery record is written for the dinner
      And 1 waitlist joined email is sent to the closest user of the inhabitant

    Scenario: The preview counts what a run sends
      When the admin previews the booking notifications
      Then the preview counts 1 waitlist joined email for the closest user of the inhabitant
      And 0 delivery records are written for the dinner
