# 0.9.1 QA

**Date:** 2026-10-28 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The checks with human eyes of what users see and the tests leave unproven, as a walk through the app. A check passes with its date in **Signed off** and becomes one
line under § Signed off.

## Open

| # | Check | Where | What to see | Signed off |
|---|---|---|---|---|
| 166 | Header layout: the phone bar | 375px | The bar as wide as its content and centred; the logo 64px, its text bold, on the bar's vertical centre; the burger about 6px nearer the edge | |
| 167 | Header layout: the drawer | 375px, the burger | The open drawer: the header row, then Admin, the person with avatar, help; the burger primary soft while open | |
| 168 | Header layout: the desktop bar | 1280px, scrolling; also between 768 and 1023px | A centred rounded bar 16px from the top; the centre Fællesspisning / Husstand / Madhold with icons; right Admin, the person, help; the logo 128px bold; no burger | |
| 169 | Header layout: the first paint | Desktop, cache off or throttled | No link jumps after hydration | |
| 170 | Header layout: widening with the drawer open | 375px → past 768px | The overlay gone, the page scrolls, the links and help respond | |
| 171 | Header layout: stacking | The booking grid in edit mode, a calendar, a popover, the help card, a modal, a toast | The grid's sticky edit footer, the calendars' sticky headers and z-40 elements pass under the bar; popovers, the help card, modals and toasts open above it | |
| 172 | Header layout: the active link | `/dinner`, `/household/…`, `/chef`, `/admin`; tab to the logo | The active link primary soft; a focus ring on the logo link | |
| 173 | Header layout: signed out | `/login`, phone and desktop | Phone: the LOGIN icon and the burger, the drawer with help only; desktop: LOGIN with its label, an empty centre | |

## Signed off 2026-11-02

- #165 Cost line types, billed lines: as before, no mode, a closed or released badge, the amount, history where the order exists
- #164 Cost line types, the admin economy: each line with the eater's name, mode and amount; the dinner's count and total as before; an order under its eater's household
- #163 Cost line types, the household's economy: each line with the eater's name, ticket type, mode, amount and history
- #161 The visited team on the server render: `/chef` first paint shows the next dinner's team as the visiting tab, its calendar and the dinner card, no "Henter kalender..." flash; a member on a team gets their own team the same way
- #162 Danger button contrast: the label readable through the whole wipe in light and dark, the ring visible

## Signed off 2026-10-29

- #122, #153 A dinner's Budget heading: a long menu title wraps in full with the date at its end at 375px, a short one shares its line with "ex / inkl. moms" at 1280px (defect 109)
- #154 The Heynabo logo on the import's job box: round, in full colour, at the icons' size

## Signed off 2026-10-28

- #148, #151, #152 `/chef` for a member on no team: the visit to the next dinner's team on phone and desktop, another team's dinner switches the tab (signed with defect 147)
- #132–#134 The allergy poster: a white sheet with dark text in light and dark mode, Tilbage solid like Print, the member's mode kept
- #135 The allergy poster's print preview from dark mode: white A4, dark text, the QR code beside the table
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
- #114 The deadline badge: its two tokens hold the classes the template wrote, the same rendered classes
- The no-team `/chef` with no dinner ahead or no season ("Ingen madhold" alone, no `?team=`): `chef.nuxt` proves it
