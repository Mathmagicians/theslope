@api-serial
Feature: Chef deadline notifications
  A chef's dinner has deadlines: the menu is published by the menu deadline, and the groceries are ordered by the
  dinner. The DAILY_MAINTENANCE job emails the closest user of the chef while a deadline is missed, listing all the
  dinner's deadlines. A dinner with all its deadlines met sends nothing.

  Background:
    Given the admin is signed in
    And a season of its own is active

  Scenario: The DAILY_MAINTENANCE job emails the chef's missed deadlines once
    Given a dinner past its ANNOUNCED deadline
    And the dinner is in the state SCHEDULED
    And the dinner has 0 expenses
    And the DAILY_MAINTENANCE job has run 1 time
    When the DAILY_MAINTENANCE job runs
    Then 1 CHEF_DINNER_DEADLINES delivery record is in the database for the dinner
    And 1 CHEF_DINNER_DEADLINES email is sent to the closest user of the chef

  Scenario: The delivery dry run counts the chef's missed-deadline email before the job sends it
    Given a dinner past its ANNOUNCED deadline
    And the dinner is in the state SCHEDULED
    And the dinner has 0 expenses
    When the admin runs the delivery dry run of CHEF_DEADLINES
    Then the delivery dry run counts 1 CHEF_DINNER_DEADLINES email to send to the closest user of the chef
    And 0 delivery records are in the database for the dinner
