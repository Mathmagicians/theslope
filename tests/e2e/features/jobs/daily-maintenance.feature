@api-serial
Feature: Daily maintenance
  The nightly run consumes the past dinners, closes their orders with a transaction each, and sets the inhabitants
  without dinner preferences to the dinner mode DINEIN on the cooking days.

  Background:
    Given the admin is signed in
    And a season is active

  Scenario Outline: The nightly run closes the inhabitant's <tickets> tickets with the dinner mode <mode>
    Given a dinner in the past month
    And the inhabitant has a ticket with the dinner mode <mode> and <guest tickets> guest tickets
    When the DAILY_MAINTENANCE job runs
    Then the job reports success
    And <tickets> tickets of the inhabitant are closed with the dinner mode <mode>
    And <tickets> tickets of the inhabitant have a transaction

    Examples:
      | mode     | guest tickets | tickets |
      | DINEIN   | 0             | 1       |
      | DINEIN   | 1             | 2       |
      | TAKEAWAY | 0             | 1       |

  Scenario: The nightly run sets an inhabitant without dinner preferences to the dinner mode DINEIN on the cooking days
    Given an inhabitant without dinner preferences
    When the DAILY_MAINTENANCE job runs
    Then the inhabitant's dinner preferences are the dinner mode DINEIN on the cooking days
