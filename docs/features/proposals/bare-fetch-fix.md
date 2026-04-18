# bare fetch is not ssr friendly

## observed issues
- admin economy doesn load PAST periods - have to go to "admin system" and run billing!
- chef page has sometimes transient hydration issues 

## principles
- store should not hold ui state
- url is the source of truth 
- bare fetch should be replaced by useRequestFetch  - ssr friendly
- useasyncdata should be used for consistent loading state management, but only for data that is actually needed for the page (not for store-fetching)
- code should be DRY, avoid identical code blocks on pages

## obseved lack of consistency

┌─────────────────────┬───────────────────────────────────────────────┬───────────────┬─────────────────────────────────┐
│      Consumer       │                 What it needs                 │   What it     │               How               │
│                     │                                               │    fetches    │                                 │
├─────────────────────┼───────────────────────────────────────────────┼───────────────┼─────────────────────────────────┤
│ /dinner             │ DinnerEventDetail (chef, team, tickets for    │ Detail +      │ 2× page-level useAsyncData,     │
│                     │ kitchen stats) + household OrderDisplay[]     │ Orders        │ bare $fetch                     │
├─────────────────────┼───────────────────────────────────────────────┼───────────────┼─────────────────────────────────┤
│ /chef               │ DinnerEventDetail (for editing menu, state    │ Detail only   │ page-level useAsyncData +       │
│                     │ changes)                                      │               │ onMounted workaround            │
├─────────────────────┼───────────────────────────────────────────────┼───────────────┼─────────────────────────────────┤
│ /household/bookings │ DinnerEventDisplay (from season) + household  │ Orders only   │ ✅ store's                      │
│                     │ OrderDisplay[]                                │ (via store)   │ loadOrdersForDinners()          │
├─────────────────────┼───────────────────────────────────────────────┼───────────────┼─────────────────────────────────┤
│ AdminEconomy        │ OrderDisplay[] (all households, upcoming)     │ Orders        │ component-level useAsyncData,   │
│                     │                                               │               │ bare $fetch                     │
└─────────────────────┴───────────────────────────────────────────────┴───────────────┴─────────────────────────────────┘

Key insight: DinnerEventDetail is needed by /dinner and /chef — both for the same "dinner detail panel" layout (menu hero,
team card, kitchen prep). HouseholdBookings doesn't need it because it only shows the booking form, not kitchen stats.

The repeated anti-pattern is:
1. Page creates useAsyncData wrapping a store's imperative $fetch method
2. Page derives isLoading/isError computeds from the status
3. Page has to deal with SSR hydration issues (chef's onMounted workaround)
