# 0.9.1 QA

**Date:** 2026-10-27 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The checks with human eyes, as a walk through the app. A check passes with its date in **Signed off**.

## /login → Mine indstillinger (2)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 1 | User saves and deserializers | Signed in, desktop: Rediger, change Farvevalg and a channel, Gem | A green toast; after a reload the choice holds | |
| 2 | Notification delivery | Same card: Send testbesked | Toast "Testbesked afsendt – tjek din indbakke/telefon"; on dev the mail reaches the test mailbox | |

## /dinner and /household/&lt;S&gt;/bookings (10)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 3 | Zero-portion tickets get a place | `/dinner?date=<dinner past its booking deadline>`, desktop: Tilføj gæst on a ticket price of 0 portions, Gem | The preview names a booking; the guest row reads booked, without the hourglass | |
| 4 | Zero-portion tickets get a place | Same guest row: Ingen, Gem | The guest row is gone; the dinner's tickets for sale stay as before | |
| 5 | Zero-portion tickets get a place | Same dinner, no ticket for sale of a type with portions: Tilføj gæst on that ticket price | The button reads Skriv på venteliste; after Gem the row reads its type and place, e.g. "Barn #1" | |
| 6 | Tables key their rows by id | `/dinner?date=<past deadline>`: open Tilføj gæst, save a guest that queues | The add-guest row stays open; the queued guest's card stays closed | |
| 7 | Tables key their rows by id | `/household/<S>/bookings`, week grid: guest form open, save so a guest row arrives above it | The form stays open on its own row | |
| 8 | The grid shows the day view's tickets | `/dinner?date=<dinner with a place on the waiting list>`, desktop and phone | The line under the name reads the place in its ticket type's line, e.g. "Baby #1", with the hourglass | |
| 9 | The grid shows the day view's tickets | `/dinner?date=<dinner with a released ticket>`, light and dark mode | A person's row and a guest row read "Frigivet" in red with the released icon, as on the ticket | 2026-10-27 |
| 76 | The grid shows the day view's tickets | `/dinner?date=<past its booking deadline, tickets for sale>`: set a person to Spisesal, Køb billet | The person's row reads "fra &lt;seller's household&gt;" in blue with the claim icon, one size larger on desktop | 2026-10-27 |
| 80 | The grid shows the day view's tickets | `/dinner?date=<a person's first dinner after turning 12>`, without a booking, desktop and phone, light and dark mode | The person's ticket reads Voksen at the adult price; beside the name the neutral badge "Voksen fra &lt;dd/MM&gt;" with the cake icon; Forklaring adds "Ny billetpris fra fødselsdagen". The dinner before reads Barn without the badge | |
| 81 | The grid shows the day view's tickets | `/household/<S>/bookings`, the week of that dinner, then the week after | The person has a Barn row and a Voksen row; the Voksen row's name cell carries the badge after the ticket badge. The week after: one Voksen row, no badge | |

## /household/&lt;S&gt;/economy and /admin/economy (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 77 | Defect 71 | `/household/<S>/economy` Kommende, `/admin/economy` the upcoming orders, a dinner with a menu | The dinner's row reads its menu title under Menu | 2026-10-27 |

## /household/&lt;other S&gt; (4)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 10 | Household data access and GET previews | A member on another household's allergies tab | Banner "Du besøger nu en anden husstand end din egen"; the allergies read only, without the override button | |
| 11 | Household data access and GET previews | The allergy manager (admin role off) on that tab: Admin røre alligevel, then Klik igen for at låse op | Banner "Admin rører, men forsigtigt"; an added allergy saves | |
| 12 | Household data access and GET previews | The allergy manager on that household's bookings tab | The visitor banner without the override button | |
| 13 | Household data access and GET previews | Admin on another household's bookings tab, override off | The grid shows the expected bookings as ghosts; the page loads without an error toast | |

## Layout (2)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 14 | One master-detail layout (#169) | `/dinner`, `/chef`, `/admin/allergies`, `/admin/teams`, `/household/<S>/bookings` at about 800px, then lg | The list takes a third (min 245px), the detail the rest; the calendar has room at md; its day circles step up a size from lg | |
| 15 | Three faces on a phone (#171) | `/admin/teams` team card and the household list, phone then desktop | 3 faces and "+N" on a phone, 5 from md; each row stays inside its card | |

## /admin/system (3)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 16 | The job boxes' latest run | Desktop, light and dark mode | Månedlig Fakturering shows its own latest run; a failed run reads Fejlet with its icon; a job without runs reads "Ingen kørsler endnu" | |
| 17 | The job boxes' latest run | Kør daglig vedligeholdelse | The box shows the skeleton, then the new run's time and status; Jobhistorik gains the row; the result carries the line "Notifikationer" | |
| 18 | Tables keep their columns on a phone | Phone, light and dark mode; then desktop | Desktop shows the same six columns without the chevron. Jobhistorik keeps its six columns (Dato, Job, Status, Varighed, Kilde, Resultat) and scrolls sideways inside its card | |

## /admin/users (1)

| # | Package | State, viewport | What to see | Signed off |
|---|---|---|---|---|
| 19 | Tables keep their columns on a phone | Phone, light and dark mode; the chevron also on desktop | Every column (#, Navn, Mail, Telefon, Systemroller, Sidst opdateret) shows and scrolls sideways; the chevron opens the profile card, which fits the screen with Heynabo and Rediger visible and stays in view while the columns scroll | |

## Dev and terminal (2)

| # | Package | State | What to see | Signed off |
|---|---|---|---|---|
| 20 | Notification delivery | `make theslope-sender-dry-run-booking-status-dev` | Per user, the booking notifications the first run sends; the run sends and records nothing | |
| 21 | Notification delivery | Dev: join a waiting list after the deadline | The booking mail stays unsent (the flag is off on dev); Send testbesked reaches the test mailbox | |
