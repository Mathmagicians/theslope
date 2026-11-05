@api-parallel
Feature: Test messages
  A test message proves the notification pipe: it is queued to the sender, which delivers it to the environment's
  allowed address. Who it is addressed to is decided before the queue and checked in the unit spec.

  Scenario: The user's test message is queued to the sender
    Given the user is signed in
    When the user asks for a test message
    Then a TEST email is queued to the sender

  Scenario: The admin's test message is refused to the user
    Given the user is signed in
    When the user asks for the admin's test message
    Then the test message is refused as forbidden
