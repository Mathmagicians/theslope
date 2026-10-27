# 0.9.1 QA

**Date:** 2026-10-27 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The checks with human eyes, as a walk through the app. A check passes with its date in **Signed off**.

## /login → Mine indstillinger (2)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 1 | User saves and deserializers | Signed in, desktop: Rediger, change Farvevalg and a channel, Gem | A green toast; after a reload the choice holds | 2026-10-27 |
| 2 | Notification delivery | Same card: Send testbesked | Toast "Testbesked afsendt – tjek din indbakke/telefon"; on dev the mail reaches the test mailbox | 2026-10-27 |

## /dinner and /household/&lt;S&gt;/bookings (12)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 3 | Zero-portion tickets get a place | `/dinner?date=<dinner past its booking deadline>`, desktop: Tilføj gæst on a ticket price of 0 portions, Gem | The preview names a booking; the guest row reads booked, without the hourglass | 2026-10-27 |
| 4 | Zero-portion tickets get a place | Same guest row: Ingen, Gem | The guest row is gone; the dinner's tickets for sale stay as before | 2026-10-27 |
| 5 | Zero-portion tickets get a place | Same dinner, no ticket for sale of a type with portions: Tilføj gæst on that ticket price | The button reads Skriv på venteliste; after Gem the row reads its type and place, e.g. "Barn #1" | 2026-10-27 |
| 7 | Tables key their rows by id | `/household/<S>/bookings`, week grid: guest form open, save so a guest row arrives above it | The form stays open on its own row | 2026-10-27 |
| 8 | The grid shows the day view's tickets | `/dinner?date=<dinner with a place on the waiting list>`, desktop and phone | The line under the name reads the place in its ticket type's line, e.g. "Baby #1", with the hourglass | 2026-10-27 |
| 9 | The grid shows the day view's tickets | `/dinner?date=<dinner with a released ticket>`, light and dark mode | A person's row and a guest row read "Frigivet" in red with the released icon, as on the ticket | 2026-10-27 |
| 76 | The grid shows the day view's tickets | `/dinner?date=<past its booking deadline, tickets for sale>`: set a person to Spisesal, Køb billet | The person's row reads "fra &lt;seller's household&gt;" in blue with the claim icon, one size larger on desktop | 2026-10-27 |
| 80 | The grid shows the day view's tickets | `/dinner?date=<a person's first dinner after turning 12>`, without a booking, desktop and phone, light and dark mode | The person's ticket reads Voksen at the adult price; beside the name the neutral badge "Voksen fra &lt;dd/MM&gt;" with the cake icon; Forklaring adds "Ny billetpris fra fødselsdagen". The dinner before reads Barn without the badge | 2026-10-27 |
| 81 | The grid shows the day view's tickets | `/household/<S>/bookings`, the week of that dinner, then the week after | The person has a Barn row and a Voksen row; the Voksen row's name cell carries the badge after the ticket badge. The week after: one Voksen row, no badge | 2026-10-27 |
| 97 | Defect 24 | `/household/<S>/bookings`, week view with dinners past their booking deadline: one with tickets for sale, one with only a waiting list, one with neither; phone then desktop | Each column chip reads as the dinner calendar's chip on that day: the yellow chip with the number for sale, the yellow chip with the hourglass, the peach chip alone; the day view's Framelding badge names the same supply. An open dinner carries no chip; from the dinner's start (18:00) neither the grid's column nor the calendar's day carries one. The grid's chip sits centred under the date | 2026-10-27 |
| 100 | The grid shows the day view's tickets | `/household/<S>/bookings`, week view with a released ticket of a person and of a guest; phone then desktop, light and dark mode | Each released cell carries the released icon in the released colour in its corner, at the size of a waiting-list cell's hourglass; the day view's "Frigivet" badge for that dinner shows the same icon and colour | 2026-10-27 |
| 106 | Defect 104 | `/dinner?date=<a dinner with another chef>`, desktop: Overtag chefkok-tjansen, confirm | The team card lists you as chef at once, without a reload | 2026-10-27 |

## /household/&lt;S&gt;/economy and /admin/economy (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 77 | Defect 71 | `/household/<S>/economy` Kommende, `/admin/economy` the upcoming orders, a dinner with a menu | The dinner's row reads its menu title under Menu | 2026-10-27 |

## /household/&lt;S&gt; (2)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 83 | Defects 54 and 55 | `/household/<S>/bookings`, phone and desktop, light and dark mode | The house icon beside the address; on a phone the tabs show their icons, from md the icon and the label; the card runs edge to edge on a phone and is rounded from md | 2026-10-27 |
| 85 | Defects 54 and 55 | `/household/<S>/members`, phone then desktop | The power row shows three faces and "+N" | 2026-10-27 |

## /household/&lt;other S&gt; (5)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 84 | Defects 54 and 55 | Admin on `/household/<other S>/economy`, phone then desktop | The banner with the eye icon and Admin røre alligevel with the shield icon; on a phone the Økonomi table scrolls sideways inside its box | 2026-10-27 |
| 10 | Household data access and GET previews | A member on another household's allergies tab | Banner "Du besøger nu en anden husstand end din egen"; the allergies read only, without the override button | 2026-10-27 |
| 11 | Household data access and GET previews | The allergy manager (admin role off) on that tab: Admin røre alligevel, then Klik igen for at låse op | Banner "Admin rører, men forsigtigt"; an added allergy saves | 2026-10-27 |
| 12 | Household data access and GET previews | The allergy manager on that household's bookings tab | The visitor banner without the override button | component test, with test-engineer |
| 13 | Household data access and GET previews | Admin on another household's bookings tab, override off | The grid shows the expected bookings as ghosts; the page loads without an error toast | component test, with test-engineer |

## /chef (7)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 88 | Chef calendar visit | `/chef`, calendar open, desktop and phone, light and dark mode | The team on view's dinners in its colours with the deadline chips; the other teams' dinners as grey outlined circles; Forklaring ends with "Andet madholds fællesspisning" | finding: defect 101 |
| 89 | Chef calendar visit | Click another team's dinner | One navigation to `?team=<that team>&date=<that dinner>`; the team opens as the last tab with "Ikke dit hold" after its name, and the line "Du er ikke på &lt;team&gt;" under the tabs | 2026-10-27 |
| 90 | Chef calendar visit | Same visit, the dinner card | No menu, allergen, grocery or state edits, no Annoncer; Bliv chefkok, Kok and Kokkespire are offered; the allergen, announce, cancel and undo-cancel toasts come once each on the own team | 2026-10-27 |
| 91 | Chef calendar visit | The visit's Hvem laver maden?, desktop and phone; then the own team's dinner | On the visit "Ikke dit hold" after the team's badges; on the own team no badge | 2026-10-27 |
| 92 | Defect 87 | A dinner with a season-wide run in its history: Budget, Billetændringer, Vis fuld historik; desktop, then phone | A line over many households reads two names and "+N" in the line; a click lists every name wrapped in the Husstand column, ending in "skjul"; on a desktop every column stays in view | 2026-10-27 |
| 105 | Defect 102 | A dinner's Budget, the team's round and Madbestilling; phone and desktop | The heading shows the team's badge "Madhold 2" in its colour and the period; the total row reads "Madhold 2" as text; no "Hele"; Madbestilling's heading reads "Madhold 2, periode …" | 2026-10-27 |
| 107 | Defect 103 | Same Budget, the team's round; phone and desktop | The dinner on view reads a dot before its name and the name in bold, on one line | 2026-10-27 |

## Layout (3)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 14 | One master-detail layout (#169) | `/dinner`, `/chef`, `/admin/allergies`, `/admin/teams`, `/household/<S>/bookings` at about 800px, then lg | The list takes a third (min 245px), the detail the rest; the calendar has room at md; its day circles step up a size from lg | 2026-10-27 |
| 15 | Three faces on a phone (#171) | `/dinner` the team card, `/admin/teams` the team card and the household list; phone then desktop | 3 faces and "+N" on a phone, 5 from md; the names wrap under the faces, each row stays inside its card, the page does not scroll sideways | 2026-10-27 |
| 94 | Defect 93 | `/dinner` a person's row and the power row, `/household/<S>/members` a member's and the power row's preferences, `/chef` add a team member and a joker, `/admin/households` Ny husstand and its form, `/admin/users` a profile's roles, Hjælp feedback, `/admin/teams` create; phone then desktop | Save and cancel read one size side by side on every form, the power save in the power colour with the bolt | 2026-10-27 |

## /admin/system (3)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 16 | The job boxes' latest run | Desktop, light and dark mode | Månedlig Fakturering shows its own latest run; a failed run reads Fejlet with its icon; a job without runs reads "Ingen kørsler endnu" | 2026-10-27 |
| 17 | The job boxes' latest run | Kør daglig vedligeholdelse | The box shows the skeleton, then the new run's time and status; Jobhistorik gains the row; the result carries the line "Notifikationer" | 2026-10-27 |
| 18 | Tables keep their columns on a phone | Phone, light and dark mode; then desktop | Desktop shows the same six columns without the chevron. Jobhistorik keeps its six columns (Dato, Job, Status, Varighed, Kilde, Resultat) and scrolls sideways inside its card | 2026-10-27 |

## /admin/users (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 19 | Tables keep their columns on a phone | Phone, light and dark mode; the chevron also on desktop | Every column (#, Navn, Mail, Telefon, Systemroller, Sidst opdateret) shows and scrolls sideways; the chevron opens the profile card, which fits the screen with Heynabo and Rediger visible and stays in view while the columns scroll | 2026-10-27 |

## Dev and terminal (2)

| # | Package | State | What to see | Signed off |
|---|---|---|---|---|
| 20 | Notification delivery | `make theslope-sender-dry-run-booking-status-dev` | Per user, the booking notifications the first run sends; the run sends and records nothing | 2026-10-27 |
| 21 | Notification delivery | Dev: join a waiting list after the deadline | The booking mail stays unsent (the flag is off on dev); Send testbesked reaches the test mailbox | 2026-10-27 |
