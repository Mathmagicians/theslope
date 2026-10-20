@smoke
Feature: API health
  The admin's reads answer from the deployed data.

  Background:
    Given the admin is signed in

  Scenario: The active season has dinner events
    Given a season is active
    Then the active season has dinner events

  Scenario Outline: The <list> list is non-empty
    Then the <list> list is non-empty

    Examples:
      | list        |
      | households  |
      | users       |
      | inhabitants |
