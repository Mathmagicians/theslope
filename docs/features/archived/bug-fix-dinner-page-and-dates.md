# Bug fix: follow-ups found on `bugfix/admin-ux`

**Status:** Shipped, with four items deferred | **Date:** 2026-09-18 | **Updated:** 2026-10-13 | **Found on:** `bugfix/admin-ux` (PR #166)

Defects and findings from `bugfix/admin-ux`. The deferred items live in `../chores-0.9.1.md`: Stored dinner dates,
Dinner page remounts on claim, Catch-up amounts, Job schedule module.

## Fix inventory

| Fix | Where it lives |
|---|---|
| Dinner-date matcher by calendar day | `app/utils/season.ts` (`isSameDay`), unit case in `tests/component/utils/season.unit.spec.ts` |
| Query params synced in one flush | `app/composables/useUrlQueryWriter.ts` (ADR-006 § URL Writes), `tests/component/composables/useUrlQueryWriter.nuxt.spec.ts` |
| Composables after an await | `app/stores/plan.ts` resolves `useToast` and `useCookingTeam` at setup |
| Monthly billing label | `app/composables/useMaintenance.ts` `jobScheduleLabels`: "D. 18." |

## Configuration duplication

Observed 2026-09-16, re-checked 2026-09-18. Report only.

| Where | Duplication |
|---|---|
| `wrangler.toml` | the D1 block and `[triggers] crons` in each environment block (wrangler environments inherit no bindings) |
| `wrangler.toml`, `workers/sender/wrangler.toml`, `Makefile`, worker secrets | queue names, the compatibility date, host names (routes, `DEPLOY_URL`), and the dev test mailbox (`allowed_destination_addresses` and the two mailbox secrets); consistent on 2026-09-18 |
| `Makefile` | the Heynabo login body inlined in eight targets (`theslope-login-*`, `heynabo-login-*`, the event targets) beside the `theslope_call` / `heynabo_call` macros |
| `package.json` | every `db:seed:*` / `db:migrate:*` script names its D1 database |
| `.github/workflows/cicd.yml` | `HEY_NABO_*` mapped in the job env (line 35) and again in the smoke step (line 231) |
| `server/integration/heynabo/heynaboClient.ts`, `server/integration/github/githubClient.ts` | two config mechanisms: `process.env` (lines 23–24) and `useRuntimeConfig()` (line 95) |
