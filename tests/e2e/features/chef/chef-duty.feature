# Each scenario takes the duty and resigns from it on one dinner: two flows, three times the default timeout
@e2e-parallel @slow
Feature: Chef duty
  The user takes the chef duty of a dinner on the chef page or the dinner page, from a dinner without a chef or from
  another chef, and resigns from it again.

  Background:
    Given a season is active
    And the user is on the teams
      | team | role |
      | 1    | CHEF |
    And the user is signed in

  Scenario Outline: On <page>, the user takes the chef duty of a dinner <chef before> and resigns from it
    Given team 1 cooks a dinner <chef before>
    When the user opens <page> on the dinner
    And the user takes the chef duty
    Then the user is the chef of the dinner
    When the user resigns from the chef duty
    Then the dinner has no chef

    Examples:
      | page    | chef before                |
      | /chef   | without a chef             |
      | /dinner | without a chef             |
      | /chef   | with the admin as its chef |
      | /dinner | with the admin as its chef |
