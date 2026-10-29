@api-serial
Feature: Delivery records
  Every user reads the delivery records of a subject: the billing period, the dinner.

  Background:
    Given the admin is signed in
    And a season is active

  Scenario: The user reads the period's delivery records
    Given the past month has unbilled orders
    And the MONTHLY_BILLING job has run 1 time
    And the user is signed in
    Then 2 delivery records are in the database for the period

  Scenario: A read of a period without delivery records answers an empty list
    When the delivery records of a period without records are read
    Then the read answers an empty list

  Scenario: A read of an unknown subject is refused
    When the delivery records of the unknown subject are read
    Then the read is refused as invalid
