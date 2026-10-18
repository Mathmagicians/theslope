@smoke
Feature: Sign-in
  A sign-in with the Heynabo credentials answers the user with the household (ADR-009).

  Scenario: The session answers the UserDetail with its household
    When the admin signs in with the Heynabo credentials
    Then the sign-in answers the admin's UserDetail with the household
