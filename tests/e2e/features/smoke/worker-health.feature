@smoke
Feature: Worker health
  Each worker answers the same health report and runs the deployment under test.

  Background:
    Given the admin is signed in

  Scenario Outline: <worker> reports health and the expected version
    When "<worker>" reports its health at "<path>"
    Then the worker runs the expected version

    Examples:
      | worker          | path               |
      | theslope        | /api/public/health |
      | theslope-sender | /sender/health     |
