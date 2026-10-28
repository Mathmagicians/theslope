# 0.9.1 QA

**Date:** 2026-10-28 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The checks with human eyes of what users see and the tests leave unproven, as a walk through the app. A check passes with its date in **Signed off** and becomes one
line under § Signed off.

## /dinner (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 114 | Defect 73 | `/dinner` | The deadline badges look as before | |

## /chef (2)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 122 | Defect 109 | A dinner's Budget at 375px | "ex / inkl. moms" sits on its own line under the badge and the period, on the right; nothing is cut off | |
| 148 | Defect 147 | `/chef` for a person on no team, phone and desktop, light and dark mode | "Ingen madhold" centred on a neutral soft surface with the larger title, in place of the violet box | finding: defect 147 reopened |

## /admin/allergies/pdf (3)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 132 | Defect 130 | `/admin/allergies/pdf`, the member in light mode, 1280px | A white sheet, a grey head band, dark text; Tilbage a solid button like Print | |
| 133 | Defect 130 | The same page, the member in dark mode | As #132: the legend alerts' and the table's text dark on white; the managers' faces ring ocean blue | |
| 135 | Defect 130 | Print preview from dark mode | White A4, dark text, the QR code beside the table, no Tilbage or Print button | |

## Signed off 2026-10-28

- #88 Chef calendar visit: the team on view's dinners in colour, the other teams' as grey circles, Forklaring's last line
- #141–#145 The visiting tab: the team icon above or beside "Madhold N" and "Ikke dit hold" on phone and desktop
- #123–#126 Avatar ring colours: the Alle row rings orange, inhabitants amber, the allergy managers ocean blue at 768px
- #127 Avatar ring colours: the managers' faces ring blue on the poster
- #128 Avatar ring colours: no ring and the managers below the message at 375px
- #129 Avatar ring colours: the dark-mode rings read in dark mode, Høj kontrast and Til farveblinde

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

## Closed without a browser check (2026-10-28)

- #110–#113, #115–#118 Booking views and chef page words, toasts and icons: the component tests prove them
- #119 The pages' meta description: the page source, nothing users see
- #134 The poster's Tilbage keeps the member's colour mode: Nuxt's colour mode per page
