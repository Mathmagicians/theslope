@smoke
Feature: Cron jobs
  The scheduled jobs are idempotent (ADR-015): a run on demand against the deployed data succeeds.

  Background:
    Given the admin is signed in

  Scenario Outline: The <job> job runs successfully
    When the <job> job runs
    Then the job reports success

    Examples:
      | job               |
      | Heynabo import    |
      | daily maintenance |
      | monthly billing   |
