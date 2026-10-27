@e2e-parallel
Feature: The dinner page
  A member sees the season's dinners on the dinner page.

  Background:
    Given the admin is signed in
    And a season is active
    And the user is signed in

  Scenario Outline: On a <screen> with the view <view in the URL>, the calendar on /dinner is <calendar is>
    When the user opens /dinner on a <screen> with the view <view in the URL>
    Then the calendar on /dinner is <calendar is>

    Examples:
      | screen  | view in the URL | calendar is |
      | desktop | none            | open        |
      | phone   | none            | closed      |
      | desktop | closed          | closed      |
      | phone   | open            | open        |
