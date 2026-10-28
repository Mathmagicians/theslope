# Feature Proposal: Notification triggers — team assignments, alarms, SMS

**Status:** Proposal | **Date:** 2026-08-31 | **Updated:** 2026-10-25
**Builds on:** the notification delivery (`../this-pr/feature-notification-delivery.md`: the sender events, the channel matrix,
the Delivery rows) and the duty roster (`feature-proposal-duty-roster.md`)

## Decisions (2026-09-16)

- Chef deadline reminders and overdue notices go to the chef only.
- A new system role `PLANNINGMANAGER` receives the alerts for chefless dinners.
- Alarms and warnings appear on the landing page after login.
- `fetchUsersByRole` matches roles by JSON substring (`contains`); `PLANNINGMANAGER` keeps role names non-overlapping, or the
  lookup switches to exact-array matching.

**2026-10-26**
- The move-out notifications, set and cancelled, go to all the users of the household.

## Open

- **Where chefless-dinner alerts show:** `/admin/teams` or the chef page.
- **Shift start for the 24 h / 1 h team reminders:** the dinner start, or a configurable cooking offset.

## Team assignments

`TEAM_ASSIGNMENTS` is a sender event of the delivery step (`deliverDesired`, `../this-pr/feature-notification-delivery.md`), with one template per kind in `app/config/notificationTemplates.ts`.

| Kind | Recipients | When |
|---|---|---|
| `CHEF_ROSTER_DEADLINE` / `CHEF_ROSTER_OVERDUE` | the dinner's chef | the roster deadline, dinner − `rosterIsSignedOffHoursBefore` (`feature-proposal-duty-roster.md` § Roster UX) |
| `DINNER_NO_CHEF` | `PLANNINGMANAGER` | a dinner without a chef |
| `DUTY_SHIFT_REMINDER` | the team's members | 24 h and 1 h before the shift, from an hourly Nitro task in `app/config/systemJobs.ts`; team → assignment → inhabitant → user is a new repository query (ADR-009 Display type) |
| `DUTY_SWAPPED` | both swap parties | a duty swap commits (`feature-proposal-duty-roster.md` Phase 5); the chef-swap flow joins the same kind |

## Household and member events

A sender event of the delivery step, one template per notification in `app/config/notificationTemplates.ts`. A
notification about an inhabitant goes to the closest user (findClosestUserInHousehold).

| Notification | Recipient | When |
|---|---|---|
| A user joins | the new user | the Heynabo import creates the user |
| Move-out date set | all the users of the household | the household saves a move-out date |
| Move-out cancelled | all the users of the household | the household removes its move-out date |
| Ticket category by age | the closest user of the member | a birthday moves the member into the next ticket type, by the age limits of the season's ticket prices |

**OPEN:** the notification names and texts (mockup).

## SMS delivery

GatewayAPI (OnlineCity, DK) behind the sender's `SmsProvider` port: `workers/sender/utils/providers/gatewayApiSms.ts`
replaces `smsNotEnabled.ts`, which acknowledges an SMS message with `[SMS] channel not enabled`. SMS is a channel of the
delivery matrix (`DeliveryKind` `SMS`): `COMPOSE` in `server/utils/sender/deliveries.ts` takes an SMS composer beside
`composeEmail`, the channels come from `User.notificationChannels` (`EMAIL`, `SMS`), and `normalizeToMsisdn` turns
`User.phone` (Heynabo-owned) into the contract's MSISDN.

- Vars `SMS_SENDER_ID` (`Skraaningen`, 11 characters) and `GATEWAYAPI_BASE_URL`; the secret `GATEWAYAPI_TOKEN` is set with
  `npx wrangler secret put GATEWAYAPI_TOKEN -c workers/sender/wrangler.toml --env <env>`.
- Status taxonomy: 429 and 5xx retryable; 400/422, 401/403 and 402 terminal.
- Tests: a provider spec for the taxonomy; `make theslope-sender-event-test-<env>` with an SMS recipient delivers a real SMS,
  which also verifies that the Danish carriers accept the sender ID.
- The contract holds the limits: `MsisdnSchema` (`45` + 8 digits), 160 GSM-7 characters (`isGsm7`) in
  `workers/sender/contract.ts`.
- Account: GatewayAPI EU, prepaid, 0.307 DKK per SMS (300–1,500 SMS a month ≈ 92–460 DKK).

Provider research (2026-08-31):

| Provider | Security record | Scale | DK price |
|---|---|---|---|
| **GatewayAPI** (OnlineCity, DK) | no reported CVEs or breaches; IP allowlisting; EU platform | hundreds of millions of SMS a year | **0.307 DKK**, pay-as-you-go |
| CPSMS (Compaya, DK) | no reported breaches; annual ISAE 3000 audit | small, domestic, since 2006 | 0.39 DKK at 1k points (ex VAT) |
| Twilio | 2022 phishing breach; 2024 Authy leak, 33M phone numbers (CVE-2024-39891) | global | ~0.40 DKK |

Sources: gatewayapi.com/da/priser and docs/apis/rest, cpsms.dk/priser, twilio.com/en-us/sms/pricing/dk, securityweek.com,
nvd.nist.gov CVE-2024-39891.
