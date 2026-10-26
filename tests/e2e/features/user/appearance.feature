# The examples save the settings of the one member login, so they run in order
@e2e-parallel @mode:serial
Feature: Appearance
  The user sees the text scale and the palette they save.

  Scenario Outline: The text turns <change> from the text scale <from> to <to>
    Given the user is signed in
    And the user has the setting text scale <from>
    When the user saves the setting text scale <to>
    Then the user sees the text <change>

    Examples:
      | from   | to     | change  |
      | normal | large  | larger  |
      | large  | larger | larger  |
      | larger | normal | smaller |

  Scenario Outline: The colours change from the palette <from> to <to>
    Given the user is signed in
    And the user has the setting palette <from>
    When the user saves the setting palette <to>
    Then the user sees the colours change

    Examples:
      | from          | to            |
      | default       | high-contrast |
      | high-contrast | colorblind    |
      | colorblind    | default       |
