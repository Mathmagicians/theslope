# Bug Fix: Raw motion classes into the design system

**Status:** Parked — next release | **Date:** 2026-10-04 | **Branch:** none

Animation, transition and transform classes written raw in `.vue` files instead of design-system tokens (ADR-018 [Design System Owns Shared UI Patterns]). Inventory from the 2026-10-04 sweep of `app/components/` and `app/pages/`. `HouseholdAllergies.vue` binds `BUTTONS.flipOpenTurn`, `BUTTONS.flipOpen`'s turn classes, on its leading chevron (`chore/npm-dependencies`); its closed state carries `duration-200` by the user's decision of 2026-10-05. Everything below needs a new token.

## Fix inventory

| Fix | Sites | Raw classes |
|---|---|---|
| Power-mode fireworks | `HouseholdCard.vue:238/240`, `HouseholdCard.vue:370-372`, `DinnerBookingForm.vue:605-606` | `hover:animate-pulse hover:scale-125 hover:rotate-45 hover:text-warning active:scale-175 active:rotate-[720deg] active:text-error` + `transition-all duration-700`; `group-hover:animate-pulse group-hover:scale-125 group-hover:rotate-12 group-active:rotate-[360deg]` + `animate-spin` (saving); `hover:animate-pulse hover:text-warning` + `transition-all duration-300` — colour values ride inside |
| Busy spinner | `OrderHistoryDisplay.vue:72`, `AdminEconomy.vue:541`, `AdminSystem.vue:371`, `HouseholdCard.vue:371` | `animate-spin` — one value, one token, four sites |
| Turn variants | `DinnerBookingForm.vue:605-606` (`rotate-180` + `transition-all duration-300`), `HouseholdCard.vue:237/240` (`rotate-180` + `transition-all duration-700`), `ViewError.vue:35` (`-rotate-180`), `BookingGridView.vue:767-768` (`rotate-45` + `transition-transform duration-200`) | Each value differs from `BUTTONS.flipOpen`'s `rotate-180 transition-transform duration-200`; one token per value, named by site |
| One-off motion | `DinnerModeSelector.vue:315` (`animate-pulse` via `shouldPulse`), `Ticker.vue:18-19` (`animate-marquee`, keyframes already in `main.css` `@theme`; the wrapper function returns a constant — bind directly) | |
| Hover micro-interactions | `UserListItem.vue:163/204` (`hover:scale-110 hover:rotate-3 transition-transform duration-200`, twice), `CookingTeamCard.vue:404` + `DinnerBudget.vue:82` (`hover:opacity-80 transition-opacity`, identical pair → one token), `CountdownTimer.vue:122` (`hover:ring-2 hover:ring-opacity-50 transition-all`), `ChefDinnerCard.vue:96` (`transition-shadow duration-200 hover:shadow-lg`), `AllergyCatalogTable.vue:116` (`transition-colors`), `UserProfileCard.vue:253` (`hover:no-underline hover:text-primary transition-colors` — colour inside) | |

## Solution

- A `MOTION` group in `useTheSlopeDesignSystem` holds the primitives (`spin`, `pulse`, `marquee`, the turn variants, the hover interactions); `COMPONENTS.powerMode` gains sub-tokens for its three fireworks faces, carrying their colour.
- Value-preserving: one token per distinct original value, named by where it is used; proof is a before/after class-set comparison per template. Near-identical values (`ChefDinnerCard.vue:96` vs the DS hover-card base at `useTheSlopeDesignSystem.ts:1690`; the 300/700 turn durations vs `BUTTONS.flipOpen`'s 200) stay separate tokens; unifying any pair is a visual decision taken from a proposal.
- Consistency on extraction: the sweep covers the sites above and the DS-internal strings in the same change (`BUTTONS.flipOpen` delegates to the turn primitive, `dot` at `:1662` and `installIcon` compose from the primitives).
- Enforcement lands with the sweep as `designSystemUsage` rules: a raw motion utility (`animate-`, `transition`, `rotate-`, `scale-`, `duration-`) in a `.vue` template fails with `file:line`; a `<style>` block in a `.vue` fails, with `app/pages/admin/allergies/pdf.vue` exempt (print CSS that utilities cannot express).
- `docs/ui.md` documents the tokens and names the visual check.

## Decisions

**OPEN — motion-reduce guards:** adding `motion-reduce:animate-none` to the infinite animations (spin, pulse, marquee, fireworks) changes rendered classes — an accessibility improvement consistent with EN 301 549, to decide with the sweep.
