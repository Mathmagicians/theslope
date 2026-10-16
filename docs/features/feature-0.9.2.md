# 0.9.2 features

**Status:** Proposed | **Date:** 2026-10-16 | **Builds on:** release 0.9 (`this-pr/release-0.9.0.md` § One booking path, end to end)

| Feature | What | Status |
|---|---|---|
| Ticket price portions | A season's ticket price carries the portions its tickets weigh | proposed |

## Ticket price portions

### Problem

Release 0.9 fills `TicketPrice.portions` on read (ADR-010 rule 7): `useTicket().withPortions` gives a price row the
portions of the config's default price with its type and price, else of its type's first default price. A season price
an admin sets away from the defaults weighs as its type's first default price, so a hungry baby at another price weighs
0 instead of a quarter.

### Solution

`TicketPrice` stores `portions`. A new season takes each price's portions from the config's default ticket prices, the
migration fills the existing rows from the same defaults, and the reads return the stored value in place of
`withPortions`. The config's default prices keep their portions as the seed for a new season.

### TDD

- `useTicket` spec: `withPortions` gives way to the stored value.
- `PUT /api/admin/season` API spec: the created prices carry the default portions.
- The migration's backfill: each existing price gets the portions of the default price with its type and price, else
  the first default price of its type.

### Affected areas

`prisma/schema.prisma` (`TicketPrice.portions`), `useTicketPriceValidation`, `useSeason` (default season prices),
`useTicket.portionsOf` and `withPortions`, the reads that fill a price row (`prismaRepository` season reads,
`financesRepository` order detail and dinner tickets), the season form's price rows, one migration through
`.claude/skills/prisma/SKILL.md` with the model signed off first.
