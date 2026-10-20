@smoke
Feature: The deployed app
  A visitor reaches the app and its PWA manifest.

  Scenario: The deployed app has its title
    When a visitor opens the app
    Then the app's title names "Theslope"

  Scenario: The PWA manifest serves with its icons and the page head links it
    When a visitor opens the app
    Then the app links its PWA manifest
    And the PWA manifest serves standalone with its icons
