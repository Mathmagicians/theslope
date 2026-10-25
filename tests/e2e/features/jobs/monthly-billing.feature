@api-serial
Feature: Monthly billing
  The monthly billing closes the past month's billing period with one invoice per household, holding the household's
  PBS number and address. The accountant link opens the period and its CSV file without a login.

  Background:
    Given the admin is signed in
    And the past month has unbilled orders in 2 households
    And the MONTHLY_BILLING job has run 1 time

  Scenario: The invoices name their household and are ordered by address, then PBS number
    Then each invoice of the period names its household and PBS number
    And the invoices of the period are ordered by address, then PBS number

  Scenario: The visitor opens the period and its CSV file through the accountant link
    Given a visitor without a session
    When the visitor opens the period's accountant link
    Then the visitor sees the period with its invoices
    And the period's CSV file downloads through the accountant link
