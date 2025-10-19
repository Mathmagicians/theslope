# Purpose

Solve problems with signing up for meals, and paying for them

# Features

## User roles
- 👩‍🍳Chef  - responsible for menu of dinner event, managing cooking team, shopping, cooking
- 🤖Admin - rsponsible for creating dinner events (according to school plan in Lejre)
- 😋Skråner - participates in cooking teams, and consumes meals together with the household, has a list of allergies

## Data model
- Dinner event
- Meal ticket - has type (regular, child, guest), venue (dining hall, take away),  household, date and is linked to a dinner event
- Household - has a pbs number, adress, associated users (skråner), and a list of household members - integrated from Heynabo 🤖

## Functionality

### Admin

#### Dining Season Management
- **Create dining season** with auto-generated dinner events
  - Define cooking days (weekdays selection)
  - Set holiday periods (excluded from event generation)
  - Automatic event generation based on season dates
  - Calendar visualization of generated events
- **Manage cooking teams** with master-detail interface
  - Create multiple teams in batch
  - Edit team names (immediate save on blur)
  - Add/remove teams (immediate save)
  - Assign members to teams with roles (Chef, Cook, Junior Helper)
  - Visual member count badges
  - Color-coded team identification

**Team Management Interface:**
```
┌─────────────────┬────────────────────────────────────────────────┐
│ TEAMS (Left)    │ EDIT TEAM (Right)                              │
│                 │                                                │
│ □ Hold 1 [8]    │ 🍳 [Hold 2___________] 👤👤👤 [6 medlemmer]  │
│ ■ Hold 2 [6]    │                                                │
│ □ Hold 3 [0]    │ ┌Madlavningsdage─┬─Holdkalender──────────────┐ │
│ □ Hold 4 [5]    │ │☑ Mon  ☐ Fri    │ Oct  Nov  Dec             │ │
│ ...             │ │☑ Wed  ☐ Sat    │ 🔵1 🔵8  🔵15 🔵5  🔵12   │ │
│                 │ │☐ Thu  ☐ Sun    │ 🔵3 🔵10 ...              │ │
│                 │ └────────────────┴───────────────────────────┘ │
│                 │                                                │
│                 │ Holdmedlemmer                                  │
│                 │ ┌Chefkok────┬Kok─────────┬Kokkespire─────────┐ │
│                 │ │👤 Anna    │👤 Bob      │👤 Charlie        │ │
│                 │ │           │👤 Diana    │                   │ │
│                 │ └───────────┴────────────┴───────────────────┘ │
│                 │                                                │
│                 │ Tilføj medlemmer                               │
│                 │ [Søg...___________]                            │
│                 │ □ Emma (LEDIG)      [Chef][Kok][Spire]        │
│                 │ □ Frank (LEDIG)     [Chef][Kok][Spire]        │
│                 │ ☑ Anna (Madhold 2)  [Fjern]                   │
└─────────────────┴────────────────────────────────────────────────┘
```
- Pick a team from the left, edit it on the right
- Set which days they prefer to cook - system uses this for fair rotation
- See the whole season in a color-coded calendar (blue badges = this team's cooking days)
- Add or remove team members with a quick search
- Everyone saves automatically - no save buttons needed

#### Household Management
- View all households with inhabitants
- Compact display with avatar groups
- Create new household for families that move to Skråningen
- Disable household for families that have left Skråningen

#### Future Features
- Assign chef for dinner event
- Monthly overview of meal tickets sold
- Monthly report in cvs format for invoicing
- Send monthly report to pbs system
- Store monthly report in blob archive
- Upgrade baby to child meal ticket type
- Upgrade child to adult meal ticket type

### Chef
#### Planning menu
- Create menu / edit menu
- See budget based on meal ticket quantity
- See kitchen team 
- see allergies

#### Cooking menu
- See number of dining guests
- see split for dining hall / take away - numbers and perentages
- see cancellations
- see allergies 

### Skråner
- Buy meal tickets (monthly view of household members and all dinner events) 
- See meal cost for invoice period (this and previous period)
- Buy extra tickets for guests
- Sell dinner tickets to other skråner safter deadline (if you can't make it)
- Cancel meal tickets (before deadline) - no cost
- Cancel meal tickets (after deadline) - cost
- change venue from dining hall to take away (before deadline)
