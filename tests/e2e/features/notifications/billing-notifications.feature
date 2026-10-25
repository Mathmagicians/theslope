@api-serial
Feature: Billing notifications
  The monthly billing job bills the past month into its billing period, archives the period's CSV and emails the
  accountant, once per version of the period. An admin's re-send emails the accountant again. The archive and each
  email write one delivery record.

  Background:
    Given the admin is signed in
    And the past month has unbilled orders

  Scenario Outline: The <event> after <runs> MONTHLY_BILLING runs
    Given the MONTHLY_BILLING job has run <runs> times
    When the <event>
    Then <records> delivery records are in the database for the period
    And <archives> CSV archives are uploaded for the period
    And <emails sent> MONTHLY_BILLING emails are sent to the accountant

    Examples:
      | runs | event                          | records | archives | emails sent |
      | 0    | MONTHLY_BILLING job runs       | 2       | 1        | 1           |
      | 1    | MONTHLY_BILLING job runs       | 2       | 1        | 1           |
      | 1    | period is re-sent by the admin | 3       | 1        | 2           |

  Scenario Outline: The <period> re-sent by the <actor> is refused as <refusal>
    Given the <actor> is signed in
    When the <period> is re-sent by the <actor>
    Then the re-send is refused as <refusal>

    Examples:
      | actor | period         | refusal   |
      | admin | unknown period | unknown   |
      | user  | period         | forbidden |
      | admin | invalid period | invalid   |
