@e2e-parallel
Feature: The chef page
  The user who cooks on a team plans the team's dinners on the chef page.

  Background:
    Given the admin is signed in
    And a season is active
    And the user's inhabitant is a CHEF on 2 teams with a dinner each
    And the user is signed in

  Scenario: The chef page renders on the server and hydrates without a mismatch
    When the user opens the chef page of team 1
    Then the page hydrates without a mismatch
    And the user sees the chef calendar and one footer

  Scenario Outline: The user switches from the tab of team <from> to the tab of team <to>
    When the user opens the chef page of team <from>
    And the user chooses the tab of team <to>
    Then the user sees the role line of a CHEF on team <to>
    And the user sees the next cooking day of team <to>

    Examples:
      | from | to |
      | 1    | 2  |
      | 2    | 1  |

  Scenario Outline: On a <screen>, the chef calendar is <calendar is> when the address names no view
    When the user opens the chef page of team 1 on a <screen>
    Then the chef calendar is <calendar is>

    Examples:
      | screen  | calendar is |
      | desktop | open        |
      | phone   | closed      |
