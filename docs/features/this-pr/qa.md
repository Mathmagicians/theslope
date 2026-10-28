# 0.9.1 QA

**Date:** 2026-10-28 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The checks with human eyes, as a walk through the app. A check passes with its date in **Signed off** and becomes one
line under § Signed off.

## /dinner and /household/&lt;S&gt;/bookings (5)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 110 | Defect 38 | `/household/<S>/bookings`: day, week and month view; the add-guest row | Each view and the add-guest row work as before | |
| 111 | Defect 39 | The guest rows on `/dinner` and in the week grid; the grid's save button | "Gæst", "Gæst af" and the save button read as before | |
| 112 | Defect 40 | `/dinner` and the week grid | The modes offered and the add-guest choices are as before | |
| 113 | Defect 72 | `/household/<S>/bookings`, week view: switch to a household that moved in or out within the week | Its columns and the residency alert follow the household | |
| 114 | Defect 73 | `/dinner` | The deadline badges look as before | |

## /household/&lt;S&gt; (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 115 | Defect 86 | `/household/<S>` | The tabs read Tilmeldinger, Præferencer, Allergier, Økonomi, Indstillinger | |

## /chef (6)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 88 | Chef calendar visit | `/chef`, calendar open, desktop and phone, light and dark mode | The team on view's dinners in its colours with the deadline chips; the other teams' dinners as grey outlined circles; Forklaring ends with "Andet madholds fællesspisning" | finding: defect 101 |
| 116 | Defect 78 | Save allergens, Annoncer, Aflys and undo the cancel | Each toasts once | |
| 117 | Defect 79 | As a cook, then as a kokkespire | The role line shows the role's icon | |
| 118 | Defect 82 | Save a menu, add and remove a purchase; `/admin/system` Kør a job | Each toast reads as before | |
| 119 | Defect 96 | The page source of `/dinner`, `/chef`, `/admin`, `/household/<S>` | `<meta name="description" …>` | |
| 122 | Defect 109 | A dinner's Budget at 375px | "ex / inkl. moms" sits on its own line under the badge and the period, on the right; nothing is cut off | |

## Signed off 2026-10-27

- #1 Mine indstillinger: Rediger, Gem; the choice holds after a reload
- #2 Mine indstillinger: Send testbesked reaches the test mailbox
- #3 /dinner past the deadline: a 0-portion guest books, without the hourglass
- #4 /dinner: Ingen removes the 0-portion guest; the tickets for sale stay
- #5 /dinner: a guest of a type with portions joins the waiting list, "Barn #1"
- #7 Week grid: the guest form stays open when a guest row arrives above it
- #8 /dinner: a place on the waiting list reads "Baby #1" with the hourglass
- #9 /dinner: a released ticket reads "Frigivet" in red with its icon
- #10 A member on another household's allergies: the visitor banner, read only
- #11 The allergy manager's override on allergies: an added allergy saves
- #14 Master-detail layout: the list a third, the detail the rest, at 800px and lg
- #15 Three faces and "+N" on a phone, five from md
- #16 Job boxes: each job's own latest run, Fejlet, "Ingen kørsler endnu"
- #17 Kør daglig vedligeholdelse: the new run, its Jobhistorik row, "Notifikationer"
- #18 Jobhistorik keeps six columns and scrolls inside its card on a phone
- #19 /admin/users: every column scrolls on a phone; the chevron opens the profile card
- #20 The booking status dry run lists per user what the first run sends
- #21 Dev: a booking mail stays unsent with the flag off; Send testbesked arrives
- #76 /dinner: a bought ticket reads "fra &lt;household&gt;" in blue with the claim icon
- #77 Economy: a dinner's row reads its menu title under Menu
- #80 /dinner: the first dinner after turning 12 reads Voksen with the birthday badge
- #81 Week grid: a Barn row and a Voksen row in the birthday week
- #83 Household header: the house icon, tab icons on a phone, the card edge to edge
- #84 Admin on another household's economy: the banner, the override, the table scrolls
- #85 Members: the power row shows three faces and "+N"
- #89 /chef: another team's dinner opens its tab with "Ikke dit hold"
- #90 /chef on a visit: no edits; Bliv chefkok, Kok and Kokkespire offered
- #91 Hvem laver maden?: "Ikke dit hold" on the visit only
- #92 Billetændringer: a season-wide run reads two names and "+N"
- #94 Save and cancel read one size on every form
- #97 Grid column chips read as the calendar's; none from 18:00
- #100 Grid: a released cell carries the released icon in its corner
- #105 Budget: the team badge and the period head the round; the total row is text
- #106 /dinner: Overtag chefkok-tjansen shows you in the team card at once
- #107 Budget: the dinner on view reads a dot and its name in bold

## Closed by component tests (0d0144b)

- #12 The allergy manager on another household's bookings tab: the visitor banner, no override button (`household-tab.nuxt.spec.ts`)
- #13 Admin on another household's bookings tab, override off: expected bookings as ghosts, no toast (`HouseholdBookings.nuxt.spec.ts`)
