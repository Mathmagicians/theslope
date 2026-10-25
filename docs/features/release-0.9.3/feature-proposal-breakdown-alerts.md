# Feature Proposal: Breakdown alerts

**Status:** Discovery | **Date:** 2026-10-25 | **Builds on:** `../this-pr/feature-notification-delivery.md` § Diagnostics

## Problem

A breakdown in the notification delivery is a log line on the environment's Cloudflare dashboard. The admin sees it on
opening the dashboard.

## Solution

Workers Issues (open beta) groups a worker's uncaught exceptions, failed invocations, 5xx responses and error log
lines, and an automation sends an issue to a destination when it passes an occurrence threshold. `wrangler.toml` turns
Issues on for the app and the sender in each environment; the automation and its destination are set up per
environment in the Cloudflare dashboard or with the Cloudflare CLI, and the ops-runbook holds the steps. The
destinations are a chat channel, a generic webhook, an incident tool and a coding agent.

**OPEN:** the destination.

## Affected areas

`wrangler.toml`, `workers/sender/wrangler.toml`, `docs/ops-runbook.md`.
