@api-serial
Feature: User preferences
  A user has settings: the channel the notifications go out on, the palette and the text scale. A save writes the
  setting it carries; the booking emails go out on the user's channel.

  Scenario Outline: The user saves the palette <palette> and the text scale <text scale>
    Given the user is signed in
    And the user has the setting channel EMAIL
    When the user saves the setting palette <palette>
    And the user saves the setting text scale <text scale>
    Then the user has the setting palette <palette>
    And the user has the setting text scale <text scale>
    And the user has the setting channel EMAIL

    Examples:
      | palette       | text scale |
      | high-contrast | large      |
      | colorblind    | larger     |

  Scenario Outline: The user with the setting channel <channel> is sent <emails sent> booking emails
    Given the user is signed in
    And a dinner past its BOOKING_CLOSED deadline
    When the user saves the setting channel <channel>
    And the dinner is booked for the user's inhabitant
    Then <emails sent> WAITLIST_JOINED emails are sent to the closest user of the user's inhabitant

    Examples:
      | channel | emails sent |
      | EMAIL   | 1           |
      | none    | 0           |

  Scenario: The setting channel SMS needs a phone number
    Given the user is signed in
    And the user has no phone number
    When the user saves the setting channel SMS
    Then the save is refused as invalid

  Scenario: Saving a setting needs a session
    Given a visitor without a session
    When the visitor saves the setting channel EMAIL
    Then the save is refused as unauthenticated
