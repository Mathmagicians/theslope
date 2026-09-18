# Feature Proposal: Notification triggers — reminders, alarms, SMS

**Status:** Proposal | **Date:** 2026-08-31 | **Updated:** 2026-09-18
**Builds on:** the delivery pipe, the accountant mail and the channel preference in
[`archived/feature-notifications.md`](archived/feature-notifications.md)

## What exists

| Piece | Where |
|---|---|
| Delivery | `theslope-sender` consumes `theslope-sender-{env}` and sends e-mail through the `send_email` binding; an SMS message is acknowledged with `[SMS] channel not enabled` (`workers/sender/utils/providers/smsNotEnabled.ts`) |
| Message contract v1 | `workers/sender/contract.ts`, re-exported by `app/composables/useNotificationValidation.ts`; `meta.kind` is app-owned |
| Composing | `composeEmail` in `server/utils/sender/compose.ts`; one template per kind in `app/config/notificationTemplates.ts` |
| Events | `server/utils/sender/events/<event>.ts`, its HTTP twin `POST /api/admin/sender/event/<event>`, `make theslope-sender-event-<event>-<env>` |
| Delivery facts | the `Delivery` table (`subjectType`, `subjectId`, `version`, `kind` `ARCHIVE` / `EMAIL` / `SMS`), `app/composables/useDeliveryValidation.ts` |
| Channel preference | `User.notificationChannels` (`EMAIL`, `SMS`), `useUserPreferenceValidation.ts`, `POST /api/user/preferences`, `POST /api/user/notifications/test`, `UserPreferencesCard.vue` ("My preferences" in `bug-fix-admin-ux.md`) |
| In-app alerts | `ALERTS` in `useTheSlopeDesignSystem.ts` (ADR-018) |

## Decisions (2026-09-16)

- Chef deadline reminders and overdue notices go to the chef only.
- A new system role `PLANNINGMANAGER` receives the alerts for chefless dinners.
- Alarms and warnings appear on the landing page after login.
- `fetchUsersByRole` matches roles by JSON substring (`contains`); `PLANNINGMANAGER` keeps role names non-overlapping, or the
  lookup switches to exact-array matching.

## Open

- **Where chefless-dinner alerts show:** `/admin/teams` or the chef page.
- **Shift start for the 24 h / 1 h team reminders:** the dinner start, or a configurable cooking offset.

## Trigger catalog

Each trigger is one template in `app/config/notificationTemplates.ts` and one event in `server/utils/sender/events/`, emitting
contract messages through `env.SENDER`.

| Kind | Recipients | When |
|---|---|---|
| `CHEF_MENU_DEADLINE` / `CHEF_MENU_OVERDUE` | the dinner's chef | the menu deadline, dinner − `menuIsAnnouncedDaysBefore` (`useSeason().deadlinesForSeason`) |
| `DINNER_NO_CHEF` | `PLANNINGMANAGER` | a dinner without a chef |
| `DUTY_SHIFT_REMINDER` | the team's members | 24 h and 1 h before the shift, from an hourly Nitro task; team → assignment → inhabitant → user is a new repository query (ADR-009 Display type) |
| `JOB_FAILED` | admins | a system job run ends failed |
| `DINNER_CANCELLED` | the dinner's diners | a dinner is cancelled |

The reminder crons join the schedule that "Job schedule labels" in `bug-fix-dinner-page-and-dates.md` single-sources.

## Producer for user notifications

Carried over from the 2026-08-31 draft; re-validated in this task.

`server/utils/notifications/notificationService.ts`: `notifyUsers(queue, users, rendering)` returns a result in every case (a
missing binding logs a warning and reports degraded); `normalizeToMsisdn` and `resolveDeliveries` are pure; `sendBatch` runs in
chunks of 100. Addresses resolve from `User.email` / `User.phone` at enqueue time (Heynabo-owned), channels from
`User.notificationChannels`.

## SMS delivery

GatewayAPI (OnlineCity, DK) behind the sender's `SmsProvider` port: `workers/sender/utils/providers/gatewayApiSms.ts` replaces
`smsNotEnabled.ts`.

- Vars `SMS_SENDER_ID` (`Skraaningen`, 11 characters) and `GATEWAYAPI_BASE_URL`; the secret `GATEWAYAPI_TOKEN` is set with
  `npx wrangler secret put GATEWAYAPI_TOKEN -c workers/sender/wrangler.toml --env <env>`.
- Status taxonomy: 429 and 5xx retryable; 400/422, 401/403 and 402 terminal.
- Tests: a provider spec for the taxonomy; `make theslope-sender-event-test-<env>` with an SMS recipient delivers a real SMS,
  which also verifies that the Danish carriers accept the sender ID.
- The contract holds the limits: `MsisdnSchema` (`45` + 8 digits), 160 GSM-7 characters (`isGsm7`).
- Account: GatewayAPI EU, prepaid, 0.307 DKK per SMS (300–1,500 SMS a month ≈ 92–460 DKK).

Provider research (2026-08-31):

| Provider | Security record | Scale | DK price |
|---|---|---|---|
| **GatewayAPI** (OnlineCity, DK) | no reported CVEs or breaches; IP allowlisting; EU platform | hundreds of millions of SMS a year | **0.307 DKK**, pay-as-you-go |
| CPSMS (Compaya, DK) | no reported breaches; annual ISAE 3000 audit | small, domestic, since 2006 | 0.39 DKK at 1k points (ex VAT) |
| Twilio | 2022 phishing breach; 2024 Authy leak, 33M phone numbers (CVE-2024-39891) | global | ~0.40 DKK |

Sources: gatewayapi.com/da/priser and docs/apis/rest, cpsms.dk/priser, twilio.com/en-us/sms/pricing/dk, securityweek.com,
nvd.nist.gov CVE-2024-39891.
