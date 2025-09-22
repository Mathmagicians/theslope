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
- Create dinner event
- Assign chef for dinner event
- Assign cooking team for dinner event
- Create new household for families that move to Skråningen
- Disable household for families that have left Skråningen
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
