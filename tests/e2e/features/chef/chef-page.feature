@e2e-parallel
Feature: The chef page
  The user who cooks on a team plans the team's dinners on the chef page. The user is on a team through their
  inhabitant.

  Background:
    Given a season is active

  Rule: The user plans the dinners of their own teams

    Background:
      Given the user is a CHEF on team 1 and on team 2
      And team 1 cooks a dinner
      And team 2 cooks a dinner
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

    Scenario Outline: On a <screen> with the view <view in the URL>, the calendar on /chef is <calendar is>
      When the user opens /chef on a <screen> with the view <view in the URL>
      Then the calendar on /chef is <calendar is>

      Examples:
        | screen  | view in the URL | calendar is |
        | desktop | none            | open        |
        | phone   | none            | closed      |
        | desktop | closed          | closed      |
        | phone   | open            | open        |

  Rule: The user visits a team they are not on

    Background:
      Given the user is a member of team 1 and not of team 2
      And team 1 cooks a dinner
      And team 2 cooks the only dinner of its day
      And the user is signed in

    Scenario: The user opens the chef page of a team they are not on
      When the user opens the chef page of team 2
      Then the user sees the visiting tab and the visitor line of team 2
      And the user reads the menu card of team 2 without edit controls
      And the user sees the role buttons

    Scenario: The user clicks another team's dinner in the chef calendar
      When the user opens the chef page of team 1
      And the user clicks the dinner of team 2 in the chef calendar
      Then the user sees the visiting tab and the visitor line of team 2
      And the user reads the menu card of team 2 without edit controls
      And the user sees the role buttons
