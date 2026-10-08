# Bug report: the chef's available budget changes after the ticket deadline

**Status:** Next release, investigation | **Date:** 2026-10-08 | **Environment:** prod | **Dinner:** 9 October 2026

## Observation

The chef page shows a dinner's "rådighedsbeløb". For the dinner on 9 October 2026 the amount the chef saw changed a
few days before cooking, after the ticket deadline had passed. The deadline is the season's
`ticketIsCancellableDaysBefore` counted from the dinner date.

## What the amount is

`calculateBudget` in `app/composables/useOrder.ts`: the dinner's active orders (`isActiveOrder`) summed by
`priceAtBooking` give the revenue; the kitchen contribution is `kitchenBaseRatePercent` of it (5 by default); the
available budget is the revenue less the contribution, shown including VAT and ex VAT (`vatPercent`, 25). The amount
moves when an active order appears, disappears, changes state or changes `priceAtBooking`.

## Where the history is

Every order mutation writes an `OrderHistory` row with `action`, `performedByUserId` (null for a job), `timestamp`,
the denormalized `orderId`, `inhabitantId`, `dinnerEventId`, `seasonId` and `auditData` (JSON with `source` and the
order data of the mutation). Deleted orders keep their rows. The jobs that touch orders run on a schedule: the
Heynabo import at 01:00 UTC, the daily maintenance at 02:00 UTC (ADR-015).

## Investigation, read-only on prod

Queries run through `npx wrangler d1 execute theslope-prod --remote --env prod --json --command "<sql>"`.

1. The dinner and its deadline:
   ```sql
   SELECT d.id, d.date, d.state, d.seasonId, s.ticketIsCancellableDaysBefore
   FROM DinnerEvent d JOIN Season s ON s.id = d.seasonId
   WHERE d.date LIKE '2026-10-09%'
   ```
2. Every order mutation on the dinner, in time order, with who and what:
   ```sql
   SELECT h.timestamp, h.action, h.performedByUserId, h.orderId, h.inhabitantId,
          json_extract(h.auditData, '$.source') AS source,
          json_extract(h.auditData, '$.orderData.state') AS state,
          json_extract(h.auditData, '$.orderData.priceAtBooking') AS priceAtBooking,
          json_extract(h.auditData, '$.orderData.isGuestTicket') AS isGuestTicket
   FROM OrderHistory h WHERE h.dinnerEventId = <dinner id> ORDER BY h.timestamp
   ```
3. The orders as they stand, with the fields the budget reads:
   ```sql
   SELECT id, inhabitantId, state, priceAtBooking, isGuestTicket, releasedAt, createdAt, updatedAt
   FROM "Order" WHERE dinnerEventId = <dinner id> ORDER BY createdAt
   ```
4. The budget per day: replay query 2 from the first row, keeping each order's last state and price per day, and
   sum `priceAtBooking` over the orders `isActiveOrder` counts; the day the sum moves after the deadline names the
   mutation.

## Leads, by the evidence each leaves

| Lead | Row in `OrderHistory` | Check |
|---|---|---|
| Inhabitant deleted by the Heynabo import; `Order` cascades on `Inhabitant` (ADR-013) | none for the order, the import log names the inhabitant | an order id in query 2 that is absent from query 3, an inhabitant absent from `Inhabitant` |
| Release after the deadline (`RELEASED` stays billed; `isActiveOrder` decides whether it counts) | `USER_CANCELLED` or `SYSTEM_UPDATED` with state `RELEASED`, source `user-booking` or `preference-update` | timestamp after the deadline |
| Price category change (birthday passed, birth date edited; ADR-016 `priceUpdated`) | `SYSTEM_UPDATED` with a new `priceAtBooking` | the inhabitant's `birthDate` against the season's age bands |
| Guest ticket added or a released ticket claimed after the deadline | `USER_BOOKED`, `USER_CLAIMED` with `isGuestTicket` or source `api_order_put` | `performedByUserId` set |
| Admin correction with `?adminBypass=true` | source `api_order_put` or a DELETE action with `performedByUserId` set | the user's role |
| Re-scaffold after a residency or preference change (`rescaffoldOnFieldChange`, ADR-016) | source `preference-update` or `scaffold-prebookings` | a `moveOutDate`, `movedInDate` or `dinnerPreferences` change on the household the same day |

## Expected outcome

One named mutation per movement of the amount after the deadline, with its actor and source, and a decision on the
rule: which mutations the chef's amount follows after the deadline, and whether the chef page shows the amount's
history for the dinner.

## Affected

`app/composables/useOrder.ts` (`calculateBudget`, `isActiveOrder`), `server/utils/scaffoldPrebookings.ts`,
`server/integration/heynabo/*` (inhabitant deletion), `app/components/chef/ChefMenuCard.vue`.
