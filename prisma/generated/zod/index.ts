import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['Serializable']);

export const AllergyTypeScalarFieldEnumSchema = z.enum(['id','name','description','icon']);

export const DinnerEventAllergenScalarFieldEnumSchema = z.enum(['id','dinnerEventId','allergyTypeId']);

export const AllergyScalarFieldEnumSchema = z.enum(['id','inhabitantId','inhabitantComment','allergyTypeId','createdAt','updatedAt']);

export const UserScalarFieldEnumSchema = z.enum(['id','email','phone','passwordHash','systemRoles','createdAt','updatedAt']);

export const InhabitantScalarFieldEnumSchema = z.enum(['id','heynaboId','userId','householdId','pictureUrl','name','lastName','birthDate','dinnerPreferences']);

export const HouseholdScalarFieldEnumSchema = z.enum(['id','heynaboId','pbsId','movedInDate','moveOutDate','name','address']);

export const DinnerEventScalarFieldEnumSchema = z.enum(['id','date','menuTitle','menuDescription','menuPictureUrl','state','totalCost','heynaboEventId','chefId','cookingTeamId','createdAt','updatedAt','seasonId']);

export const OrderScalarFieldEnumSchema = z.enum(['id','dinnerEventId','inhabitantId','bookedByUserId','ticketPriceId','priceAtBooking','dinnerMode','state','isGuestTicket','releasedAt','closedAt','createdAt','updatedAt']);

export const TransactionScalarFieldEnumSchema = z.enum(['id','orderId','orderSnapshot','userSnapshot','amount','userEmailHandle','createdAt','invoiceId']);

export const InvoiceScalarFieldEnumSchema = z.enum(['id','cutoffDate','paymentDate','billingPeriod','amount','createdAt','householdId','billingPeriodSummaryId','pbsId','address']);

export const BillingPeriodSummaryScalarFieldEnumSchema = z.enum(['id','billingPeriod','shareToken','totalAmount','householdCount','ticketCount','cutoffDate','paymentDate','createdAt']);

export const CookingTeamScalarFieldEnumSchema = z.enum(['id','seasonId','name','affinity']);

export const CookingTeamAssignmentScalarFieldEnumSchema = z.enum(['id','cookingTeamId','inhabitantId','role','allocationPercentage','affinity','createdAt','updatedAt']);

export const SeasonScalarFieldEnumSchema = z.enum(['id','shortName','seasonDates','isActive','cookingDays','holidays','ticketIsCancellableDaysBefore','diningModeIsEditableMinutesBefore','consecutiveCookingDays']);

export const TicketPriceScalarFieldEnumSchema = z.enum(['id','seasonId','ticketType','price','description','maximumAgeLimit']);

export const OrderHistoryScalarFieldEnumSchema = z.enum(['id','orderId','action','performedByUserId','auditData','timestamp','inhabitantId','dinnerEventId','seasonId']);

export const JobRunScalarFieldEnumSchema = z.enum(['id','jobType','status','startedAt','completedAt','durationMs','resultSummary','errorMessage','triggeredBy']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullsOrderSchema = z.enum(['first','last']);

export const SystemRoleSchema = z.enum(['ADMIN','ALLERGYMANAGER']);

export type SystemRoleType = `${z.infer<typeof SystemRoleSchema>}`

export const RoleSchema = z.enum(['CHEF','COOK','JUNIORHELPER']);

export type RoleType = `${z.infer<typeof RoleSchema>}`

export const TicketTypeSchema = z.enum(['ADULT','CHILD','BABY']);

export type TicketTypeType = `${z.infer<typeof TicketTypeSchema>}`

export const DinnerModeSchema = z.enum(['TAKEAWAY','DINEIN','DINEINLATE','NONE']);

export type DinnerModeType = `${z.infer<typeof DinnerModeSchema>}`

export const DinnerStateSchema = z.enum(['SCHEDULED','ANNOUNCED','CANCELLED','CONSUMED']);

export type DinnerStateType = `${z.infer<typeof DinnerStateSchema>}`

export const OrderStateSchema = z.enum(['BOOKED','RELEASED','CANCELLED','CLOSED']);

export type OrderStateType = `${z.infer<typeof OrderStateSchema>}`

export const OrderAuditActionSchema = z.enum(['USER_BOOKED','USER_CANCELLED','USER_CLAIMED','SYSTEM_CREATED','SYSTEM_DELETED','SYSTEM_UPDATED']);

export type OrderAuditActionType = `${z.infer<typeof OrderAuditActionSchema>}`

export const JobTypeSchema = z.enum(['DAILY_MAINTENANCE','MONTHLY_BILLING','HEYNABO_IMPORT','MAINTENANCE_IMPORT','MAINTENANCE_EXPORT']);

export type JobTypeType = `${z.infer<typeof JobTypeSchema>}`

export const JobStatusSchema = z.enum(['RUNNING','SUCCESS','PARTIAL','FAILED']);

export type JobStatusType = `${z.infer<typeof JobStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// ALLERGY TYPE SCHEMA
/////////////////////////////////////////

export const AllergyTypeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  icon: z.string().nullable(),
})

export type AllergyType = z.infer<typeof AllergyTypeSchema>

/////////////////////////////////////////
// DINNER EVENT ALLERGEN SCHEMA
/////////////////////////////////////////

export const DinnerEventAllergenSchema = z.object({
  id: z.number().int(),
  dinnerEventId: z.number().int(),
  allergyTypeId: z.number().int(),
})

export type DinnerEventAllergen = z.infer<typeof DinnerEventAllergenSchema>

/////////////////////////////////////////
// ALLERGY SCHEMA
/////////////////////////////////////////

export const AllergySchema = z.object({
  id: z.number().int(),
  inhabitantId: z.number().int(),
  inhabitantComment: z.string().nullable(),
  allergyTypeId: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Allergy = z.infer<typeof AllergySchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  phone: z.string().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// INHABITANT SCHEMA
/////////////////////////////////////////

export const InhabitantSchema = z.object({
  id: z.number().int(),
  heynaboId: z.number().int(),
  userId: z.number().int().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().nullable(),
  dinnerPreferences: z.string().nullable(),
})

export type Inhabitant = z.infer<typeof InhabitantSchema>

/////////////////////////////////////////
// HOUSEHOLD SCHEMA
/////////////////////////////////////////

export const HouseholdSchema = z.object({
  id: z.number().int(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().nullable(),
  name: z.string(),
  address: z.string(),
})

export type Household = z.infer<typeof HouseholdSchema>

/////////////////////////////////////////
// DINNER EVENT SCHEMA
/////////////////////////////////////////

export const DinnerEventSchema = z.object({
  state: DinnerStateSchema,
  id: z.number().int(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().nullable(),
  menuPictureUrl: z.string().nullable(),
  totalCost: z.number().int(),
  heynaboEventId: z.number().int().nullable(),
  chefId: z.number().int().nullable(),
  cookingTeamId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  seasonId: z.number().int().nullable(),
})

export type DinnerEvent = z.infer<typeof DinnerEventSchema>

/////////////////////////////////////////
// ORDER SCHEMA
/////////////////////////////////////////

export const OrderSchema = z.object({
  dinnerMode: DinnerModeSchema,
  state: OrderStateSchema,
  id: z.number().int(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().nullable(),
  ticketPriceId: z.number().int().nullable(),
  priceAtBooking: z.number().int(),
  isGuestTicket: z.boolean(),
  releasedAt: z.coerce.date().nullable(),
  closedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Order = z.infer<typeof OrderSchema>

/////////////////////////////////////////
// TRANSACTION SCHEMA
/////////////////////////////////////////

export const TransactionSchema = z.object({
  id: z.number().int(),
  orderId: z.number().int().nullable(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date(),
  invoiceId: z.number().int().nullable(),
})

export type Transaction = z.infer<typeof TransactionSchema>

/////////////////////////////////////////
// INVOICE SCHEMA
/////////////////////////////////////////

export const InvoiceSchema = z.object({
  id: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date(),
  householdId: z.number().int().nullable(),
  billingPeriodSummaryId: z.number().int().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
})

export type Invoice = z.infer<typeof InvoiceSchema>

/////////////////////////////////////////
// BILLING PERIOD SUMMARY SCHEMA
/////////////////////////////////////////

export const BillingPeriodSummarySchema = z.object({
  id: z.number().int(),
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date(),
})

export type BillingPeriodSummary = z.infer<typeof BillingPeriodSummarySchema>

/////////////////////////////////////////
// COOKING TEAM SCHEMA
/////////////////////////////////////////

export const CookingTeamSchema = z.object({
  id: z.number().int(),
  seasonId: z.number().int(),
  name: z.string(),
  affinity: z.string().nullable(),
})

export type CookingTeam = z.infer<typeof CookingTeamSchema>

/////////////////////////////////////////
// COOKING TEAM ASSIGNMENT SCHEMA
/////////////////////////////////////////

export const CookingTeamAssignmentSchema = z.object({
  role: RoleSchema,
  id: z.number().int(),
  cookingTeamId: z.number().int(),
  inhabitantId: z.number().int(),
  allocationPercentage: z.number().int(),
  affinity: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>

/////////////////////////////////////////
// SEASON SCHEMA
/////////////////////////////////////////

export const SeasonSchema = z.object({
  id: z.number().int(),
  shortName: z.string().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int(),
})

export type Season = z.infer<typeof SeasonSchema>

/////////////////////////////////////////
// TICKET PRICE SCHEMA
/////////////////////////////////////////

export const TicketPriceSchema = z.object({
  ticketType: TicketTypeSchema,
  id: z.number().int(),
  seasonId: z.number().int(),
  price: z.number().int(),
  description: z.string().nullable(),
  maximumAgeLimit: z.number().int().nullable(),
})

export type TicketPrice = z.infer<typeof TicketPriceSchema>

/////////////////////////////////////////
// ORDER HISTORY SCHEMA
/////////////////////////////////////////

export const OrderHistorySchema = z.object({
  action: OrderAuditActionSchema,
  id: z.number().int(),
  orderId: z.number().int().nullable(),
  performedByUserId: z.number().int().nullable(),
  auditData: z.string(),
  timestamp: z.coerce.date(),
  inhabitantId: z.number().int().nullable(),
  dinnerEventId: z.number().int().nullable(),
  seasonId: z.number().int().nullable(),
})

export type OrderHistory = z.infer<typeof OrderHistorySchema>

/////////////////////////////////////////
// JOB RUN SCHEMA
/////////////////////////////////////////

export const JobRunSchema = z.object({
  jobType: JobTypeSchema,
  status: JobStatusSchema,
  id: z.number().int(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  durationMs: z.number().int().nullable(),
  resultSummary: z.string().nullable(),
  errorMessage: z.string().nullable(),
  triggeredBy: z.string(),
})

export type JobRun = z.infer<typeof JobRunSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// ALLERGY TYPE
//------------------------------------------------------

export const AllergyTypeIncludeSchema: z.ZodType<Prisma.AllergyTypeInclude> = z.object({
  Allergy: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  DinnerEventAllergens: z.union([z.boolean(),z.lazy(() => DinnerEventAllergenFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => AllergyTypeCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const AllergyTypeArgsSchema: z.ZodType<Prisma.AllergyTypeDefaultArgs> = z.object({
  select: z.lazy(() => AllergyTypeSelectSchema).optional(),
  include: z.lazy(() => AllergyTypeIncludeSchema).optional(),
}).strict();

export const AllergyTypeCountOutputTypeArgsSchema: z.ZodType<Prisma.AllergyTypeCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => AllergyTypeCountOutputTypeSelectSchema).nullish(),
}).strict();

export const AllergyTypeCountOutputTypeSelectSchema: z.ZodType<Prisma.AllergyTypeCountOutputTypeSelect> = z.object({
  Allergy: z.boolean().optional(),
  DinnerEventAllergens: z.boolean().optional(),
}).strict();

export const AllergyTypeSelectSchema: z.ZodType<Prisma.AllergyTypeSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  icon: z.boolean().optional(),
  Allergy: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  DinnerEventAllergens: z.union([z.boolean(),z.lazy(() => DinnerEventAllergenFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => AllergyTypeCountOutputTypeArgsSchema)]).optional(),
}).strict()

// DINNER EVENT ALLERGEN
//------------------------------------------------------

export const DinnerEventAllergenIncludeSchema: z.ZodType<Prisma.DinnerEventAllergenInclude> = z.object({
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict();

export const DinnerEventAllergenArgsSchema: z.ZodType<Prisma.DinnerEventAllergenDefaultArgs> = z.object({
  select: z.lazy(() => DinnerEventAllergenSelectSchema).optional(),
  include: z.lazy(() => DinnerEventAllergenIncludeSchema).optional(),
}).strict();

export const DinnerEventAllergenSelectSchema: z.ZodType<Prisma.DinnerEventAllergenSelect> = z.object({
  id: z.boolean().optional(),
  dinnerEventId: z.boolean().optional(),
  allergyTypeId: z.boolean().optional(),
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict()

// ALLERGY
//------------------------------------------------------

export const AllergyIncludeSchema: z.ZodType<Prisma.AllergyInclude> = z.object({
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict();

export const AllergyArgsSchema: z.ZodType<Prisma.AllergyDefaultArgs> = z.object({
  select: z.lazy(() => AllergySelectSchema).optional(),
  include: z.lazy(() => AllergyIncludeSchema).optional(),
}).strict();

export const AllergySelectSchema: z.ZodType<Prisma.AllergySelect> = z.object({
  id: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  inhabitantComment: z.boolean().optional(),
  allergyTypeId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  Inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  bookedOrders: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  orderHistory: z.union([z.boolean(),z.lazy(() => OrderHistoryFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z.object({
  select: z.lazy(() => UserSelectSchema).optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
}).strict();

export const UserCountOutputTypeArgsSchema: z.ZodType<Prisma.UserCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserCountOutputTypeSelectSchema).nullish(),
}).strict();

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z.object({
  bookedOrders: z.boolean().optional(),
  orderHistory: z.boolean().optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  phone: z.boolean().optional(),
  passwordHash: z.boolean().optional(),
  systemRoles: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  Inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  bookedOrders: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  orderHistory: z.union([z.boolean(),z.lazy(() => OrderHistoryFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

// INHABITANT
//------------------------------------------------------

export const InhabitantIncludeSchema: z.ZodType<Prisma.InhabitantInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  household: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  allergies: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  DinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  Order: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  CookingTeamAssignment: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InhabitantCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const InhabitantArgsSchema: z.ZodType<Prisma.InhabitantDefaultArgs> = z.object({
  select: z.lazy(() => InhabitantSelectSchema).optional(),
  include: z.lazy(() => InhabitantIncludeSchema).optional(),
}).strict();

export const InhabitantCountOutputTypeArgsSchema: z.ZodType<Prisma.InhabitantCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => InhabitantCountOutputTypeSelectSchema).nullish(),
}).strict();

export const InhabitantCountOutputTypeSelectSchema: z.ZodType<Prisma.InhabitantCountOutputTypeSelect> = z.object({
  allergies: z.boolean().optional(),
  DinnerEvent: z.boolean().optional(),
  Order: z.boolean().optional(),
  CookingTeamAssignment: z.boolean().optional(),
}).strict();

export const InhabitantSelectSchema: z.ZodType<Prisma.InhabitantSelect> = z.object({
  id: z.boolean().optional(),
  heynaboId: z.boolean().optional(),
  userId: z.boolean().optional(),
  householdId: z.boolean().optional(),
  pictureUrl: z.boolean().optional(),
  name: z.boolean().optional(),
  lastName: z.boolean().optional(),
  birthDate: z.boolean().optional(),
  dinnerPreferences: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  household: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  allergies: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  DinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  Order: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  CookingTeamAssignment: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InhabitantCountOutputTypeArgsSchema)]).optional(),
}).strict()

// HOUSEHOLD
//------------------------------------------------------

export const HouseholdIncludeSchema: z.ZodType<Prisma.HouseholdInclude> = z.object({
  inhabitants: z.union([z.boolean(),z.lazy(() => InhabitantFindManyArgsSchema)]).optional(),
  Invoice: z.union([z.boolean(),z.lazy(() => InvoiceFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => HouseholdCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const HouseholdArgsSchema: z.ZodType<Prisma.HouseholdDefaultArgs> = z.object({
  select: z.lazy(() => HouseholdSelectSchema).optional(),
  include: z.lazy(() => HouseholdIncludeSchema).optional(),
}).strict();

export const HouseholdCountOutputTypeArgsSchema: z.ZodType<Prisma.HouseholdCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => HouseholdCountOutputTypeSelectSchema).nullish(),
}).strict();

export const HouseholdCountOutputTypeSelectSchema: z.ZodType<Prisma.HouseholdCountOutputTypeSelect> = z.object({
  inhabitants: z.boolean().optional(),
  Invoice: z.boolean().optional(),
}).strict();

export const HouseholdSelectSchema: z.ZodType<Prisma.HouseholdSelect> = z.object({
  id: z.boolean().optional(),
  heynaboId: z.boolean().optional(),
  pbsId: z.boolean().optional(),
  movedInDate: z.boolean().optional(),
  moveOutDate: z.boolean().optional(),
  name: z.boolean().optional(),
  address: z.boolean().optional(),
  inhabitants: z.union([z.boolean(),z.lazy(() => InhabitantFindManyArgsSchema)]).optional(),
  Invoice: z.union([z.boolean(),z.lazy(() => InvoiceFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => HouseholdCountOutputTypeArgsSchema)]).optional(),
}).strict()

// DINNER EVENT
//------------------------------------------------------

export const DinnerEventIncludeSchema: z.ZodType<Prisma.DinnerEventInclude> = z.object({
  chef: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  cookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  tickets: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  Season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  allergens: z.union([z.boolean(),z.lazy(() => DinnerEventAllergenFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => DinnerEventCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const DinnerEventArgsSchema: z.ZodType<Prisma.DinnerEventDefaultArgs> = z.object({
  select: z.lazy(() => DinnerEventSelectSchema).optional(),
  include: z.lazy(() => DinnerEventIncludeSchema).optional(),
}).strict();

export const DinnerEventCountOutputTypeArgsSchema: z.ZodType<Prisma.DinnerEventCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => DinnerEventCountOutputTypeSelectSchema).nullish(),
}).strict();

export const DinnerEventCountOutputTypeSelectSchema: z.ZodType<Prisma.DinnerEventCountOutputTypeSelect> = z.object({
  tickets: z.boolean().optional(),
  allergens: z.boolean().optional(),
}).strict();

export const DinnerEventSelectSchema: z.ZodType<Prisma.DinnerEventSelect> = z.object({
  id: z.boolean().optional(),
  date: z.boolean().optional(),
  menuTitle: z.boolean().optional(),
  menuDescription: z.boolean().optional(),
  menuPictureUrl: z.boolean().optional(),
  state: z.boolean().optional(),
  totalCost: z.boolean().optional(),
  heynaboEventId: z.boolean().optional(),
  chefId: z.boolean().optional(),
  cookingTeamId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  chef: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  cookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  tickets: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  Season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  allergens: z.union([z.boolean(),z.lazy(() => DinnerEventAllergenFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => DinnerEventCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ORDER
//------------------------------------------------------

export const OrderIncludeSchema: z.ZodType<Prisma.OrderInclude> = z.object({
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  bookedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  ticketPrice: z.union([z.boolean(),z.lazy(() => TicketPriceArgsSchema)]).optional(),
  Transaction: z.union([z.boolean(),z.lazy(() => TransactionArgsSchema)]).optional(),
  orderHistory: z.union([z.boolean(),z.lazy(() => OrderHistoryFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrderCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const OrderArgsSchema: z.ZodType<Prisma.OrderDefaultArgs> = z.object({
  select: z.lazy(() => OrderSelectSchema).optional(),
  include: z.lazy(() => OrderIncludeSchema).optional(),
}).strict();

export const OrderCountOutputTypeArgsSchema: z.ZodType<Prisma.OrderCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => OrderCountOutputTypeSelectSchema).nullish(),
}).strict();

export const OrderCountOutputTypeSelectSchema: z.ZodType<Prisma.OrderCountOutputTypeSelect> = z.object({
  orderHistory: z.boolean().optional(),
}).strict();

export const OrderSelectSchema: z.ZodType<Prisma.OrderSelect> = z.object({
  id: z.boolean().optional(),
  dinnerEventId: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  bookedByUserId: z.boolean().optional(),
  ticketPriceId: z.boolean().optional(),
  priceAtBooking: z.boolean().optional(),
  dinnerMode: z.boolean().optional(),
  state: z.boolean().optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.boolean().optional(),
  closedAt: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  bookedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  ticketPrice: z.union([z.boolean(),z.lazy(() => TicketPriceArgsSchema)]).optional(),
  Transaction: z.union([z.boolean(),z.lazy(() => TransactionArgsSchema)]).optional(),
  orderHistory: z.union([z.boolean(),z.lazy(() => OrderHistoryFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrderCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TRANSACTION
//------------------------------------------------------

export const TransactionIncludeSchema: z.ZodType<Prisma.TransactionInclude> = z.object({
  order: z.union([z.boolean(),z.lazy(() => OrderArgsSchema)]).optional(),
  invoice: z.union([z.boolean(),z.lazy(() => InvoiceArgsSchema)]).optional(),
}).strict();

export const TransactionArgsSchema: z.ZodType<Prisma.TransactionDefaultArgs> = z.object({
  select: z.lazy(() => TransactionSelectSchema).optional(),
  include: z.lazy(() => TransactionIncludeSchema).optional(),
}).strict();

export const TransactionSelectSchema: z.ZodType<Prisma.TransactionSelect> = z.object({
  id: z.boolean().optional(),
  orderId: z.boolean().optional(),
  orderSnapshot: z.boolean().optional(),
  userSnapshot: z.boolean().optional(),
  amount: z.boolean().optional(),
  userEmailHandle: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  invoiceId: z.boolean().optional(),
  order: z.union([z.boolean(),z.lazy(() => OrderArgsSchema)]).optional(),
  invoice: z.union([z.boolean(),z.lazy(() => InvoiceArgsSchema)]).optional(),
}).strict()

// INVOICE
//------------------------------------------------------

export const InvoiceIncludeSchema: z.ZodType<Prisma.InvoiceInclude> = z.object({
  transactions: z.union([z.boolean(),z.lazy(() => TransactionFindManyArgsSchema)]).optional(),
  houseHold: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  billingPeriodSummary: z.union([z.boolean(),z.lazy(() => BillingPeriodSummaryArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InvoiceCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const InvoiceArgsSchema: z.ZodType<Prisma.InvoiceDefaultArgs> = z.object({
  select: z.lazy(() => InvoiceSelectSchema).optional(),
  include: z.lazy(() => InvoiceIncludeSchema).optional(),
}).strict();

export const InvoiceCountOutputTypeArgsSchema: z.ZodType<Prisma.InvoiceCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => InvoiceCountOutputTypeSelectSchema).nullish(),
}).strict();

export const InvoiceCountOutputTypeSelectSchema: z.ZodType<Prisma.InvoiceCountOutputTypeSelect> = z.object({
  transactions: z.boolean().optional(),
}).strict();

export const InvoiceSelectSchema: z.ZodType<Prisma.InvoiceSelect> = z.object({
  id: z.boolean().optional(),
  cutoffDate: z.boolean().optional(),
  paymentDate: z.boolean().optional(),
  billingPeriod: z.boolean().optional(),
  amount: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  householdId: z.boolean().optional(),
  billingPeriodSummaryId: z.boolean().optional(),
  pbsId: z.boolean().optional(),
  address: z.boolean().optional(),
  transactions: z.union([z.boolean(),z.lazy(() => TransactionFindManyArgsSchema)]).optional(),
  houseHold: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  billingPeriodSummary: z.union([z.boolean(),z.lazy(() => BillingPeriodSummaryArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InvoiceCountOutputTypeArgsSchema)]).optional(),
}).strict()

// BILLING PERIOD SUMMARY
//------------------------------------------------------

export const BillingPeriodSummaryIncludeSchema: z.ZodType<Prisma.BillingPeriodSummaryInclude> = z.object({
  invoices: z.union([z.boolean(),z.lazy(() => InvoiceFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => BillingPeriodSummaryCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const BillingPeriodSummaryArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryDefaultArgs> = z.object({
  select: z.lazy(() => BillingPeriodSummarySelectSchema).optional(),
  include: z.lazy(() => BillingPeriodSummaryIncludeSchema).optional(),
}).strict();

export const BillingPeriodSummaryCountOutputTypeArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => BillingPeriodSummaryCountOutputTypeSelectSchema).nullish(),
}).strict();

export const BillingPeriodSummaryCountOutputTypeSelectSchema: z.ZodType<Prisma.BillingPeriodSummaryCountOutputTypeSelect> = z.object({
  invoices: z.boolean().optional(),
}).strict();

export const BillingPeriodSummarySelectSchema: z.ZodType<Prisma.BillingPeriodSummarySelect> = z.object({
  id: z.boolean().optional(),
  billingPeriod: z.boolean().optional(),
  shareToken: z.boolean().optional(),
  totalAmount: z.boolean().optional(),
  householdCount: z.boolean().optional(),
  ticketCount: z.boolean().optional(),
  cutoffDate: z.boolean().optional(),
  paymentDate: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  invoices: z.union([z.boolean(),z.lazy(() => InvoiceFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => BillingPeriodSummaryCountOutputTypeArgsSchema)]).optional(),
}).strict()

// COOKING TEAM
//------------------------------------------------------

export const CookingTeamIncludeSchema: z.ZodType<Prisma.CookingTeamInclude> = z.object({
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  dinners: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  assignments: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CookingTeamCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const CookingTeamArgsSchema: z.ZodType<Prisma.CookingTeamDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamSelectSchema).optional(),
  include: z.lazy(() => CookingTeamIncludeSchema).optional(),
}).strict();

export const CookingTeamCountOutputTypeArgsSchema: z.ZodType<Prisma.CookingTeamCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamCountOutputTypeSelectSchema).nullish(),
}).strict();

export const CookingTeamCountOutputTypeSelectSchema: z.ZodType<Prisma.CookingTeamCountOutputTypeSelect> = z.object({
  dinners: z.boolean().optional(),
  assignments: z.boolean().optional(),
}).strict();

export const CookingTeamSelectSchema: z.ZodType<Prisma.CookingTeamSelect> = z.object({
  id: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  name: z.boolean().optional(),
  affinity: z.boolean().optional(),
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  dinners: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  assignments: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CookingTeamCountOutputTypeArgsSchema)]).optional(),
}).strict()

// COOKING TEAM ASSIGNMENT
//------------------------------------------------------

export const CookingTeamAssignmentIncludeSchema: z.ZodType<Prisma.CookingTeamAssignmentInclude> = z.object({
  cookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict();

export const CookingTeamAssignmentArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamAssignmentSelectSchema).optional(),
  include: z.lazy(() => CookingTeamAssignmentIncludeSchema).optional(),
}).strict();

export const CookingTeamAssignmentSelectSchema: z.ZodType<Prisma.CookingTeamAssignmentSelect> = z.object({
  id: z.boolean().optional(),
  cookingTeamId: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  role: z.boolean().optional(),
  allocationPercentage: z.boolean().optional(),
  affinity: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  cookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

// SEASON
//------------------------------------------------------

export const SeasonIncludeSchema: z.ZodType<Prisma.SeasonInclude> = z.object({
  CookingTeams: z.union([z.boolean(),z.lazy(() => CookingTeamFindManyArgsSchema)]).optional(),
  ticketPrices: z.union([z.boolean(),z.lazy(() => TicketPriceFindManyArgsSchema)]).optional(),
  dinnerEvents: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => SeasonCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const SeasonArgsSchema: z.ZodType<Prisma.SeasonDefaultArgs> = z.object({
  select: z.lazy(() => SeasonSelectSchema).optional(),
  include: z.lazy(() => SeasonIncludeSchema).optional(),
}).strict();

export const SeasonCountOutputTypeArgsSchema: z.ZodType<Prisma.SeasonCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => SeasonCountOutputTypeSelectSchema).nullish(),
}).strict();

export const SeasonCountOutputTypeSelectSchema: z.ZodType<Prisma.SeasonCountOutputTypeSelect> = z.object({
  CookingTeams: z.boolean().optional(),
  ticketPrices: z.boolean().optional(),
  dinnerEvents: z.boolean().optional(),
}).strict();

export const SeasonSelectSchema: z.ZodType<Prisma.SeasonSelect> = z.object({
  id: z.boolean().optional(),
  shortName: z.boolean().optional(),
  seasonDates: z.boolean().optional(),
  isActive: z.boolean().optional(),
  cookingDays: z.boolean().optional(),
  holidays: z.boolean().optional(),
  ticketIsCancellableDaysBefore: z.boolean().optional(),
  diningModeIsEditableMinutesBefore: z.boolean().optional(),
  consecutiveCookingDays: z.boolean().optional(),
  CookingTeams: z.union([z.boolean(),z.lazy(() => CookingTeamFindManyArgsSchema)]).optional(),
  ticketPrices: z.union([z.boolean(),z.lazy(() => TicketPriceFindManyArgsSchema)]).optional(),
  dinnerEvents: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => SeasonCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TICKET PRICE
//------------------------------------------------------

export const TicketPriceIncludeSchema: z.ZodType<Prisma.TicketPriceInclude> = z.object({
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  orders: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => TicketPriceCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const TicketPriceArgsSchema: z.ZodType<Prisma.TicketPriceDefaultArgs> = z.object({
  select: z.lazy(() => TicketPriceSelectSchema).optional(),
  include: z.lazy(() => TicketPriceIncludeSchema).optional(),
}).strict();

export const TicketPriceCountOutputTypeArgsSchema: z.ZodType<Prisma.TicketPriceCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => TicketPriceCountOutputTypeSelectSchema).nullish(),
}).strict();

export const TicketPriceCountOutputTypeSelectSchema: z.ZodType<Prisma.TicketPriceCountOutputTypeSelect> = z.object({
  orders: z.boolean().optional(),
}).strict();

export const TicketPriceSelectSchema: z.ZodType<Prisma.TicketPriceSelect> = z.object({
  id: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  ticketType: z.boolean().optional(),
  price: z.boolean().optional(),
  description: z.boolean().optional(),
  maximumAgeLimit: z.boolean().optional(),
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  orders: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => TicketPriceCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ORDER HISTORY
//------------------------------------------------------

export const OrderHistoryIncludeSchema: z.ZodType<Prisma.OrderHistoryInclude> = z.object({
  order: z.union([z.boolean(),z.lazy(() => OrderArgsSchema)]).optional(),
  performedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const OrderHistoryArgsSchema: z.ZodType<Prisma.OrderHistoryDefaultArgs> = z.object({
  select: z.lazy(() => OrderHistorySelectSchema).optional(),
  include: z.lazy(() => OrderHistoryIncludeSchema).optional(),
}).strict();

export const OrderHistorySelectSchema: z.ZodType<Prisma.OrderHistorySelect> = z.object({
  id: z.boolean().optional(),
  orderId: z.boolean().optional(),
  action: z.boolean().optional(),
  performedByUserId: z.boolean().optional(),
  auditData: z.boolean().optional(),
  timestamp: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  dinnerEventId: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  order: z.union([z.boolean(),z.lazy(() => OrderArgsSchema)]).optional(),
  performedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// JOB RUN
//------------------------------------------------------

export const JobRunSelectSchema: z.ZodType<Prisma.JobRunSelect> = z.object({
  id: z.boolean().optional(),
  jobType: z.boolean().optional(),
  status: z.boolean().optional(),
  startedAt: z.boolean().optional(),
  completedAt: z.boolean().optional(),
  durationMs: z.boolean().optional(),
  resultSummary: z.boolean().optional(),
  errorMessage: z.boolean().optional(),
  triggeredBy: z.boolean().optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const AllergyTypeWhereInputSchema: z.ZodType<Prisma.AllergyTypeWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyTypeWhereInputSchema), z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeWhereInputSchema), z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenListRelationFilterSchema).optional(),
}).strict();

export const AllergyTypeOrderByWithRelationInputSchema: z.ZodType<Prisma.AllergyTypeOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  Allergy: z.lazy(() => AllergyOrderByRelationAggregateInputSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const AllergyTypeWhereUniqueInputSchema: z.ZodType<Prisma.AllergyTypeWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => AllergyTypeWhereInputSchema), z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeWhereInputSchema), z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenListRelationFilterSchema).optional(),
}).strict());

export const AllergyTypeOrderByWithAggregationInputSchema: z.ZodType<Prisma.AllergyTypeOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => AllergyTypeCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => AllergyTypeAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AllergyTypeMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AllergyTypeMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => AllergyTypeSumOrderByAggregateInputSchema).optional(),
}).strict();

export const AllergyTypeScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AllergyTypeScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema), z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema), z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
}).strict();

export const DinnerEventAllergenWhereInputSchema: z.ZodType<Prisma.DinnerEventAllergenWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventAllergenWhereInputSchema), z.lazy(() => DinnerEventAllergenWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventAllergenWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventAllergenWhereInputSchema), z.lazy(() => DinnerEventAllergenWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema), z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema), z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenOrderByWithRelationInputSchema: z.ZodType<Prisma.DinnerEventAllergenOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEvent: z.lazy(() => DinnerEventOrderByWithRelationInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeOrderByWithRelationInputSchema).optional(),
}).strict();

export const DinnerEventAllergenWhereUniqueInputSchema: z.ZodType<Prisma.DinnerEventAllergenWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    dinnerEventId_allergyTypeId: z.lazy(() => DinnerEventAllergenDinnerEventIdAllergyTypeIdCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    dinnerEventId_allergyTypeId: z.lazy(() => DinnerEventAllergenDinnerEventIdAllergyTypeIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  dinnerEventId_allergyTypeId: z.lazy(() => DinnerEventAllergenDinnerEventIdAllergyTypeIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => DinnerEventAllergenWhereInputSchema), z.lazy(() => DinnerEventAllergenWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventAllergenWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventAllergenWhereInputSchema), z.lazy(() => DinnerEventAllergenWhereInputSchema).array() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema), z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema), z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict());

export const DinnerEventAllergenOrderByWithAggregationInputSchema: z.ZodType<Prisma.DinnerEventAllergenOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => DinnerEventAllergenCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DinnerEventAllergenAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DinnerEventAllergenMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DinnerEventAllergenMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DinnerEventAllergenSumOrderByAggregateInputSchema).optional(),
}).strict();

export const DinnerEventAllergenScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DinnerEventAllergenScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereWithAggregatesInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventAllergenScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereWithAggregatesInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
}).strict();

export const AllergyWhereInputSchema: z.ZodType<Prisma.AllergyWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyWhereInputSchema), z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyWhereInputSchema), z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantComment: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema), z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict();

export const AllergyOrderByWithRelationInputSchema: z.ZodType<Prisma.AllergyOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantComment: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeOrderByWithRelationInputSchema).optional(),
}).strict();

export const AllergyWhereUniqueInputSchema: z.ZodType<Prisma.AllergyWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    inhabitantId_allergyTypeId: z.lazy(() => AllergyInhabitantIdAllergyTypeIdCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    inhabitantId_allergyTypeId: z.lazy(() => AllergyInhabitantIdAllergyTypeIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  inhabitantId_allergyTypeId: z.lazy(() => AllergyInhabitantIdAllergyTypeIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => AllergyWhereInputSchema), z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyWhereInputSchema), z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  inhabitantComment: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema), z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict());

export const AllergyOrderByWithAggregationInputSchema: z.ZodType<Prisma.AllergyOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantComment: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AllergyCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => AllergyAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AllergyMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AllergyMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => AllergySumOrderByAggregateInputSchema).optional(),
}).strict();

export const AllergyScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AllergyScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema), z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema), z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  inhabitantComment: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  allergyTypeId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  systemRoles: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  Inhabitant: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  bookedOrders: z.lazy(() => OrderListRelationFilterSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryListRelationFilterSchema).optional(),
}).strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRoles: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  Inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    email: z.string(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    email: z.string(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  email: z.string().optional(),
  AND: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  systemRoles: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  Inhabitant: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  bookedOrders: z.lazy(() => OrderListRelationFilterSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryListRelationFilterSchema).optional(),
}).strict());

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRoles: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => UserAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => UserSumOrderByAggregateInputSchema).optional(),
}).strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  systemRoles: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const InhabitantWhereInputSchema: z.ZodType<Prisma.InhabitantWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantWhereInputSchema), z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantWhereInputSchema), z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  dinnerPreferences: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  household: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema), z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  allergies: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  Order: z.lazy(() => OrderListRelationFilterSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
}).strict();

export const InhabitantOrderByWithRelationInputSchema: z.ZodType<Prisma.InhabitantOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerPreferences: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  household: z.lazy(() => HouseholdOrderByWithRelationInputSchema).optional(),
  allergies: z.lazy(() => AllergyOrderByRelationAggregateInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional(),
  Order: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const InhabitantWhereUniqueInputSchema: z.ZodType<Prisma.InhabitantWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
    userId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
    userId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    heynaboId: z.number().int(),
    userId: z.number().int(),
  }),
  z.object({
    heynaboId: z.number().int(),
  }),
  z.object({
    userId: z.number().int(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int().optional(),
  userId: z.number().int().optional(),
  AND: z.union([ z.lazy(() => InhabitantWhereInputSchema), z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantWhereInputSchema), z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  householdId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  dinnerPreferences: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  household: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema), z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  allergies: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  Order: z.lazy(() => OrderListRelationFilterSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
}).strict());

export const InhabitantOrderByWithAggregationInputSchema: z.ZodType<Prisma.InhabitantOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerPreferences: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => InhabitantCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => InhabitantAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => InhabitantMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => InhabitantMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => InhabitantSumOrderByAggregateInputSchema).optional(),
}).strict();

export const InhabitantScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.InhabitantScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema), z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema), z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  dinnerPreferences: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
}).strict();

export const HouseholdWhereInputSchema: z.ZodType<Prisma.HouseholdWhereInput> = z.object({
  AND: z.union([ z.lazy(() => HouseholdWhereInputSchema), z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdWhereInputSchema), z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  pbsId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  inhabitants: z.lazy(() => InhabitantListRelationFilterSchema).optional(),
  Invoice: z.lazy(() => InvoiceListRelationFilterSchema).optional(),
}).strict();

export const HouseholdOrderByWithRelationInputSchema: z.ZodType<Prisma.HouseholdOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  inhabitants: z.lazy(() => InhabitantOrderByRelationAggregateInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const HouseholdWhereUniqueInputSchema: z.ZodType<Prisma.HouseholdWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
    pbsId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
    pbsId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    heynaboId: z.number().int(),
    pbsId: z.number().int(),
  }),
  z.object({
    heynaboId: z.number().int(),
  }),
  z.object({
    pbsId: z.number().int(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int().optional(),
  pbsId: z.number().int().optional(),
  AND: z.union([ z.lazy(() => HouseholdWhereInputSchema), z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdWhereInputSchema), z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  inhabitants: z.lazy(() => InhabitantListRelationFilterSchema).optional(),
  Invoice: z.lazy(() => InvoiceListRelationFilterSchema).optional(),
}).strict());

export const HouseholdOrderByWithAggregationInputSchema: z.ZodType<Prisma.HouseholdOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => HouseholdCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => HouseholdAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => HouseholdMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => HouseholdMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => HouseholdSumOrderByAggregateInputSchema).optional(),
}).strict();

export const HouseholdScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.HouseholdScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema), z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema), z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  pbsId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
}).strict();

export const DinnerEventWhereInputSchema: z.ZodType<Prisma.DinnerEventWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventWhereInputSchema), z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventWhereInputSchema), z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  state: z.union([ z.lazy(() => EnumDinnerStateFilterSchema), z.lazy(() => DinnerStateSchema) ]).optional(),
  totalCost: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  heynaboEventId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  chef: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema), z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderListRelationFilterSchema).optional(),
  Season: z.union([ z.lazy(() => SeasonNullableScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional().nullable(),
  allergens: z.lazy(() => DinnerEventAllergenListRelationFilterSchema).optional(),
}).strict();

export const DinnerEventOrderByWithRelationInputSchema: z.ZodType<Prisma.DinnerEventOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  menuPictureUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  tickets: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
  Season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const DinnerEventWhereUniqueInputSchema: z.ZodType<Prisma.DinnerEventWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    heynaboEventId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    heynaboEventId: z.number().int(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  heynaboEventId: z.number().int().optional(),
  AND: z.union([ z.lazy(() => DinnerEventWhereInputSchema), z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventWhereInputSchema), z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  state: z.union([ z.lazy(() => EnumDinnerStateFilterSchema), z.lazy(() => DinnerStateSchema) ]).optional(),
  totalCost: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  chef: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema), z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderListRelationFilterSchema).optional(),
  Season: z.union([ z.lazy(() => SeasonNullableScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional().nullable(),
  allergens: z.lazy(() => DinnerEventAllergenListRelationFilterSchema).optional(),
}).strict());

export const DinnerEventOrderByWithAggregationInputSchema: z.ZodType<Prisma.DinnerEventOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  menuPictureUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => DinnerEventCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DinnerEventAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DinnerEventMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DinnerEventMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DinnerEventSumOrderByAggregateInputSchema).optional(),
}).strict();

export const DinnerEventScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DinnerEventScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema), z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema), z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  state: z.union([ z.lazy(() => EnumDinnerStateWithAggregatesFilterSchema), z.lazy(() => DinnerStateSchema) ]).optional(),
  totalCost: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  heynaboEventId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  chefId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const OrderWhereInputSchema: z.ZodType<Prisma.OrderWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderWhereInputSchema), z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderWhereInputSchema), z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  bookedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  ticketPriceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  priceAtBooking: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema), z.lazy(() => DinnerModeSchema) ]).optional(),
  state: z.union([ z.lazy(() => EnumOrderStateFilterSchema), z.lazy(() => OrderStateSchema) ]).optional(),
  isGuestTicket: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  releasedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  closedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema), z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  bookedByUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  ticketPrice: z.union([ z.lazy(() => TicketPriceNullableScalarRelationFilterSchema), z.lazy(() => TicketPriceWhereInputSchema) ]).optional().nullable(),
  Transaction: z.union([ z.lazy(() => TransactionNullableScalarRelationFilterSchema), z.lazy(() => TransactionWhereInputSchema) ]).optional().nullable(),
  orderHistory: z.lazy(() => OrderHistoryListRelationFilterSchema).optional(),
}).strict();

export const OrderOrderByWithRelationInputSchema: z.ZodType<Prisma.OrderOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  ticketPriceId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  isGuestTicket: z.lazy(() => SortOrderSchema).optional(),
  releasedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  closedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  dinnerEvent: z.lazy(() => DinnerEventOrderByWithRelationInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  bookedByUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceOrderByWithRelationInputSchema).optional(),
  Transaction: z.lazy(() => TransactionOrderByWithRelationInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const OrderWhereUniqueInputSchema: z.ZodType<Prisma.OrderWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => OrderWhereInputSchema), z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderWhereInputSchema), z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  bookedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  ticketPriceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  priceAtBooking: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema), z.lazy(() => DinnerModeSchema) ]).optional(),
  state: z.union([ z.lazy(() => EnumOrderStateFilterSchema), z.lazy(() => OrderStateSchema) ]).optional(),
  isGuestTicket: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  releasedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  closedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema), z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  bookedByUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  ticketPrice: z.union([ z.lazy(() => TicketPriceNullableScalarRelationFilterSchema), z.lazy(() => TicketPriceWhereInputSchema) ]).optional().nullable(),
  Transaction: z.union([ z.lazy(() => TransactionNullableScalarRelationFilterSchema), z.lazy(() => TransactionWhereInputSchema) ]).optional().nullable(),
  orderHistory: z.lazy(() => OrderHistoryListRelationFilterSchema).optional(),
}).strict());

export const OrderOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrderOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  ticketPriceId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  isGuestTicket: z.lazy(() => SortOrderSchema).optional(),
  releasedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  closedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrderCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => OrderAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrderMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrderMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => OrderSumOrderByAggregateInputSchema).optional(),
}).strict();

export const OrderScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.OrderScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => OrderScalarWhereWithAggregatesInputSchema), z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderScalarWhereWithAggregatesInputSchema), z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  bookedByUserId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  ticketPriceId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  priceAtBooking: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeWithAggregatesFilterSchema), z.lazy(() => DinnerModeSchema) ]).optional(),
  state: z.union([ z.lazy(() => EnumOrderStateWithAggregatesFilterSchema), z.lazy(() => OrderStateSchema) ]).optional(),
  isGuestTicket: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  releasedAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  closedAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const TransactionWhereInputSchema: z.ZodType<Prisma.TransactionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionWhereInputSchema), z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionWhereInputSchema), z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  orderSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userEmailHandle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  order: z.union([ z.lazy(() => OrderNullableScalarRelationFilterSchema), z.lazy(() => OrderWhereInputSchema) ]).optional().nullable(),
  invoice: z.union([ z.lazy(() => InvoiceNullableScalarRelationFilterSchema), z.lazy(() => InvoiceWhereInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionOrderByWithRelationInputSchema: z.ZodType<Prisma.TransactionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  orderSnapshot: z.lazy(() => SortOrderSchema).optional(),
  userSnapshot: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  userEmailHandle: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  order: z.lazy(() => OrderOrderByWithRelationInputSchema).optional(),
  invoice: z.lazy(() => InvoiceOrderByWithRelationInputSchema).optional(),
}).strict();

export const TransactionWhereUniqueInputSchema: z.ZodType<Prisma.TransactionWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    orderId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    orderId: z.number().int(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional(),
  AND: z.union([ z.lazy(() => TransactionWhereInputSchema), z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionWhereInputSchema), z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  orderSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  userEmailHandle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  order: z.union([ z.lazy(() => OrderNullableScalarRelationFilterSchema), z.lazy(() => OrderWhereInputSchema) ]).optional().nullable(),
  invoice: z.union([ z.lazy(() => InvoiceNullableScalarRelationFilterSchema), z.lazy(() => InvoiceWhereInputSchema) ]).optional().nullable(),
}).strict());

export const TransactionOrderByWithAggregationInputSchema: z.ZodType<Prisma.TransactionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  orderSnapshot: z.lazy(() => SortOrderSchema).optional(),
  userSnapshot: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  userEmailHandle: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => TransactionCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => TransactionAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TransactionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TransactionMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => TransactionSumOrderByAggregateInputSchema).optional(),
}).strict();

export const TransactionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TransactionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema), z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema), z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  orderSnapshot: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userSnapshot: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  userEmailHandle: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const InvoiceWhereInputSchema: z.ZodType<Prisma.InvoiceWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceWhereInputSchema), z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceWhereInputSchema), z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  pbsId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  transactions: z.lazy(() => TransactionListRelationFilterSchema).optional(),
  houseHold: z.union([ z.lazy(() => HouseholdNullableScalarRelationFilterSchema), z.lazy(() => HouseholdWhereInputSchema) ]).optional().nullable(),
  billingPeriodSummary: z.union([ z.lazy(() => BillingPeriodSummaryNullableScalarRelationFilterSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema) ]).optional().nullable(),
}).strict();

export const InvoiceOrderByWithRelationInputSchema: z.ZodType<Prisma.InvoiceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  billingPeriodSummaryId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  transactions: z.lazy(() => TransactionOrderByRelationAggregateInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdOrderByWithRelationInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryOrderByWithRelationInputSchema).optional(),
}).strict();

export const InvoiceWhereUniqueInputSchema: z.ZodType<Prisma.InvoiceWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => InvoiceWhereInputSchema), z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceWhereInputSchema), z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  pbsId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  transactions: z.lazy(() => TransactionListRelationFilterSchema).optional(),
  houseHold: z.union([ z.lazy(() => HouseholdNullableScalarRelationFilterSchema), z.lazy(() => HouseholdWhereInputSchema) ]).optional().nullable(),
  billingPeriodSummary: z.union([ z.lazy(() => BillingPeriodSummaryNullableScalarRelationFilterSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema) ]).optional().nullable(),
}).strict());

export const InvoiceOrderByWithAggregationInputSchema: z.ZodType<Prisma.InvoiceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  billingPeriodSummaryId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => InvoiceCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => InvoiceAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => InvoiceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => InvoiceMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => InvoiceSumOrderByAggregateInputSchema).optional(),
}).strict();

export const InvoiceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.InvoiceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema), z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema), z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  pbsId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  address: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
}).strict();

export const BillingPeriodSummaryWhereInputSchema: z.ZodType<Prisma.BillingPeriodSummaryWhereInput> = z.object({
  AND: z.union([ z.lazy(() => BillingPeriodSummaryWhereInputSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => BillingPeriodSummaryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => BillingPeriodSummaryWhereInputSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  shareToken: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  totalAmount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  householdCount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  ticketCount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  invoices: z.lazy(() => InvoiceListRelationFilterSchema).optional(),
}).strict();

export const BillingPeriodSummaryOrderByWithRelationInputSchema: z.ZodType<Prisma.BillingPeriodSummaryOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  shareToken: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoices: z.lazy(() => InvoiceOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryWhereUniqueInputSchema: z.ZodType<Prisma.BillingPeriodSummaryWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    billingPeriod: z.string(),
    shareToken: z.string(),
  }),
  z.object({
    id: z.number().int(),
    billingPeriod: z.string(),
  }),
  z.object({
    id: z.number().int(),
    shareToken: z.string(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    billingPeriod: z.string(),
    shareToken: z.string(),
  }),
  z.object({
    billingPeriod: z.string(),
  }),
  z.object({
    shareToken: z.string(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  billingPeriod: z.string().optional(),
  shareToken: z.string().optional(),
  AND: z.union([ z.lazy(() => BillingPeriodSummaryWhereInputSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => BillingPeriodSummaryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => BillingPeriodSummaryWhereInputSchema), z.lazy(() => BillingPeriodSummaryWhereInputSchema).array() ]).optional(),
  totalAmount: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  householdCount: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  ticketCount: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  invoices: z.lazy(() => InvoiceListRelationFilterSchema).optional(),
}).strict());

export const BillingPeriodSummaryOrderByWithAggregationInputSchema: z.ZodType<Prisma.BillingPeriodSummaryOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  shareToken: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => BillingPeriodSummaryCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => BillingPeriodSummaryAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => BillingPeriodSummaryMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => BillingPeriodSummaryMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => BillingPeriodSummarySumOrderByAggregateInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => BillingPeriodSummaryScalarWhereWithAggregatesInputSchema), z.lazy(() => BillingPeriodSummaryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => BillingPeriodSummaryScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => BillingPeriodSummaryScalarWhereWithAggregatesInputSchema), z.lazy(() => BillingPeriodSummaryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  shareToken: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  totalAmount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  householdCount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  ticketCount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const CookingTeamWhereInputSchema: z.ZodType<Prisma.CookingTeamWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamWhereInputSchema), z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamWhereInputSchema), z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
}).strict();

export const CookingTeamOrderByWithRelationInputSchema: z.ZodType<Prisma.CookingTeamOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const CookingTeamWhereUniqueInputSchema: z.ZodType<Prisma.CookingTeamWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => CookingTeamWhereInputSchema), z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamWhereInputSchema), z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
}).strict());

export const CookingTeamOrderByWithAggregationInputSchema: z.ZodType<Prisma.CookingTeamOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => CookingTeamCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => CookingTeamAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => CookingTeamMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => CookingTeamMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => CookingTeamSumOrderByAggregateInputSchema).optional(),
}).strict();

export const CookingTeamScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CookingTeamScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema), z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema), z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
}).strict();

export const CookingTeamAssignmentWhereInputSchema: z.ZodType<Prisma.CookingTeamAssignmentWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema), z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema), z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema), z.lazy(() => RoleSchema) ]).optional(),
  allocationPercentage: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamScalarRelationFilterSchema), z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentOrderByWithRelationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentWhereUniqueInputSchema: z.ZodType<Prisma.CookingTeamAssignmentWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema), z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema), z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema), z.lazy(() => RoleSchema) ]).optional(),
  allocationPercentage: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamScalarRelationFilterSchema), z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema), z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict());

export const CookingTeamAssignmentOrderByWithAggregationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => CookingTeamAssignmentCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => CookingTeamAssignmentAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => CookingTeamAssignmentMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => CookingTeamAssignmentMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => CookingTeamAssignmentSumOrderByAggregateInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CookingTeamAssignmentScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleWithAggregatesFilterSchema), z.lazy(() => RoleSchema) ]).optional(),
  allocationPercentage: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const SeasonWhereInputSchema: z.ZodType<Prisma.SeasonWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SeasonWhereInputSchema), z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonWhereInputSchema), z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  shortName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  seasonDates: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  consecutiveCookingDays: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamListRelationFilterSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceListRelationFilterSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
}).strict();

export const SeasonOrderByWithRelationInputSchema: z.ZodType<Prisma.SeasonOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  seasonDates: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
  CookingTeams: z.lazy(() => CookingTeamOrderByRelationAggregateInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceOrderByRelationAggregateInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const SeasonWhereUniqueInputSchema: z.ZodType<Prisma.SeasonWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    shortName: z.string(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    shortName: z.string(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional(),
  AND: z.union([ z.lazy(() => SeasonWhereInputSchema), z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonWhereInputSchema), z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  seasonDates: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  consecutiveCookingDays: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamListRelationFilterSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceListRelationFilterSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
}).strict());

export const SeasonOrderByWithAggregationInputSchema: z.ZodType<Prisma.SeasonOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  seasonDates: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SeasonCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => SeasonAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SeasonMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SeasonMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => SeasonSumOrderByAggregateInputSchema).optional(),
}).strict();

export const SeasonScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SeasonScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema), z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema), z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  shortName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  seasonDates: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  consecutiveCookingDays: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
}).strict();

export const TicketPriceWhereInputSchema: z.ZodType<Prisma.TicketPriceWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceWhereInputSchema), z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceWhereInputSchema), z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema), z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  orders: z.lazy(() => OrderListRelationFilterSchema).optional(),
}).strict();

export const TicketPriceOrderByWithRelationInputSchema: z.ZodType<Prisma.TicketPriceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  maximumAgeLimit: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional(),
  orders: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const TicketPriceWhereUniqueInputSchema: z.ZodType<Prisma.TicketPriceWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => TicketPriceWhereInputSchema), z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceWhereInputSchema), z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema), z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema), z.number().int() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema), z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  orders: z.lazy(() => OrderListRelationFilterSchema).optional(),
}).strict());

export const TicketPriceOrderByWithAggregationInputSchema: z.ZodType<Prisma.TicketPriceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  maximumAgeLimit: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => TicketPriceCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => TicketPriceAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TicketPriceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TicketPriceMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => TicketPriceSumOrderByAggregateInputSchema).optional(),
}).strict();

export const TicketPriceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TicketPriceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema), z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema), z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeWithAggregatesFilterSchema), z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const OrderHistoryWhereInputSchema: z.ZodType<Prisma.OrderHistoryWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderHistoryWhereInputSchema), z.lazy(() => OrderHistoryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderHistoryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderHistoryWhereInputSchema), z.lazy(() => OrderHistoryWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  action: z.union([ z.lazy(() => EnumOrderAuditActionFilterSchema), z.lazy(() => OrderAuditActionSchema) ]).optional(),
  performedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  auditData: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  timestamp: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  dinnerEventId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  order: z.union([ z.lazy(() => OrderNullableScalarRelationFilterSchema), z.lazy(() => OrderWhereInputSchema) ]).optional().nullable(),
  performedByUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryOrderByWithRelationInputSchema: z.ZodType<Prisma.OrderHistoryOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  auditData: z.lazy(() => SortOrderSchema).optional(),
  timestamp: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  order: z.lazy(() => OrderOrderByWithRelationInputSchema).optional(),
  performedByUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const OrderHistoryWhereUniqueInputSchema: z.ZodType<Prisma.OrderHistoryWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => OrderHistoryWhereInputSchema), z.lazy(() => OrderHistoryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderHistoryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderHistoryWhereInputSchema), z.lazy(() => OrderHistoryWhereInputSchema).array() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  action: z.union([ z.lazy(() => EnumOrderAuditActionFilterSchema), z.lazy(() => OrderAuditActionSchema) ]).optional(),
  performedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  auditData: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  timestamp: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  dinnerEventId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  order: z.union([ z.lazy(() => OrderNullableScalarRelationFilterSchema), z.lazy(() => OrderWhereInputSchema) ]).optional().nullable(),
  performedByUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
}).strict());

export const OrderHistoryOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrderHistoryOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  auditData: z.lazy(() => SortOrderSchema).optional(),
  timestamp: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => OrderHistoryCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => OrderHistoryAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrderHistoryMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrderHistoryMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => OrderHistorySumOrderByAggregateInputSchema).optional(),
}).strict();

export const OrderHistoryScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.OrderHistoryScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => OrderHistoryScalarWhereWithAggregatesInputSchema), z.lazy(() => OrderHistoryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderHistoryScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderHistoryScalarWhereWithAggregatesInputSchema), z.lazy(() => OrderHistoryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  action: z.union([ z.lazy(() => EnumOrderAuditActionWithAggregatesFilterSchema), z.lazy(() => OrderAuditActionSchema) ]).optional(),
  performedByUserId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  auditData: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  timestamp: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  dinnerEventId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  seasonId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const JobRunWhereInputSchema: z.ZodType<Prisma.JobRunWhereInput> = z.object({
  AND: z.union([ z.lazy(() => JobRunWhereInputSchema), z.lazy(() => JobRunWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => JobRunWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => JobRunWhereInputSchema), z.lazy(() => JobRunWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  jobType: z.union([ z.lazy(() => EnumJobTypeFilterSchema), z.lazy(() => JobTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumJobStatusFilterSchema), z.lazy(() => JobStatusSchema) ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  completedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  durationMs: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  resultSummary: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  errorMessage: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  triggeredBy: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
}).strict();

export const JobRunOrderByWithRelationInputSchema: z.ZodType<Prisma.JobRunOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  jobType: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  completedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  durationMs: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  resultSummary: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  errorMessage: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  triggeredBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JobRunWhereUniqueInputSchema: z.ZodType<Prisma.JobRunWhereUniqueInput> = z.object({
  id: z.number().int(),
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => JobRunWhereInputSchema), z.lazy(() => JobRunWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => JobRunWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => JobRunWhereInputSchema), z.lazy(() => JobRunWhereInputSchema).array() ]).optional(),
  jobType: z.union([ z.lazy(() => EnumJobTypeFilterSchema), z.lazy(() => JobTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumJobStatusFilterSchema), z.lazy(() => JobStatusSchema) ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  completedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  durationMs: z.union([ z.lazy(() => IntNullableFilterSchema), z.number().int() ]).optional().nullable(),
  resultSummary: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  errorMessage: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  triggeredBy: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
}).strict());

export const JobRunOrderByWithAggregationInputSchema: z.ZodType<Prisma.JobRunOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  jobType: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  completedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  durationMs: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  resultSummary: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  errorMessage: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  triggeredBy: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => JobRunCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => JobRunAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => JobRunMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => JobRunMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => JobRunSumOrderByAggregateInputSchema).optional(),
}).strict();

export const JobRunScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.JobRunScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => JobRunScalarWhereWithAggregatesInputSchema), z.lazy(() => JobRunScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => JobRunScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => JobRunScalarWhereWithAggregatesInputSchema), z.lazy(() => JobRunScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  jobType: z.union([ z.lazy(() => EnumJobTypeWithAggregatesFilterSchema), z.lazy(() => JobTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumJobStatusWithAggregatesFilterSchema), z.lazy(() => JobStatusSchema) ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  completedAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  durationMs: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  resultSummary: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  errorMessage: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  triggeredBy: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
}).strict();

export const AllergyTypeCreateInputSchema: z.ZodType<Prisma.AllergyTypeCreateInput> = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedCreateInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeUpdateInputSchema: z.ZodType<Prisma.AllergyTypeUpdateInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedUpdateInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const AllergyTypeCreateManyInputSchema: z.ZodType<Prisma.AllergyTypeCreateManyInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
}).strict();

export const AllergyTypeUpdateManyMutationInputSchema: z.ZodType<Prisma.AllergyTypeUpdateManyMutationInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const AllergyTypeUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const DinnerEventAllergenCreateInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateInput> = z.object({
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutAllergensInputSchema),
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutDinnerEventAllergensInputSchema),
}).strict();

export const DinnerEventAllergenUncheckedCreateInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  allergyTypeId: z.number().int(),
}).strict();

export const DinnerEventAllergenUpdateInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateInput> = z.object({
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutAllergensNestedInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutDinnerEventAllergensNestedInputSchema).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenCreateManyInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  allergyTypeId: z.number().int(),
}).strict();

export const DinnerEventAllergenUpdateManyMutationInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyMutationInput> = z.object({
}).strict();

export const DinnerEventAllergenUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyCreateInputSchema: z.ZodType<Prisma.AllergyCreateInput> = z.object({
  inhabitantComment: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutAllergiesInputSchema),
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutAllergyInputSchema),
}).strict();

export const AllergyUncheckedCreateInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  inhabitantComment: z.string().optional().nullable(),
  allergyTypeId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AllergyUpdateInputSchema: z.ZodType<Prisma.AllergyUpdateInput> = z.object({
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema).optional(),
}).strict();

export const AllergyUncheckedUpdateInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyCreateManyInputSchema: z.ZodType<Prisma.AllergyCreateManyInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  inhabitantComment: z.string().optional().nullable(),
  allergyTypeId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AllergyUpdateManyMutationInputSchema: z.ZodType<Prisma.AllergyUpdateManyMutationInput> = z.object({
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutUserInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderCreateNestedManyWithoutBookedByUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUncheckedCreateNestedManyWithoutBookedByUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUpdateOneWithoutUserNestedInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUncheckedUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateInputSchema: z.ZodType<Prisma.InhabitantCreateInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUpdateInputSchema: z.ZodType<Prisma.InhabitantUpdateInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantCreateManyInputSchema: z.ZodType<Prisma.InhabitantCreateManyInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
}).strict();

export const InhabitantUpdateManyMutationInputSchema: z.ZodType<Prisma.InhabitantUpdateManyMutationInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InhabitantUncheckedUpdateManyInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const HouseholdCreateInputSchema: z.ZodType<Prisma.HouseholdCreateInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantCreateNestedManyWithoutHouseholdInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceCreateNestedManyWithoutHouseHoldInputSchema).optional(),
}).strict();

export const HouseholdUncheckedCreateInputSchema: z.ZodType<Prisma.HouseholdUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantUncheckedCreateNestedManyWithoutHouseholdInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema).optional(),
}).strict();

export const HouseholdUpdateInputSchema: z.ZodType<Prisma.HouseholdUpdateInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUpdateManyWithoutHouseholdNestedInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceUpdateManyWithoutHouseHoldNestedInputSchema).optional(),
}).strict();

export const HouseholdUncheckedUpdateInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUncheckedUpdateManyWithoutHouseholdNestedInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema).optional(),
}).strict();

export const HouseholdCreateManyInputSchema: z.ZodType<Prisma.HouseholdCreateManyInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
}).strict();

export const HouseholdUpdateManyMutationInputSchema: z.ZodType<Prisma.HouseholdUpdateManyMutationInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const HouseholdUncheckedUpdateManyInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventCreateInputSchema: z.ZodType<Prisma.DinnerEventCreateInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUpdateInputSchema: z.ZodType<Prisma.DinnerEventUpdateInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventCreateManyInputSchema: z.ZodType<Prisma.DinnerEventCreateManyInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const DinnerEventUpdateManyMutationInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyMutationInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderCreateInputSchema: z.ZodType<Prisma.OrderCreateInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateInputSchema: z.ZodType<Prisma.OrderUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUpdateInputSchema: z.ZodType<Prisma.OrderUpdateInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderCreateManyInputSchema: z.ZodType<Prisma.OrderCreateManyInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const OrderUpdateManyMutationInputSchema: z.ZodType<Prisma.OrderUpdateManyMutationInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateInputSchema: z.ZodType<Prisma.TransactionCreateInput> = z.object({
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  order: z.lazy(() => OrderCreateNestedOneWithoutTransactionInputSchema).optional(),
  invoice: z.lazy(() => InvoiceCreateNestedOneWithoutTransactionsInputSchema).optional(),
}).strict();

export const TransactionUncheckedCreateInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable(),
}).strict();

export const TransactionUpdateInputSchema: z.ZodType<Prisma.TransactionUpdateInput> = z.object({
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  order: z.lazy(() => OrderUpdateOneWithoutTransactionNestedInputSchema).optional(),
  invoice: z.lazy(() => InvoiceUpdateOneWithoutTransactionsNestedInputSchema).optional(),
}).strict();

export const TransactionUncheckedUpdateInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionCreateManyInputSchema: z.ZodType<Prisma.TransactionCreateManyInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable(),
}).strict();

export const TransactionUpdateManyMutationInputSchema: z.ZodType<Prisma.TransactionUpdateManyMutationInput> = z.object({
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InvoiceCreateInputSchema: z.ZodType<Prisma.InvoiceCreateInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionCreateNestedManyWithoutInvoiceInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdCreateNestedOneWithoutInvoiceInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryCreateNestedOneWithoutInvoicesInputSchema).optional(),
}).strict();

export const InvoiceUncheckedCreateInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int().optional().nullable(),
  billingPeriodSummaryId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema).optional(),
}).strict();

export const InvoiceUpdateInputSchema: z.ZodType<Prisma.InvoiceUpdateInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUpdateManyWithoutInvoiceNestedInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdUpdateOneWithoutInvoiceNestedInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryUpdateOneWithoutInvoicesNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema).optional(),
}).strict();

export const InvoiceCreateManyInputSchema: z.ZodType<Prisma.InvoiceCreateManyInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int().optional().nullable(),
  billingPeriodSummaryId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
}).strict();

export const InvoiceUpdateManyMutationInputSchema: z.ZodType<Prisma.InvoiceUpdateManyMutationInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const BillingPeriodSummaryCreateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateInput> = z.object({
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  invoices: z.lazy(() => InvoiceCreateNestedManyWithoutBillingPeriodSummaryInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryUncheckedCreateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  invoices: z.lazy(() => InvoiceUncheckedCreateNestedManyWithoutBillingPeriodSummaryInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryUpdateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateInput> = z.object({
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoices: z.lazy(() => InvoiceUpdateManyWithoutBillingPeriodSummaryNestedInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryUncheckedUpdateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoices: z.lazy(() => InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryNestedInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryCreateManyInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateManyInput> = z.object({
  id: z.number().int().optional(),
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const BillingPeriodSummaryUpdateManyMutationInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateManyMutationInput> = z.object({
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const BillingPeriodSummaryUncheckedUpdateManyInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateInputSchema: z.ZodType<Prisma.CookingTeamCreateInput> = z.object({
  name: z.string(),
  affinity: z.string().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedCreateInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamUpdateInputSchema: z.ZodType<Prisma.CookingTeamUpdateInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedUpdateInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamCreateManyInputSchema: z.ZodType<Prisma.CookingTeamCreateManyInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
}).strict();

export const CookingTeamUpdateManyMutationInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyMutationInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const CookingTeamUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const CookingTeamAssignmentCreateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateInput> = z.object({
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutAssignmentsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema),
}).strict();

export const CookingTeamAssignmentUncheckedCreateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  cookingTeamId: z.number().int(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamAssignmentUpdateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneRequiredWithoutAssignmentsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateManyInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInput> = z.object({
  id: z.number().int().optional(),
  cookingTeamId: z.number().int(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyMutationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyMutationInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SeasonCreateInputSchema: z.ZodType<Prisma.SeasonCreateInput> = z.object({
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonUncheckedCreateInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonUpdateInputSchema: z.ZodType<Prisma.SeasonUpdateInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const SeasonUncheckedUpdateInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const SeasonCreateManyInputSchema: z.ZodType<Prisma.SeasonCreateManyInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
}).strict();

export const SeasonUpdateManyMutationInputSchema: z.ZodType<Prisma.SeasonUpdateManyMutationInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SeasonUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TicketPriceCreateInputSchema: z.ZodType<Prisma.TicketPriceCreateInput> = z.object({
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutTicketPricesInputSchema),
  orders: z.lazy(() => OrderCreateNestedManyWithoutTicketPriceInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedCreateInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
  orders: z.lazy(() => OrderUncheckedCreateNestedManyWithoutTicketPriceInputSchema).optional(),
}).strict();

export const TicketPriceUpdateInputSchema: z.ZodType<Prisma.TicketPriceUpdateInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutTicketPricesNestedInputSchema).optional(),
  orders: z.lazy(() => OrderUpdateManyWithoutTicketPriceNestedInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedUpdateInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orders: z.lazy(() => OrderUncheckedUpdateManyWithoutTicketPriceNestedInputSchema).optional(),
}).strict();

export const TicketPriceCreateManyInputSchema: z.ZodType<Prisma.TicketPriceCreateManyInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
}).strict();

export const TicketPriceUpdateManyMutationInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyMutationInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryCreateInputSchema: z.ZodType<Prisma.OrderHistoryCreateInput> = z.object({
  action: z.lazy(() => OrderAuditActionSchema),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
  order: z.lazy(() => OrderCreateNestedOneWithoutOrderHistoryInputSchema).optional(),
  performedByUser: z.lazy(() => UserCreateNestedOneWithoutOrderHistoryInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedCreateInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  action: z.lazy(() => OrderAuditActionSchema),
  performedByUserId: z.number().int().optional().nullable(),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderHistoryUpdateInputSchema: z.ZodType<Prisma.OrderHistoryUpdateInput> = z.object({
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  order: z.lazy(() => OrderUpdateOneWithoutOrderHistoryNestedInputSchema).optional(),
  performedByUser: z.lazy(() => UserUpdateOneWithoutOrderHistoryNestedInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedUpdateInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  performedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryCreateManyInputSchema: z.ZodType<Prisma.OrderHistoryCreateManyInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  action: z.lazy(() => OrderAuditActionSchema),
  performedByUserId: z.number().int().optional().nullable(),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderHistoryUpdateManyMutationInputSchema: z.ZodType<Prisma.OrderHistoryUpdateManyMutationInput> = z.object({
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryUncheckedUpdateManyInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  performedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const JobRunCreateInputSchema: z.ZodType<Prisma.JobRunCreateInput> = z.object({
  jobType: z.lazy(() => JobTypeSchema),
  status: z.lazy(() => JobStatusSchema),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  durationMs: z.number().int().optional().nullable(),
  resultSummary: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  triggeredBy: z.string().optional(),
}).strict();

export const JobRunUncheckedCreateInputSchema: z.ZodType<Prisma.JobRunUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  jobType: z.lazy(() => JobTypeSchema),
  status: z.lazy(() => JobStatusSchema),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  durationMs: z.number().int().optional().nullable(),
  resultSummary: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  triggeredBy: z.string().optional(),
}).strict();

export const JobRunUpdateInputSchema: z.ZodType<Prisma.JobRunUpdateInput> = z.object({
  jobType: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => EnumJobTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => EnumJobStatusFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  completedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  durationMs: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  resultSummary: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  errorMessage: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  triggeredBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const JobRunUncheckedUpdateInputSchema: z.ZodType<Prisma.JobRunUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  jobType: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => EnumJobTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => EnumJobStatusFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  completedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  durationMs: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  resultSummary: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  errorMessage: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  triggeredBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const JobRunCreateManyInputSchema: z.ZodType<Prisma.JobRunCreateManyInput> = z.object({
  id: z.number().int().optional(),
  jobType: z.lazy(() => JobTypeSchema),
  status: z.lazy(() => JobStatusSchema),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  durationMs: z.number().int().optional().nullable(),
  resultSummary: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  triggeredBy: z.string().optional(),
}).strict();

export const JobRunUpdateManyMutationInputSchema: z.ZodType<Prisma.JobRunUpdateManyMutationInput> = z.object({
  jobType: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => EnumJobTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => EnumJobStatusFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  completedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  durationMs: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  resultSummary: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  errorMessage: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  triggeredBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const JobRunUncheckedUpdateManyInputSchema: z.ZodType<Prisma.JobRunUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  jobType: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => EnumJobTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => EnumJobStatusFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  completedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  durationMs: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  resultSummary: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  errorMessage: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  triggeredBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const AllergyListRelationFilterSchema: z.ZodType<Prisma.AllergyListRelationFilter> = z.object({
  every: z.lazy(() => AllergyWhereInputSchema).optional(),
  some: z.lazy(() => AllergyWhereInputSchema).optional(),
  none: z.lazy(() => AllergyWhereInputSchema).optional(),
}).strict();

export const DinnerEventAllergenListRelationFilterSchema: z.ZodType<Prisma.DinnerEventAllergenListRelationFilter> = z.object({
  every: z.lazy(() => DinnerEventAllergenWhereInputSchema).optional(),
  some: z.lazy(() => DinnerEventAllergenWhereInputSchema).optional(),
  none: z.lazy(() => DinnerEventAllergenWhereInputSchema).optional(),
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional(),
}).strict();

export const AllergyOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AllergyOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAllergenOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyTypeCountOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyTypeAvgOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyTypeMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyTypeMinOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyTypeSumOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional(),
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional(),
}).strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
}).strict();

export const DinnerEventScalarRelationFilterSchema: z.ZodType<Prisma.DinnerEventScalarRelationFilter> = z.object({
  is: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  isNot: z.lazy(() => DinnerEventWhereInputSchema).optional(),
}).strict();

export const AllergyTypeScalarRelationFilterSchema: z.ZodType<Prisma.AllergyTypeScalarRelationFilter> = z.object({
  is: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
  isNot: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
}).strict();

export const DinnerEventAllergenDinnerEventIdAllergyTypeIdCompoundUniqueInputSchema: z.ZodType<Prisma.DinnerEventAllergenDinnerEventIdAllergyTypeIdCompoundUniqueInput> = z.object({
  dinnerEventId: z.number(),
  allergyTypeId: z.number(),
}).strict();

export const DinnerEventAllergenCountOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAllergenAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAllergenMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAllergenMinOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAllergenSumOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAllergenSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const InhabitantScalarRelationFilterSchema: z.ZodType<Prisma.InhabitantScalarRelationFilter> = z.object({
  is: z.lazy(() => InhabitantWhereInputSchema).optional(),
  isNot: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const AllergyInhabitantIdAllergyTypeIdCompoundUniqueInputSchema: z.ZodType<Prisma.AllergyInhabitantIdAllergyTypeIdCompoundUniqueInput> = z.object({
  inhabitantId: z.number(),
  allergyTypeId: z.number(),
}).strict();

export const AllergyCountOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantComment: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyAvgOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantComment: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergyMinOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantComment: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AllergySumOrderByAggregateInputSchema: z.ZodType<Prisma.AllergySumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
}).strict();

export const InhabitantNullableScalarRelationFilterSchema: z.ZodType<Prisma.InhabitantNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => InhabitantWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => InhabitantWhereInputSchema).optional().nullable(),
}).strict();

export const OrderListRelationFilterSchema: z.ZodType<Prisma.OrderListRelationFilter> = z.object({
  every: z.lazy(() => OrderWhereInputSchema).optional(),
  some: z.lazy(() => OrderWhereInputSchema).optional(),
  none: z.lazy(() => OrderWhereInputSchema).optional(),
}).strict();

export const OrderHistoryListRelationFilterSchema: z.ZodType<Prisma.OrderHistoryListRelationFilter> = z.object({
  every: z.lazy(() => OrderHistoryWhereInputSchema).optional(),
  some: z.lazy(() => OrderHistoryWhereInputSchema).optional(),
  none: z.lazy(() => OrderHistoryWhereInputSchema).optional(),
}).strict();

export const OrderOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrderOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderHistoryOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrderHistoryOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRoles: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRoles: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRoles: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const IntNullableFilterSchema: z.ZodType<Prisma.IntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const UserNullableScalarRelationFilterSchema: z.ZodType<Prisma.UserNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => UserWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => UserWhereInputSchema).optional().nullable(),
}).strict();

export const HouseholdScalarRelationFilterSchema: z.ZodType<Prisma.HouseholdScalarRelationFilter> = z.object({
  is: z.lazy(() => HouseholdWhereInputSchema).optional(),
  isNot: z.lazy(() => HouseholdWhereInputSchema).optional(),
}).strict();

export const DinnerEventListRelationFilterSchema: z.ZodType<Prisma.DinnerEventListRelationFilter> = z.object({
  every: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  some: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  none: z.lazy(() => DinnerEventWhereInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentListRelationFilterSchema: z.ZodType<Prisma.CookingTeamAssignmentListRelationFilter> = z.object({
  every: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional(),
  some: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional(),
  none: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional(),
}).strict();

export const DinnerEventOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DinnerEventOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAssignmentOrderByRelationAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InhabitantCountOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional(),
  dinnerPreferences: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InhabitantAvgOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InhabitantMaxOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional(),
  dinnerPreferences: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InhabitantMinOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional(),
  dinnerPreferences: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InhabitantSumOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const IntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.IntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional(),
}).strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
}).strict();

export const InhabitantListRelationFilterSchema: z.ZodType<Prisma.InhabitantListRelationFilter> = z.object({
  every: z.lazy(() => InhabitantWhereInputSchema).optional(),
  some: z.lazy(() => InhabitantWhereInputSchema).optional(),
  none: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InvoiceListRelationFilterSchema: z.ZodType<Prisma.InvoiceListRelationFilter> = z.object({
  every: z.lazy(() => InvoiceWhereInputSchema).optional(),
  some: z.lazy(() => InvoiceWhereInputSchema).optional(),
  none: z.lazy(() => InvoiceWhereInputSchema).optional(),
}).strict();

export const InhabitantOrderByRelationAggregateInputSchema: z.ZodType<Prisma.InhabitantOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.InvoiceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const HouseholdCountOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const HouseholdAvgOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const HouseholdMaxOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const HouseholdMinOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const HouseholdSumOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumDinnerStateFilterSchema: z.ZodType<Prisma.EnumDinnerStateFilter> = z.object({
  equals: z.lazy(() => DinnerStateSchema).optional(),
  in: z.lazy(() => DinnerStateSchema).array().optional(),
  notIn: z.lazy(() => DinnerStateSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => NestedEnumDinnerStateFilterSchema) ]).optional(),
}).strict();

export const CookingTeamNullableScalarRelationFilterSchema: z.ZodType<Prisma.CookingTeamNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => CookingTeamWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => CookingTeamWhereInputSchema).optional().nullable(),
}).strict();

export const SeasonNullableScalarRelationFilterSchema: z.ZodType<Prisma.SeasonNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => SeasonWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => SeasonWhereInputSchema).optional().nullable(),
}).strict();

export const DinnerEventCountOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventMinOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DinnerEventSumOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  totalCost: z.lazy(() => SortOrderSchema).optional(),
  heynaboEventId: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumDinnerStateWithAggregatesFilterSchema: z.ZodType<Prisma.EnumDinnerStateWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerStateSchema).optional(),
  in: z.lazy(() => DinnerStateSchema).array().optional(),
  notIn: z.lazy(() => DinnerStateSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => NestedEnumDinnerStateWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerStateFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerStateFilterSchema).optional(),
}).strict();

export const EnumDinnerModeFilterSchema: z.ZodType<Prisma.EnumDinnerModeFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => NestedEnumDinnerModeFilterSchema) ]).optional(),
}).strict();

export const EnumOrderStateFilterSchema: z.ZodType<Prisma.EnumOrderStateFilter> = z.object({
  equals: z.lazy(() => OrderStateSchema).optional(),
  in: z.lazy(() => OrderStateSchema).array().optional(),
  notIn: z.lazy(() => OrderStateSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => NestedEnumOrderStateFilterSchema) ]).optional(),
}).strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const TicketPriceNullableScalarRelationFilterSchema: z.ZodType<Prisma.TicketPriceNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => TicketPriceWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => TicketPriceWhereInputSchema).optional().nullable(),
}).strict();

export const TransactionNullableScalarRelationFilterSchema: z.ZodType<Prisma.TransactionNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => TransactionWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => TransactionWhereInputSchema).optional().nullable(),
}).strict();

export const OrderCountOrderByAggregateInputSchema: z.ZodType<Prisma.OrderCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.lazy(() => SortOrderSchema).optional(),
  ticketPriceId: z.lazy(() => SortOrderSchema).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  isGuestTicket: z.lazy(() => SortOrderSchema).optional(),
  releasedAt: z.lazy(() => SortOrderSchema).optional(),
  closedAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderAvgOrderByAggregateInputSchema: z.ZodType<Prisma.OrderAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.lazy(() => SortOrderSchema).optional(),
  ticketPriceId: z.lazy(() => SortOrderSchema).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderMaxOrderByAggregateInputSchema: z.ZodType<Prisma.OrderMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.lazy(() => SortOrderSchema).optional(),
  ticketPriceId: z.lazy(() => SortOrderSchema).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  isGuestTicket: z.lazy(() => SortOrderSchema).optional(),
  releasedAt: z.lazy(() => SortOrderSchema).optional(),
  closedAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderMinOrderByAggregateInputSchema: z.ZodType<Prisma.OrderMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.lazy(() => SortOrderSchema).optional(),
  ticketPriceId: z.lazy(() => SortOrderSchema).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  state: z.lazy(() => SortOrderSchema).optional(),
  isGuestTicket: z.lazy(() => SortOrderSchema).optional(),
  releasedAt: z.lazy(() => SortOrderSchema).optional(),
  closedAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderSumOrderByAggregateInputSchema: z.ZodType<Prisma.OrderSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  bookedByUserId: z.lazy(() => SortOrderSchema).optional(),
  ticketPriceId: z.lazy(() => SortOrderSchema).optional(),
  priceAtBooking: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumDinnerModeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumDinnerModeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => NestedEnumDinnerModeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
}).strict();

export const EnumOrderStateWithAggregatesFilterSchema: z.ZodType<Prisma.EnumOrderStateWithAggregatesFilter> = z.object({
  equals: z.lazy(() => OrderStateSchema).optional(),
  in: z.lazy(() => OrderStateSchema).array().optional(),
  notIn: z.lazy(() => OrderStateSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => NestedEnumOrderStateWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumOrderStateFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumOrderStateFilterSchema).optional(),
}).strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
}).strict();

export const OrderNullableScalarRelationFilterSchema: z.ZodType<Prisma.OrderNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => OrderWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => OrderWhereInputSchema).optional().nullable(),
}).strict();

export const InvoiceNullableScalarRelationFilterSchema: z.ZodType<Prisma.InvoiceNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => InvoiceWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => InvoiceWhereInputSchema).optional().nullable(),
}).strict();

export const TransactionCountOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  orderSnapshot: z.lazy(() => SortOrderSchema).optional(),
  userSnapshot: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  userEmailHandle: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TransactionAvgOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TransactionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  orderSnapshot: z.lazy(() => SortOrderSchema).optional(),
  userSnapshot: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  userEmailHandle: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TransactionMinOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  orderSnapshot: z.lazy(() => SortOrderSchema).optional(),
  userSnapshot: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  userEmailHandle: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TransactionSumOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TransactionListRelationFilterSchema: z.ZodType<Prisma.TransactionListRelationFilter> = z.object({
  every: z.lazy(() => TransactionWhereInputSchema).optional(),
  some: z.lazy(() => TransactionWhereInputSchema).optional(),
  none: z.lazy(() => TransactionWhereInputSchema).optional(),
}).strict();

export const HouseholdNullableScalarRelationFilterSchema: z.ZodType<Prisma.HouseholdNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => HouseholdWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => HouseholdWhereInputSchema).optional().nullable(),
}).strict();

export const BillingPeriodSummaryNullableScalarRelationFilterSchema: z.ZodType<Prisma.BillingPeriodSummaryNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => BillingPeriodSummaryWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => BillingPeriodSummaryWhereInputSchema).optional().nullable(),
}).strict();

export const TransactionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TransactionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceCountOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  billingPeriodSummaryId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceAvgOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  billingPeriodSummaryId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceMaxOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  billingPeriodSummaryId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceMinOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  billingPeriodSummaryId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const InvoiceSumOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  billingPeriodSummaryId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BillingPeriodSummaryCountOrderByAggregateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  shareToken: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BillingPeriodSummaryAvgOrderByAggregateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BillingPeriodSummaryMaxOrderByAggregateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  shareToken: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BillingPeriodSummaryMinOrderByAggregateInputSchema: z.ZodType<Prisma.BillingPeriodSummaryMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  billingPeriod: z.lazy(() => SortOrderSchema).optional(),
  shareToken: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BillingPeriodSummarySumOrderByAggregateInputSchema: z.ZodType<Prisma.BillingPeriodSummarySumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  totalAmount: z.lazy(() => SortOrderSchema).optional(),
  householdCount: z.lazy(() => SortOrderSchema).optional(),
  ticketCount: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonScalarRelationFilterSchema: z.ZodType<Prisma.SeasonScalarRelationFilter> = z.object({
  is: z.lazy(() => SeasonWhereInputSchema).optional(),
  isNot: z.lazy(() => SeasonWhereInputSchema).optional(),
}).strict();

export const CookingTeamCountOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamMinOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamSumOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumRoleFilterSchema: z.ZodType<Prisma.EnumRoleFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema), z.lazy(() => NestedEnumRoleFilterSchema) ]).optional(),
}).strict();

export const CookingTeamScalarRelationFilterSchema: z.ZodType<Prisma.CookingTeamScalarRelationFilter> = z.object({
  is: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  isNot: z.lazy(() => CookingTeamWhereInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentCountOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAssignmentAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAssignmentMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAssignmentMinOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
  affinity: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const CookingTeamAssignmentSumOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allocationPercentage: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumRoleWithAggregatesFilterSchema: z.ZodType<Prisma.EnumRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema), z.lazy(() => NestedEnumRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
}).strict();

export const CookingTeamListRelationFilterSchema: z.ZodType<Prisma.CookingTeamListRelationFilter> = z.object({
  every: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  some: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  none: z.lazy(() => CookingTeamWhereInputSchema).optional(),
}).strict();

export const TicketPriceListRelationFilterSchema: z.ZodType<Prisma.TicketPriceListRelationFilter> = z.object({
  every: z.lazy(() => TicketPriceWhereInputSchema).optional(),
  some: z.lazy(() => TicketPriceWhereInputSchema).optional(),
  none: z.lazy(() => TicketPriceWhereInputSchema).optional(),
}).strict();

export const CookingTeamOrderByRelationAggregateInputSchema: z.ZodType<Prisma.CookingTeamOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TicketPriceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TicketPriceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonCountOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  seasonDates: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonAvgOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  seasonDates: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonMinOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  seasonDates: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SeasonSumOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  consecutiveCookingDays: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumTicketTypeFilterSchema: z.ZodType<Prisma.EnumTicketTypeFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => NestedEnumTicketTypeFilterSchema) ]).optional(),
}).strict();

export const TicketPriceCountOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  maximumAgeLimit: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TicketPriceAvgOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  maximumAgeLimit: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TicketPriceMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  maximumAgeLimit: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TicketPriceMinOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  maximumAgeLimit: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const TicketPriceSumOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  maximumAgeLimit: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumTicketTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumTicketTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => NestedEnumTicketTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
}).strict();

export const EnumOrderAuditActionFilterSchema: z.ZodType<Prisma.EnumOrderAuditActionFilter> = z.object({
  equals: z.lazy(() => OrderAuditActionSchema).optional(),
  in: z.lazy(() => OrderAuditActionSchema).array().optional(),
  notIn: z.lazy(() => OrderAuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => NestedEnumOrderAuditActionFilterSchema) ]).optional(),
}).strict();

export const OrderHistoryCountOrderByAggregateInputSchema: z.ZodType<Prisma.OrderHistoryCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.lazy(() => SortOrderSchema).optional(),
  auditData: z.lazy(() => SortOrderSchema).optional(),
  timestamp: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderHistoryAvgOrderByAggregateInputSchema: z.ZodType<Prisma.OrderHistoryAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderHistoryMaxOrderByAggregateInputSchema: z.ZodType<Prisma.OrderHistoryMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.lazy(() => SortOrderSchema).optional(),
  auditData: z.lazy(() => SortOrderSchema).optional(),
  timestamp: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderHistoryMinOrderByAggregateInputSchema: z.ZodType<Prisma.OrderHistoryMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.lazy(() => SortOrderSchema).optional(),
  auditData: z.lazy(() => SortOrderSchema).optional(),
  timestamp: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const OrderHistorySumOrderByAggregateInputSchema: z.ZodType<Prisma.OrderHistorySumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  performedByUserId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumOrderAuditActionWithAggregatesFilterSchema: z.ZodType<Prisma.EnumOrderAuditActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => OrderAuditActionSchema).optional(),
  in: z.lazy(() => OrderAuditActionSchema).array().optional(),
  notIn: z.lazy(() => OrderAuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => NestedEnumOrderAuditActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumOrderAuditActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumOrderAuditActionFilterSchema).optional(),
}).strict();

export const EnumJobTypeFilterSchema: z.ZodType<Prisma.EnumJobTypeFilter> = z.object({
  equals: z.lazy(() => JobTypeSchema).optional(),
  in: z.lazy(() => JobTypeSchema).array().optional(),
  notIn: z.lazy(() => JobTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => NestedEnumJobTypeFilterSchema) ]).optional(),
}).strict();

export const EnumJobStatusFilterSchema: z.ZodType<Prisma.EnumJobStatusFilter> = z.object({
  equals: z.lazy(() => JobStatusSchema).optional(),
  in: z.lazy(() => JobStatusSchema).array().optional(),
  notIn: z.lazy(() => JobStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => NestedEnumJobStatusFilterSchema) ]).optional(),
}).strict();

export const JobRunCountOrderByAggregateInputSchema: z.ZodType<Prisma.JobRunCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  jobType: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  completedAt: z.lazy(() => SortOrderSchema).optional(),
  durationMs: z.lazy(() => SortOrderSchema).optional(),
  resultSummary: z.lazy(() => SortOrderSchema).optional(),
  errorMessage: z.lazy(() => SortOrderSchema).optional(),
  triggeredBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JobRunAvgOrderByAggregateInputSchema: z.ZodType<Prisma.JobRunAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  durationMs: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JobRunMaxOrderByAggregateInputSchema: z.ZodType<Prisma.JobRunMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  jobType: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  completedAt: z.lazy(() => SortOrderSchema).optional(),
  durationMs: z.lazy(() => SortOrderSchema).optional(),
  resultSummary: z.lazy(() => SortOrderSchema).optional(),
  errorMessage: z.lazy(() => SortOrderSchema).optional(),
  triggeredBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JobRunMinOrderByAggregateInputSchema: z.ZodType<Prisma.JobRunMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  jobType: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  completedAt: z.lazy(() => SortOrderSchema).optional(),
  durationMs: z.lazy(() => SortOrderSchema).optional(),
  resultSummary: z.lazy(() => SortOrderSchema).optional(),
  errorMessage: z.lazy(() => SortOrderSchema).optional(),
  triggeredBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JobRunSumOrderByAggregateInputSchema: z.ZodType<Prisma.JobRunSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  durationMs: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumJobTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumJobTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => JobTypeSchema).optional(),
  in: z.lazy(() => JobTypeSchema).array().optional(),
  notIn: z.lazy(() => JobTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => NestedEnumJobTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumJobTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumJobTypeFilterSchema).optional(),
}).strict();

export const EnumJobStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumJobStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => JobStatusSchema).optional(),
  in: z.lazy(() => JobStatusSchema).array().optional(),
  notIn: z.lazy(() => JobStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => NestedEnumJobStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumJobStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumJobStatusFilterSchema).optional(),
}).strict();

export const AllergyCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AllergyUncheckedCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional(),
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable(),
}).strict();

export const AllergyUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedOneWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedOneWithoutAllergensInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutAllergensInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutAllergensInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional(),
}).strict();

export const AllergyTypeCreateNestedOneWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeCreateNestedOneWithoutDinnerEventAllergensInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutDinnerEventAllergensInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional(),
}).strict();

export const DinnerEventUpdateOneRequiredWithoutAllergensNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateOneRequiredWithoutAllergensNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutAllergensInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutAllergensInputSchema).optional(),
  upsert: z.lazy(() => DinnerEventUpsertWithoutAllergensInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateToOneWithWhereWithoutAllergensInputSchema), z.lazy(() => DinnerEventUpdateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutAllergensInputSchema) ]).optional(),
}).strict();

export const AllergyTypeUpdateOneRequiredWithoutDinnerEventAllergensNestedInputSchema: z.ZodType<Prisma.AllergyTypeUpdateOneRequiredWithoutDinnerEventAllergensNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutDinnerEventAllergensInputSchema).optional(),
  upsert: z.lazy(() => AllergyTypeUpsertWithoutDinnerEventAllergensInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => AllergyTypeUpdateToOneWithWhereWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUpdateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutDinnerEventAllergensInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutAllergiesInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutAllergiesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const AllergyTypeCreateNestedOneWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateNestedOneWithoutAllergyInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutAllergyInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional(),
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional(),
}).strict();

export const InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutAllergiesNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutAllergiesInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutAllergiesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutAllergiesInputSchema), z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]).optional(),
}).strict();

export const AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema: z.ZodType<Prisma.AllergyTypeUpdateOneRequiredWithoutAllergyNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutAllergyInputSchema).optional(),
  upsert: z.lazy(() => AllergyTypeUpsertWithoutAllergyInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => AllergyTypeUpdateToOneWithWhereWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const OrderCreateNestedManyWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutBookedByUserInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateWithoutBookedByUserInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyBookedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderHistoryCreateNestedManyWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryCreateNestedManyWithoutPerformedByUserInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyPerformedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateNestedManyWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutBookedByUserInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateWithoutBookedByUserInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyBookedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderHistoryUncheckedCreateNestedManyWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedCreateNestedManyWithoutPerformedByUserInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyPerformedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => InhabitantUpdateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const OrderUpdateManyWithoutBookedByUserNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutBookedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateWithoutBookedByUserInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutBookedByUserInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutBookedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyBookedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutBookedByUserInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutBookedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutBookedByUserInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutBookedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderHistoryUpdateManyWithoutPerformedByUserNestedInputSchema: z.ZodType<Prisma.OrderHistoryUpdateManyWithoutPerformedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyPerformedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => InhabitantUpdateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutBookedByUserNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutBookedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateWithoutBookedByUserInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema), z.lazy(() => OrderCreateOrConnectWithoutBookedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutBookedByUserInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutBookedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyBookedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutBookedByUserInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutBookedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutBookedByUserInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutBookedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderHistoryUncheckedUpdateManyWithoutPerformedByUserNestedInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateManyWithoutPerformedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyPerformedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutInhabitantInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const HouseholdCreateNestedOneWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateNestedOneWithoutInhabitantsInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInhabitantsInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
}).strict();

export const AllergyCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutChefInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutChefInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable(),
}).strict();

export const UserUpdateOneWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutInhabitantInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutInhabitantInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutInhabitantInputSchema), z.lazy(() => UserUpdateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]).optional(),
}).strict();

export const HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema: z.ZodType<Prisma.HouseholdUpdateOneRequiredWithoutInhabitantsNestedInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInhabitantsInputSchema).optional(),
  upsert: z.lazy(() => HouseholdUpsertWithoutInhabitantsInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => HouseholdUpdateToOneWithWhereWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]).optional(),
}).strict();

export const AllergyUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutChefNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutChefNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const NullableIntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableIntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema), z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutChefNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantCreateNestedManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateNestedManyWithoutHouseholdInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceCreateNestedManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateNestedManyWithoutHouseHoldInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedCreateNestedManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateNestedManyWithoutHouseholdInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateNestedManyWithoutHouseHoldInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUpdateManyWithoutHouseholdNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateManyWithoutHouseholdNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema), z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUpdateManyWithoutHouseHoldNestedInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithoutHouseHoldNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedUpdateManyWithoutHouseholdNestedInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateManyWithoutHouseholdNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema), z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema), z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema), z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema), z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerEventInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const CookingTeamCreateNestedOneWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutDinnersInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutDinnersInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
}).strict();

export const OrderCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutDinnerEventsInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutDinnerEventsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
}).strict();

export const DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const EnumDinnerStateFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumDinnerStateFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => DinnerStateSchema).optional(),
}).strict();

export const InhabitantUpdateOneWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerEventInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutDinnerEventInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]).optional(),
}).strict();

export const CookingTeamUpdateOneWithoutDinnersNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneWithoutDinnersNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutDinnersInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutDinnersInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutDinnersInputSchema), z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]).optional(),
}).strict();

export const OrderUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonUpdateOneWithoutDinnerEventsNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneWithoutDinnerEventsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutDinnerEventsInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutDinnerEventsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema).array(), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema), z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedOneWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedOneWithoutTicketsInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutTicketsInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const UserCreateNestedOneWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutBookedOrdersInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedCreateWithoutBookedOrdersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutBookedOrdersInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const TicketPriceCreateNestedOneWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceCreateNestedOneWithoutOrdersInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutOrdersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TicketPriceCreateOrConnectWithoutOrdersInputSchema).optional(),
  connect: z.lazy(() => TicketPriceWhereUniqueInputSchema).optional(),
}).strict();

export const TransactionCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
}).strict();

export const OrderHistoryCreateNestedManyWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryCreateNestedManyWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyOrderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TransactionUncheckedCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedCreateNestedManyWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyOrderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const EnumDinnerModeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumDinnerModeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => DinnerModeSchema).optional(),
}).strict();

export const EnumOrderStateFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumOrderStateFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => OrderStateSchema).optional(),
}).strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional(),
}).strict();

export const DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateOneRequiredWithoutTicketsNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutTicketsInputSchema).optional(),
  upsert: z.lazy(() => DinnerEventUpsertWithoutTicketsInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateToOneWithWhereWithoutTicketsInputSchema), z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]).optional(),
}).strict();

export const InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutOrderInputSchema), z.lazy(() => InhabitantUpdateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneWithoutBookedOrdersNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutBookedOrdersNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedCreateWithoutBookedOrdersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutBookedOrdersInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutBookedOrdersInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutBookedOrdersInputSchema), z.lazy(() => UserUpdateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedUpdateWithoutBookedOrdersInputSchema) ]).optional(),
}).strict();

export const TicketPriceUpdateOneWithoutOrdersNestedInputSchema: z.ZodType<Prisma.TicketPriceUpdateOneWithoutOrdersNestedInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutOrdersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TicketPriceCreateOrConnectWithoutOrdersInputSchema).optional(),
  upsert: z.lazy(() => TicketPriceUpsertWithoutOrdersInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => TicketPriceWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => TicketPriceWhereInputSchema) ]).optional(),
  connect: z.lazy(() => TicketPriceWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TicketPriceUpdateToOneWithWhereWithoutOrdersInputSchema), z.lazy(() => TicketPriceUpdateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedUpdateWithoutOrdersInputSchema) ]).optional(),
}).strict();

export const TransactionUpdateOneWithoutOrderNestedInputSchema: z.ZodType<Prisma.TransactionUpdateOneWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => TransactionUpsertWithoutOrderInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateToOneWithWhereWithoutOrderInputSchema), z.lazy(() => TransactionUpdateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const OrderHistoryUpdateManyWithoutOrderNestedInputSchema: z.ZodType<Prisma.OrderHistoryUpdateManyWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutOrderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyOrderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutOrderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutOrderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateOneWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => TransactionUpsertWithoutOrderInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateToOneWithWhereWithoutOrderInputSchema), z.lazy(() => TransactionUpdateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateManyWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema).array(), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema), z.lazy(() => OrderHistoryCreateOrConnectWithoutOrderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpsertWithWhereUniqueWithoutOrderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderHistoryCreateManyOrderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderHistoryWhereUniqueInputSchema), z.lazy(() => OrderHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpdateWithWhereUniqueWithoutOrderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutOrderInputSchema), z.lazy(() => OrderHistoryUpdateManyWithWhereWithoutOrderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderCreateNestedOneWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateNestedOneWithoutTransactionInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutTransactionInputSchema).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional(),
}).strict();

export const InvoiceCreateNestedOneWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateNestedOneWithoutTransactionsInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InvoiceCreateOrConnectWithoutTransactionsInputSchema).optional(),
  connect: z.lazy(() => InvoiceWhereUniqueInputSchema).optional(),
}).strict();

export const OrderUpdateOneWithoutTransactionNestedInputSchema: z.ZodType<Prisma.OrderUpdateOneWithoutTransactionNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutTransactionInputSchema).optional(),
  upsert: z.lazy(() => OrderUpsertWithoutTransactionInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrderUpdateToOneWithWhereWithoutTransactionInputSchema), z.lazy(() => OrderUpdateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]).optional(),
}).strict();

export const InvoiceUpdateOneWithoutTransactionsNestedInputSchema: z.ZodType<Prisma.InvoiceUpdateOneWithoutTransactionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InvoiceCreateOrConnectWithoutTransactionsInputSchema).optional(),
  upsert: z.lazy(() => InvoiceUpsertWithoutTransactionsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InvoiceWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InvoiceWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InvoiceWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateToOneWithWhereWithoutTransactionsInputSchema), z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateNestedManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateNestedManyWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const HouseholdCreateNestedOneWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateNestedOneWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInvoiceInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryCreateNestedOneWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateNestedOneWithoutInvoicesInput> = z.object({
  create: z.union([ z.lazy(() => BillingPeriodSummaryCreateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedCreateWithoutInvoicesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => BillingPeriodSummaryCreateOrConnectWithoutInvoicesInputSchema).optional(),
  connect: z.lazy(() => BillingPeriodSummaryWhereUniqueInputSchema).optional(),
}).strict();

export const TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateNestedManyWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TransactionUpdateManyWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.TransactionUpdateManyWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema), z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema), z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema), z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TransactionScalarWhereInputSchema), z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const HouseholdUpdateOneWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.HouseholdUpdateOneWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInvoiceInputSchema).optional(),
  upsert: z.lazy(() => HouseholdUpsertWithoutInvoiceInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => HouseholdUpdateToOneWithWhereWithoutInvoiceInputSchema), z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]).optional(),
}).strict();

export const BillingPeriodSummaryUpdateOneWithoutInvoicesNestedInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateOneWithoutInvoicesNestedInput> = z.object({
  create: z.union([ z.lazy(() => BillingPeriodSummaryCreateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedCreateWithoutInvoicesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => BillingPeriodSummaryCreateOrConnectWithoutInvoicesInputSchema).optional(),
  upsert: z.lazy(() => BillingPeriodSummaryUpsertWithoutInvoicesInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => BillingPeriodSummaryWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => BillingPeriodSummaryWhereInputSchema) ]).optional(),
  connect: z.lazy(() => BillingPeriodSummaryWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => BillingPeriodSummaryUpdateToOneWithWhereWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUpdateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedUpdateWithoutInvoicesInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema), z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema), z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema), z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema), z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema), z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TransactionScalarWhereInputSchema), z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceCreateNestedManyWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceCreateNestedManyWithoutBillingPeriodSummaryInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedCreateNestedManyWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateNestedManyWithoutBillingPeriodSummaryInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUpdateManyWithoutBillingPeriodSummaryNestedInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithoutBillingPeriodSummaryNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryNestedInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema).array(), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema), z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutCookingTeamsInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutCookingTeamsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
}).strict();

export const DinnerEventCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneRequiredWithoutCookingTeamsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutCookingTeamsInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutCookingTeamsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema).array(), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema), z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamCreateNestedOneWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutAssignmentsInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutAssignmentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutAssignmentsInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutCookingTeamAssignmentInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
}).strict();

export const EnumRoleFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumRoleFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => RoleSchema).optional(),
}).strict();

export const CookingTeamUpdateOneRequiredWithoutAssignmentsNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneRequiredWithoutAssignmentsNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutAssignmentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutAssignmentsInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutAssignmentsInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUpdateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutAssignmentsInputSchema) ]).optional(),
}).strict();

export const InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutCookingTeamAssignmentInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema), z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema), z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema), z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema), z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema), z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema), z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema), z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema), z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema), z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutTicketPricesInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutTicketPricesInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
}).strict();

export const OrderCreateNestedManyWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutTicketPriceInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateWithoutTicketPriceInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyTicketPriceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedCreateNestedManyWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutTicketPriceInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateWithoutTicketPriceInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyTicketPriceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const EnumTicketTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumTicketTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => TicketTypeSchema).optional(),
}).strict();

export const SeasonUpdateOneRequiredWithoutTicketPricesNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneRequiredWithoutTicketPricesNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutTicketPricesInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutTicketPricesInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutTicketPricesInputSchema), z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]).optional(),
}).strict();

export const OrderUpdateManyWithoutTicketPriceNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutTicketPriceNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateWithoutTicketPriceInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutTicketPriceInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutTicketPriceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyTicketPriceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutTicketPriceInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutTicketPriceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutTicketPriceInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutTicketPriceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutTicketPriceNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutTicketPriceNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateWithoutTicketPriceInputSchema).array(), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema), z.lazy(() => OrderCreateOrConnectWithoutTicketPriceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutTicketPriceInputSchema), z.lazy(() => OrderUpsertWithWhereUniqueWithoutTicketPriceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyTicketPriceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema), z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutTicketPriceInputSchema), z.lazy(() => OrderUpdateWithWhereUniqueWithoutTicketPriceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutTicketPriceInputSchema), z.lazy(() => OrderUpdateManyWithWhereWithoutTicketPriceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderCreateNestedOneWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderCreateNestedOneWithoutOrderHistoryInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedCreateWithoutOrderHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutOrderHistoryInputSchema).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional(),
}).strict();

export const UserCreateNestedOneWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutOrderHistoryInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutOrderHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutOrderHistoryInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const EnumOrderAuditActionFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumOrderAuditActionFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => OrderAuditActionSchema).optional(),
}).strict();

export const OrderUpdateOneWithoutOrderHistoryNestedInputSchema: z.ZodType<Prisma.OrderUpdateOneWithoutOrderHistoryNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedCreateWithoutOrderHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutOrderHistoryInputSchema).optional(),
  upsert: z.lazy(() => OrderUpsertWithoutOrderHistoryInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrderUpdateToOneWithWhereWithoutOrderHistoryInputSchema), z.lazy(() => OrderUpdateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutOrderHistoryInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneWithoutOrderHistoryNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutOrderHistoryNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutOrderHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutOrderHistoryInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutOrderHistoryInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutOrderHistoryInputSchema), z.lazy(() => UserUpdateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutOrderHistoryInputSchema) ]).optional(),
}).strict();

export const EnumJobTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumJobTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => JobTypeSchema).optional(),
}).strict();

export const EnumJobStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumJobStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => JobStatusSchema).optional(),
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional(),
}).strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional(),
}).strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
}).strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
}).strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedIntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional(),
}).strict();

export const NestedFloatNullableFilterSchema: z.ZodType<Prisma.NestedFloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
}).strict();

export const NestedEnumDinnerStateFilterSchema: z.ZodType<Prisma.NestedEnumDinnerStateFilter> = z.object({
  equals: z.lazy(() => DinnerStateSchema).optional(),
  in: z.lazy(() => DinnerStateSchema).array().optional(),
  notIn: z.lazy(() => DinnerStateSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => NestedEnumDinnerStateFilterSchema) ]).optional(),
}).strict();

export const NestedEnumDinnerStateWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumDinnerStateWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerStateSchema).optional(),
  in: z.lazy(() => DinnerStateSchema).array().optional(),
  notIn: z.lazy(() => DinnerStateSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => NestedEnumDinnerStateWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerStateFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerStateFilterSchema).optional(),
}).strict();

export const NestedEnumDinnerModeFilterSchema: z.ZodType<Prisma.NestedEnumDinnerModeFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => NestedEnumDinnerModeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumOrderStateFilterSchema: z.ZodType<Prisma.NestedEnumOrderStateFilter> = z.object({
  equals: z.lazy(() => OrderStateSchema).optional(),
  in: z.lazy(() => OrderStateSchema).array().optional(),
  notIn: z.lazy(() => OrderStateSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => NestedEnumOrderStateFilterSchema) ]).optional(),
}).strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const NestedEnumDinnerModeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumDinnerModeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => NestedEnumDinnerModeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
}).strict();

export const NestedEnumOrderStateWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumOrderStateWithAggregatesFilter> = z.object({
  equals: z.lazy(() => OrderStateSchema).optional(),
  in: z.lazy(() => OrderStateSchema).array().optional(),
  notIn: z.lazy(() => OrderStateSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => NestedEnumOrderStateWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumOrderStateFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumOrderStateFilterSchema).optional(),
}).strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
}).strict();

export const NestedEnumRoleFilterSchema: z.ZodType<Prisma.NestedEnumRoleFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema), z.lazy(() => NestedEnumRoleFilterSchema) ]).optional(),
}).strict();

export const NestedEnumRoleWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema), z.lazy(() => NestedEnumRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
}).strict();

export const NestedEnumTicketTypeFilterSchema: z.ZodType<Prisma.NestedEnumTicketTypeFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => NestedEnumTicketTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumTicketTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumTicketTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => NestedEnumTicketTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
}).strict();

export const NestedEnumOrderAuditActionFilterSchema: z.ZodType<Prisma.NestedEnumOrderAuditActionFilter> = z.object({
  equals: z.lazy(() => OrderAuditActionSchema).optional(),
  in: z.lazy(() => OrderAuditActionSchema).array().optional(),
  notIn: z.lazy(() => OrderAuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => NestedEnumOrderAuditActionFilterSchema) ]).optional(),
}).strict();

export const NestedEnumOrderAuditActionWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumOrderAuditActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => OrderAuditActionSchema).optional(),
  in: z.lazy(() => OrderAuditActionSchema).array().optional(),
  notIn: z.lazy(() => OrderAuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => NestedEnumOrderAuditActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumOrderAuditActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumOrderAuditActionFilterSchema).optional(),
}).strict();

export const NestedEnumJobTypeFilterSchema: z.ZodType<Prisma.NestedEnumJobTypeFilter> = z.object({
  equals: z.lazy(() => JobTypeSchema).optional(),
  in: z.lazy(() => JobTypeSchema).array().optional(),
  notIn: z.lazy(() => JobTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => NestedEnumJobTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumJobStatusFilterSchema: z.ZodType<Prisma.NestedEnumJobStatusFilter> = z.object({
  equals: z.lazy(() => JobStatusSchema).optional(),
  in: z.lazy(() => JobStatusSchema).array().optional(),
  notIn: z.lazy(() => JobStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => NestedEnumJobStatusFilterSchema) ]).optional(),
}).strict();

export const NestedEnumJobTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumJobTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => JobTypeSchema).optional(),
  in: z.lazy(() => JobTypeSchema).array().optional(),
  notIn: z.lazy(() => JobTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => JobTypeSchema), z.lazy(() => NestedEnumJobTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumJobTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumJobTypeFilterSchema).optional(),
}).strict();

export const NestedEnumJobStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumJobStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => JobStatusSchema).optional(),
  in: z.lazy(() => JobStatusSchema).array().optional(),
  notIn: z.lazy(() => JobStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => JobStatusSchema), z.lazy(() => NestedEnumJobStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumJobStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumJobStatusFilterSchema).optional(),
}).strict();

export const AllergyCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateWithoutAllergyTypeInput> = z.object({
  inhabitantComment: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutAllergiesInputSchema),
}).strict();

export const AllergyUncheckedCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateWithoutAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  inhabitantComment: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AllergyCreateOrConnectWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateOrConnectWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyCreateManyAllergyTypeInputEnvelopeSchema: z.ZodType<Prisma.AllergyCreateManyAllergyTypeInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AllergyCreateManyAllergyTypeInputSchema), z.lazy(() => AllergyCreateManyAllergyTypeInputSchema).array() ]),
}).strict();

export const DinnerEventAllergenCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateWithoutAllergyTypeInput> = z.object({
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutAllergensInputSchema),
}).strict();

export const DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
}).strict();

export const DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateOrConnectWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const DinnerEventAllergenCreateManyAllergyTypeInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyAllergyTypeInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenCreateManyAllergyTypeInputSchema).array() ]),
}).strict();

export const AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpsertWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AllergyUpdateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateWithoutAllergyTypeInputSchema), z.lazy(() => AllergyUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithWhereWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateManyMutationInputSchema), z.lazy(() => AllergyUncheckedUpdateManyWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyScalarWhereInputSchema: z.ZodType<Prisma.AllergyScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyScalarWhereInputSchema), z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantComment: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpsertWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithoutAllergyTypeInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyWithWhereWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyMutationInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeInputSchema) ]),
}).strict();

export const DinnerEventAllergenScalarWhereInputSchema: z.ZodType<Prisma.DinnerEventAllergenScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventAllergenScalarWhereInputSchema), z.lazy(() => DinnerEventAllergenScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
}).strict();

export const DinnerEventCreateWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutAllergensInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutAllergensInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventCreateOrConnectWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutAllergensInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutAllergensInputSchema) ]),
}).strict();

export const AllergyTypeCreateWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeCreateWithoutDinnerEventAllergensInput> = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeCreateOrConnectWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeCreateOrConnectWithoutDinnerEventAllergensInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInputSchema) ]),
}).strict();

export const DinnerEventUpsertWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithoutAllergensInput> = z.object({
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutAllergensInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutAllergensInputSchema) ]),
  where: z.lazy(() => DinnerEventWhereInputSchema).optional(),
}).strict();

export const DinnerEventUpdateToOneWithWhereWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventUpdateToOneWithWhereWithoutAllergensInput> = z.object({
  where: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutAllergensInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutAllergensInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutAllergensInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateWithoutAllergensInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutAllergensInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const AllergyTypeUpsertWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeUpsertWithoutDinnerEventAllergensInput> = z.object({
  update: z.union([ z.lazy(() => AllergyTypeUpdateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutDinnerEventAllergensInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutDinnerEventAllergensInputSchema) ]),
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
}).strict();

export const AllergyTypeUpdateToOneWithWhereWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeUpdateToOneWithWhereWithoutDinnerEventAllergensInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => AllergyTypeUpdateWithoutDinnerEventAllergensInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutDinnerEventAllergensInputSchema) ]),
}).strict();

export const AllergyTypeUpdateWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeUpdateWithoutDinnerEventAllergensInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedUpdateWithoutDinnerEventAllergensInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateWithoutDinnerEventAllergensInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const InhabitantCreateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutAllergiesInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutAllergiesInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutAllergiesInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]),
}).strict();

export const AllergyTypeCreateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateWithoutAllergyInput> = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedCreateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedCreateWithoutAllergyInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutAllergyTypeInputSchema).optional(),
}).strict();

export const AllergyTypeCreateOrConnectWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateOrConnectWithoutAllergyInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]),
}).strict();

export const InhabitantUpsertWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutAllergiesInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutAllergiesInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutAllergiesInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutAllergiesInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const AllergyTypeUpsertWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpsertWithoutAllergyInput> = z.object({
  update: z.union([ z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]),
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
}).strict();

export const AllergyTypeUpdateToOneWithWhereWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpdateToOneWithWhereWithoutAllergyInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema), z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]),
}).strict();

export const AllergyTypeUpdateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpdateWithoutAllergyInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const AllergyTypeUncheckedUpdateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateWithoutAllergyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  DinnerEventAllergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema).optional(),
}).strict();

export const InhabitantCreateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutUserInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutUserInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const OrderCreateWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderCreateWithoutBookedByUserInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutBookedByUserInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutBookedByUserInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema) ]),
}).strict();

export const OrderCreateManyBookedByUserInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyBookedByUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyBookedByUserInputSchema), z.lazy(() => OrderCreateManyBookedByUserInputSchema).array() ]),
}).strict();

export const OrderHistoryCreateWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryCreateWithoutPerformedByUserInput> = z.object({
  action: z.lazy(() => OrderAuditActionSchema),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
  order: z.lazy(() => OrderCreateNestedOneWithoutOrderHistoryInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedCreateWithoutPerformedByUserInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  action: z.lazy(() => OrderAuditActionSchema),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderHistoryCreateOrConnectWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryCreateOrConnectWithoutPerformedByUserInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema) ]),
}).strict();

export const OrderHistoryCreateManyPerformedByUserInputEnvelopeSchema: z.ZodType<Prisma.OrderHistoryCreateManyPerformedByUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderHistoryCreateManyPerformedByUserInputSchema), z.lazy(() => OrderHistoryCreateManyPerformedByUserInputSchema).array() ]),
}).strict();

export const InhabitantUpsertWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutUserInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutUserInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutUserInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const OrderUpsertWithWhereUniqueWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutBookedByUserInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutBookedByUserInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedCreateWithoutBookedByUserInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutBookedByUserInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutBookedByUserInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutBookedByUserInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutBookedByUserInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema), z.lazy(() => OrderUncheckedUpdateManyWithoutBookedByUserInputSchema) ]),
}).strict();

export const OrderScalarWhereInputSchema: z.ZodType<Prisma.OrderScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderScalarWhereInputSchema), z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  bookedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  ticketPriceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  priceAtBooking: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema), z.lazy(() => DinnerModeSchema) ]).optional(),
  state: z.union([ z.lazy(() => EnumOrderStateFilterSchema), z.lazy(() => OrderStateSchema) ]).optional(),
  isGuestTicket: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  releasedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  closedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUpsertWithWhereUniqueWithoutPerformedByUserInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateWithoutPerformedByUserInputSchema) ]),
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutPerformedByUserInputSchema) ]),
}).strict();

export const OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUpdateWithWhereUniqueWithoutPerformedByUserInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderHistoryUpdateWithoutPerformedByUserInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateWithoutPerformedByUserInputSchema) ]),
}).strict();

export const OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUpdateManyWithWhereWithoutPerformedByUserInput> = z.object({
  where: z.lazy(() => OrderHistoryScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderHistoryUpdateManyMutationInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutPerformedByUserInputSchema) ]),
}).strict();

export const OrderHistoryScalarWhereInputSchema: z.ZodType<Prisma.OrderHistoryScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderHistoryScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderHistoryScalarWhereInputSchema), z.lazy(() => OrderHistoryScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  action: z.union([ z.lazy(() => EnumOrderAuditActionFilterSchema), z.lazy(() => OrderAuditActionSchema) ]).optional(),
  performedByUserId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  auditData: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  timestamp: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  dinnerEventId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const UserCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateWithoutInhabitantInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  bookedOrders: z.lazy(() => OrderCreateNestedManyWithoutBookedByUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  bookedOrders: z.lazy(() => OrderUncheckedCreateNestedManyWithoutBookedByUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const HouseholdCreateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateWithoutInhabitantsInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  Invoice: z.lazy(() => InvoiceCreateNestedManyWithoutHouseHoldInputSchema).optional(),
}).strict();

export const HouseholdUncheckedCreateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUncheckedCreateWithoutInhabitantsInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  Invoice: z.lazy(() => InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema).optional(),
}).strict();

export const HouseholdCreateOrConnectWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateOrConnectWithoutInhabitantsInput> = z.object({
  where: z.lazy(() => HouseholdWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]),
}).strict();

export const AllergyCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateWithoutInhabitantInput> = z.object({
  inhabitantComment: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutAllergyInputSchema),
}).strict();

export const AllergyUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  inhabitantComment: z.string().optional().nullable(),
  allergyTypeId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AllergyCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.AllergyCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AllergyCreateManyInhabitantInputSchema), z.lazy(() => AllergyCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const DinnerEventCreateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutChefInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutChefInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventCreateOrConnectWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventCreateManyChefInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManyChefInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManyChefInputSchema), z.lazy(() => DinnerEventCreateManyChefInputSchema).array() ]),
}).strict();

export const OrderCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateWithoutInhabitantInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyInhabitantInputSchema), z.lazy(() => OrderCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutInhabitantInput> = z.object({
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutAssignmentsInputSchema),
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  cookingTeamId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const UserUpsertWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpsertWithoutInhabitantInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutInhabitantInputSchema), z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const UserUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpdateWithoutInhabitantInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  bookedOrders: z.lazy(() => OrderUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  bookedOrders: z.lazy(() => OrderUncheckedUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const HouseholdUpsertWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpsertWithoutInhabitantsInput> = z.object({
  update: z.union([ z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]),
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
}).strict();

export const HouseholdUpdateToOneWithWhereWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpdateToOneWithWhereWithoutInhabitantsInput> = z.object({
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]),
}).strict();

export const HouseholdUpdateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpdateWithoutInhabitantsInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  Invoice: z.lazy(() => InvoiceUpdateManyWithoutHouseHoldNestedInputSchema).optional(),
}).strict();

export const HouseholdUncheckedUpdateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateWithoutInhabitantsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  Invoice: z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema).optional(),
}).strict();

export const AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AllergyUpdateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateWithoutInhabitantInputSchema), z.lazy(() => AllergyUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateManyMutationInputSchema), z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutChefInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutChefInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema), z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventScalarWhereInputSchema: z.ZodType<Prisma.DinnerEventScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema), z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  state: z.union([ z.lazy(() => EnumDinnerStateFilterSchema), z.lazy(() => DinnerStateSchema) ]).optional(),
  totalCost: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  heynaboEventId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutInhabitantInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema), z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutInhabitantInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentScalarWhereInputSchema: z.ZodType<Prisma.CookingTeamAssignmentScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema), z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema), z.lazy(() => RoleSchema) ]).optional(),
  allocationPercentage: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const InhabitantCreateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutHouseholdInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutHouseholdInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantCreateManyHouseholdInputEnvelopeSchema: z.ZodType<Prisma.InhabitantCreateManyHouseholdInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => InhabitantCreateManyHouseholdInputSchema), z.lazy(() => InhabitantCreateManyHouseholdInputSchema).array() ]),
}).strict();

export const InvoiceCreateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateWithoutHouseHoldInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionCreateNestedManyWithoutInvoiceInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryCreateNestedOneWithoutInvoicesInputSchema).optional(),
}).strict();

export const InvoiceUncheckedCreateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateWithoutHouseHoldInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  billingPeriodSummaryId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema).optional(),
}).strict();

export const InvoiceCreateOrConnectWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateOrConnectWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceCreateManyHouseHoldInputEnvelopeSchema: z.ZodType<Prisma.InvoiceCreateManyHouseHoldInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => InvoiceCreateManyHouseHoldInputSchema), z.lazy(() => InvoiceCreateManyHouseHoldInputSchema).array() ]),
}).strict();

export const InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpsertWithWhereUniqueWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutHouseholdInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateWithWhereUniqueWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutHouseholdInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateManyWithWhereWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => InhabitantUpdateManyMutationInputSchema), z.lazy(() => InhabitantUncheckedUpdateManyWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantScalarWhereInputSchema: z.ZodType<Prisma.InhabitantScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema), z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema), z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  dinnerPreferences: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
}).strict();

export const InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpsertWithWhereUniqueWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => InvoiceUpdateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutHouseHoldInputSchema) ]),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateWithWhereUniqueWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateWithoutHouseHoldInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithWhereWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateManyMutationInputSchema), z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceScalarWhereInputSchema: z.ZodType<Prisma.InvoiceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema), z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  billingPeriod: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  pbsId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
}).strict();

export const InhabitantCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutDinnerEventInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutDinnersInput> = z.object({
  name: z.string(),
  affinity: z.string().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  assignments: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedCreateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutDinnersInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamCreateOrConnectWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutDinnersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]),
}).strict();

export const OrderCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateWithoutDinnerEventInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderCreateManyDinnerEventInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyDinnerEventInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyDinnerEventInputSchema), z.lazy(() => OrderCreateManyDinnerEventInputSchema).array() ]),
}).strict();

export const SeasonCreateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateWithoutDinnerEventsInput> = z.object({
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonUncheckedCreateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutDinnerEventsInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonCreateOrConnectWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutDinnerEventsInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]),
}).strict();

export const DinnerEventAllergenCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateWithoutDinnerEventInput> = z.object({
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutDinnerEventAllergensInputSchema),
}).strict();

export const DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedCreateWithoutDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  allergyTypeId: z.number().int(),
}).strict();

export const DinnerEventAllergenCreateOrConnectWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateOrConnectWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const DinnerEventAllergenCreateManyDinnerEventInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyDinnerEventInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenCreateManyDinnerEventInputSchema).array() ]),
}).strict();

export const InhabitantUpsertWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutDinnerEventInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutDinnerEventInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const CookingTeamUpsertWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutDinnersInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutDinnersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutDinnersInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedUpdateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutDinnersInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutDinnerEventInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutDinnerEventInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema), z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventInputSchema) ]),
}).strict();

export const SeasonUpsertWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutDinnerEventsInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
}).strict();

export const SeasonUpdateToOneWithWhereWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutDinnerEventsInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutDinnerEventsInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const SeasonUncheckedUpdateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutDinnerEventsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpsertWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateWithoutDinnerEventInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventAllergenCreateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventAllergenUpdateWithoutDinnerEventInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateWithoutDinnerEventInputSchema) ]),
}).strict();

export const DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyWithWhereWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => DinnerEventAllergenScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventAllergenUpdateManyMutationInputSchema), z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventInputSchema) ]),
}).strict();

export const DinnerEventCreateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutTicketsInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutTicketsInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventCreateOrConnectWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutTicketsInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]),
}).strict();

export const InhabitantCreateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutOrderInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutOrderInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutOrderInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const UserCreateWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserCreateWithoutBookedOrdersInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutBookedOrdersInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutPerformedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutBookedOrdersInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedCreateWithoutBookedOrdersInputSchema) ]),
}).strict();

export const TicketPriceCreateWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceCreateWithoutOrdersInput> = z.object({
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutTicketPricesInputSchema),
}).strict();

export const TicketPriceUncheckedCreateWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateWithoutOrdersInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
}).strict();

export const TicketPriceCreateOrConnectWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceCreateOrConnectWithoutOrdersInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutOrdersInputSchema) ]),
}).strict();

export const TransactionCreateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateWithoutOrderInput> = z.object({
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  invoice: z.lazy(() => InvoiceCreateNestedOneWithoutTransactionsInputSchema).optional(),
}).strict();

export const TransactionUncheckedCreateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateWithoutOrderInput> = z.object({
  id: z.number().int().optional(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable(),
}).strict();

export const TransactionCreateOrConnectWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateOrConnectWithoutOrderInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const OrderHistoryCreateWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryCreateWithoutOrderInput> = z.object({
  action: z.lazy(() => OrderAuditActionSchema),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
  performedByUser: z.lazy(() => UserCreateNestedOneWithoutOrderHistoryInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedCreateWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedCreateWithoutOrderInput> = z.object({
  id: z.number().int().optional(),
  action: z.lazy(() => OrderAuditActionSchema),
  performedByUserId: z.number().int().optional().nullable(),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderHistoryCreateOrConnectWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryCreateOrConnectWithoutOrderInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const OrderHistoryCreateManyOrderInputEnvelopeSchema: z.ZodType<Prisma.OrderHistoryCreateManyOrderInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderHistoryCreateManyOrderInputSchema), z.lazy(() => OrderHistoryCreateManyOrderInputSchema).array() ]),
}).strict();

export const DinnerEventUpsertWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithoutTicketsInput> = z.object({
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]),
  where: z.lazy(() => DinnerEventWhereInputSchema).optional(),
}).strict();

export const DinnerEventUpdateToOneWithWhereWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpdateToOneWithWhereWithoutTicketsInput> = z.object({
  where: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutTicketsInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutTicketsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const InhabitantUpsertWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutOrderInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutOrderInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutOrderInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutOrderInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutOrderInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const UserUpsertWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserUpsertWithoutBookedOrdersInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedUpdateWithoutBookedOrdersInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedCreateWithoutBookedOrdersInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutBookedOrdersInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutBookedOrdersInputSchema), z.lazy(() => UserUncheckedUpdateWithoutBookedOrdersInputSchema) ]),
}).strict();

export const UserUpdateWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserUpdateWithoutBookedOrdersInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUpdateOneWithoutUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutBookedOrdersInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutBookedOrdersInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutPerformedByUserNestedInputSchema).optional(),
}).strict();

export const TicketPriceUpsertWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceUpsertWithoutOrdersInput> = z.object({
  update: z.union([ z.lazy(() => TicketPriceUpdateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedUpdateWithoutOrdersInputSchema) ]),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutOrdersInputSchema) ]),
  where: z.lazy(() => TicketPriceWhereInputSchema).optional(),
}).strict();

export const TicketPriceUpdateToOneWithWhereWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceUpdateToOneWithWhereWithoutOrdersInput> = z.object({
  where: z.lazy(() => TicketPriceWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => TicketPriceUpdateWithoutOrdersInputSchema), z.lazy(() => TicketPriceUncheckedUpdateWithoutOrdersInputSchema) ]),
}).strict();

export const TicketPriceUpdateWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceUpdateWithoutOrdersInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutTicketPricesNestedInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedUpdateWithoutOrdersInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateWithoutOrdersInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionUpsertWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpsertWithoutOrderInput> = z.object({
  update: z.union([ z.lazy(() => TransactionUpdateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]),
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]),
  where: z.lazy(() => TransactionWhereInputSchema).optional(),
}).strict();

export const TransactionUpdateToOneWithWhereWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpdateToOneWithWhereWithoutOrderInput> = z.object({
  where: z.lazy(() => TransactionWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => TransactionUpdateWithoutOrderInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]),
}).strict();

export const TransactionUpdateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpdateWithoutOrderInput> = z.object({
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoice: z.lazy(() => InvoiceUpdateOneWithoutTransactionsNestedInputSchema).optional(),
}).strict();

export const TransactionUncheckedUpdateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateWithoutOrderInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryUpsertWithWhereUniqueWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUpsertWithWhereUniqueWithoutOrderInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderHistoryUpdateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateWithoutOrderInputSchema) ]),
  create: z.union([ z.lazy(() => OrderHistoryCreateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const OrderHistoryUpdateWithWhereUniqueWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUpdateWithWhereUniqueWithoutOrderInput> = z.object({
  where: z.lazy(() => OrderHistoryWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderHistoryUpdateWithoutOrderInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateWithoutOrderInputSchema) ]),
}).strict();

export const OrderHistoryUpdateManyWithWhereWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUpdateManyWithWhereWithoutOrderInput> = z.object({
  where: z.lazy(() => OrderHistoryScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderHistoryUpdateManyMutationInputSchema), z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderInputSchema) ]),
}).strict();

export const OrderCreateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateWithoutTransactionInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutTransactionInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutTransactionInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]),
}).strict();

export const InvoiceCreateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateWithoutTransactionsInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  pbsId: z.number().int(),
  address: z.string(),
  houseHold: z.lazy(() => HouseholdCreateNestedOneWithoutInvoiceInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryCreateNestedOneWithoutInvoicesInputSchema).optional(),
}).strict();

export const InvoiceUncheckedCreateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateWithoutTransactionsInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int().optional().nullable(),
  billingPeriodSummaryId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
}).strict();

export const InvoiceCreateOrConnectWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateOrConnectWithoutTransactionsInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]),
}).strict();

export const OrderUpsertWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpsertWithoutTransactionInput> = z.object({
  update: z.union([ z.lazy(() => OrderUpdateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]),
  where: z.lazy(() => OrderWhereInputSchema).optional(),
}).strict();

export const OrderUpdateToOneWithWhereWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpdateToOneWithWhereWithoutTransactionInput> = z.object({
  where: z.lazy(() => OrderWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrderUpdateWithoutTransactionInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]),
}).strict();

export const OrderUpdateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpdateWithoutTransactionInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutTransactionInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const InvoiceUpsertWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpsertWithoutTransactionsInput> = z.object({
  update: z.union([ z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]),
  where: z.lazy(() => InvoiceWhereInputSchema).optional(),
}).strict();

export const InvoiceUpdateToOneWithWhereWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpdateToOneWithWhereWithoutTransactionsInput> = z.object({
  where: z.lazy(() => InvoiceWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]),
}).strict();

export const InvoiceUpdateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpdateWithoutTransactionsInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  houseHold: z.lazy(() => HouseholdUpdateOneWithoutInvoiceNestedInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryUpdateOneWithoutInvoicesNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateWithoutTransactionsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  billingPeriodSummaryId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateWithoutInvoiceInput> = z.object({
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
  order: z.lazy(() => OrderCreateNestedOneWithoutTransactionInputSchema).optional(),
}).strict();

export const TransactionUncheckedCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateWithoutInvoiceInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const TransactionCreateOrConnectWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateOrConnectWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionCreateManyInvoiceInputEnvelopeSchema: z.ZodType<Prisma.TransactionCreateManyInvoiceInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TransactionCreateManyInvoiceInputSchema), z.lazy(() => TransactionCreateManyInvoiceInputSchema).array() ]),
}).strict();

export const HouseholdCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateWithoutInvoiceInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantCreateNestedManyWithoutHouseholdInputSchema).optional(),
}).strict();

export const HouseholdUncheckedCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUncheckedCreateWithoutInvoiceInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantUncheckedCreateNestedManyWithoutHouseholdInputSchema).optional(),
}).strict();

export const HouseholdCreateOrConnectWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateOrConnectWithoutInvoiceInput> = z.object({
  where: z.lazy(() => HouseholdWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const BillingPeriodSummaryCreateWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateWithoutInvoicesInput> = z.object({
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const BillingPeriodSummaryUncheckedCreateWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUncheckedCreateWithoutInvoicesInput> = z.object({
  id: z.number().int().optional(),
  billingPeriod: z.string(),
  shareToken: z.string(),
  totalAmount: z.number().int(),
  householdCount: z.number().int(),
  ticketCount: z.number().int(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const BillingPeriodSummaryCreateOrConnectWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateOrConnectWithoutInvoicesInput> = z.object({
  where: z.lazy(() => BillingPeriodSummaryWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => BillingPeriodSummaryCreateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedCreateWithoutInvoicesInputSchema) ]),
}).strict();

export const TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpsertWithWhereUniqueWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TransactionUpdateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutInvoiceInputSchema) ]),
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateWithWhereUniqueWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TransactionUpdateWithoutInvoiceInputSchema), z.lazy(() => TransactionUncheckedUpdateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionUpdateManyWithWhereWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateManyWithWhereWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TransactionUpdateManyMutationInputSchema), z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionScalarWhereInputSchema: z.ZodType<Prisma.TransactionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionScalarWhereInputSchema), z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionScalarWhereInputSchema), z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  orderSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userSnapshot: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userEmailHandle: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const HouseholdUpsertWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpsertWithoutInvoiceInput> = z.object({
  update: z.union([ z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]),
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
}).strict();

export const HouseholdUpdateToOneWithWhereWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpdateToOneWithWhereWithoutInvoiceInput> = z.object({
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema), z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]),
}).strict();

export const HouseholdUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpdateWithoutInvoiceInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUpdateManyWithoutHouseholdNestedInputSchema).optional(),
}).strict();

export const HouseholdUncheckedUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUncheckedUpdateManyWithoutHouseholdNestedInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryUpsertWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpsertWithoutInvoicesInput> = z.object({
  update: z.union([ z.lazy(() => BillingPeriodSummaryUpdateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedUpdateWithoutInvoicesInputSchema) ]),
  create: z.union([ z.lazy(() => BillingPeriodSummaryCreateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedCreateWithoutInvoicesInputSchema) ]),
  where: z.lazy(() => BillingPeriodSummaryWhereInputSchema).optional(),
}).strict();

export const BillingPeriodSummaryUpdateToOneWithWhereWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateToOneWithWhereWithoutInvoicesInput> = z.object({
  where: z.lazy(() => BillingPeriodSummaryWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => BillingPeriodSummaryUpdateWithoutInvoicesInputSchema), z.lazy(() => BillingPeriodSummaryUncheckedUpdateWithoutInvoicesInputSchema) ]),
}).strict();

export const BillingPeriodSummaryUpdateWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateWithoutInvoicesInput> = z.object({
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const BillingPeriodSummaryUncheckedUpdateWithoutInvoicesInputSchema: z.ZodType<Prisma.BillingPeriodSummaryUncheckedUpdateWithoutInvoicesInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  shareToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  totalAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketCount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InvoiceCreateWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceCreateWithoutBillingPeriodSummaryInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionCreateNestedManyWithoutInvoiceInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdCreateNestedOneWithoutInvoiceInputSchema).optional(),
}).strict();

export const InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateWithoutBillingPeriodSummaryInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
  transactions: z.lazy(() => TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema).optional(),
}).strict();

export const InvoiceCreateOrConnectWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceCreateOrConnectWithoutBillingPeriodSummaryInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema) ]),
}).strict();

export const InvoiceCreateManyBillingPeriodSummaryInputEnvelopeSchema: z.ZodType<Prisma.InvoiceCreateManyBillingPeriodSummaryInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceCreateManyBillingPeriodSummaryInputSchema).array() ]),
}).strict();

export const InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUpsertWithWhereUniqueWithoutBillingPeriodSummaryInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => InvoiceUpdateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutBillingPeriodSummaryInputSchema) ]),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedCreateWithoutBillingPeriodSummaryInputSchema) ]),
}).strict();

export const InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUpdateWithWhereUniqueWithoutBillingPeriodSummaryInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateWithoutBillingPeriodSummaryInputSchema), z.lazy(() => InvoiceUncheckedUpdateWithoutBillingPeriodSummaryInputSchema) ]),
}).strict();

export const InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithWhereWithoutBillingPeriodSummaryInput> = z.object({
  where: z.lazy(() => InvoiceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateManyMutationInputSchema), z.lazy(() => InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryInputSchema) ]),
}).strict();

export const SeasonCreateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateWithoutCookingTeamsInput> = z.object({
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonUncheckedCreateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutCookingTeamsInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonCreateOrConnectWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutCookingTeamsInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]),
}).strict();

export const DinnerEventCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutCookingTeamInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventCreateOrConnectWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventCreateManyCookingTeamInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManyCookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManyCookingTeamInputSchema), z.lazy(() => DinnerEventCreateManyCookingTeamInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutCookingTeamInput> = z.object({
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema),
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyCookingTeamInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyCookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentCreateManyCookingTeamInputSchema).array() ]),
}).strict();

export const SeasonUpsertWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutCookingTeamsInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
}).strict();

export const SeasonUpdateToOneWithWhereWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutCookingTeamsInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutCookingTeamsInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const SeasonUncheckedUpdateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutCookingTeamsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutCookingTeamInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema), z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutCookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutCookingTeamInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema), z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutAssignmentsInput> = z.object({
  name: z.string(),
  affinity: z.string().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedCreateWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutAssignmentsInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamCreateOrConnectWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutAssignmentsInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutAssignmentsInputSchema) ]),
}).strict();

export const InhabitantCreateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutCookingTeamAssignmentInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutCookingTeamAssignmentInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
}).strict();

export const InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutCookingTeamAssignmentInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]),
}).strict();

export const CookingTeamUpsertWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutAssignmentsInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutAssignmentsInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutAssignmentsInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutAssignmentsInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutAssignmentsInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutAssignmentsInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutAssignmentsInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedUpdateWithoutAssignmentsInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutAssignmentsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const InhabitantUpsertWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutCookingTeamAssignmentInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema), z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutCookingTeamAssignmentInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const CookingTeamCreateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutSeasonInput> = z.object({
  name: z.string(),
  affinity: z.string().optional().nullable(),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
}).strict();

export const CookingTeamCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamCreateManySeasonInputSchema), z.lazy(() => CookingTeamCreateManySeasonInputSchema).array() ]),
}).strict();

export const TicketPriceCreateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateWithoutSeasonInput> = z.object({
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
  orders: z.lazy(() => OrderCreateNestedManyWithoutTicketPriceInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
  orders: z.lazy(() => OrderUncheckedCreateNestedManyWithoutTicketPriceInputSchema).optional(),
}).strict();

export const TicketPriceCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.TicketPriceCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TicketPriceCreateManySeasonInputSchema), z.lazy(() => TicketPriceCreateManySeasonInputSchema).array() ]),
}).strict();

export const DinnerEventCreateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutSeasonInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional(),
}).strict();

export const DinnerEventCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManySeasonInputSchema), z.lazy(() => DinnerEventCreateManySeasonInputSchema).array() ]),
}).strict();

export const CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutSeasonInputSchema), z.lazy(() => CookingTeamUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamUpdateManyMutationInputSchema), z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamScalarWhereInputSchema: z.ZodType<Prisma.CookingTeamScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema), z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema), z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  affinity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
}).strict();

export const TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TicketPriceUpdateWithoutSeasonInputSchema), z.lazy(() => TicketPriceUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TicketPriceUpdateManyMutationInputSchema), z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceScalarWhereInputSchema: z.ZodType<Prisma.TicketPriceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema), z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema), z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema), z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutSeasonInputSchema), z.lazy(() => DinnerEventUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema), z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const SeasonCreateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateWithoutTicketPricesInput> = z.object({
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonUncheckedCreateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutTicketPricesInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  seasonDates: z.string(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  consecutiveCookingDays: z.number().int().optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
}).strict();

export const SeasonCreateOrConnectWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutTicketPricesInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]),
}).strict();

export const OrderCreateWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderCreateWithoutTicketPriceInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutTicketPriceInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedCreateNestedManyWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutTicketPriceInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema) ]),
}).strict();

export const OrderCreateManyTicketPriceInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyTicketPriceInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyTicketPriceInputSchema), z.lazy(() => OrderCreateManyTicketPriceInputSchema).array() ]),
}).strict();

export const SeasonUpsertWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutTicketPricesInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
}).strict();

export const SeasonUpdateToOneWithWhereWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutTicketPricesInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema), z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutTicketPricesInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const SeasonUncheckedUpdateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutTicketPricesInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonDates: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  consecutiveCookingDays: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
}).strict();

export const OrderUpsertWithWhereUniqueWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutTicketPriceInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutTicketPriceInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedCreateWithoutTicketPriceInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutTicketPriceInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutTicketPriceInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutTicketPriceInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutTicketPriceInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema), z.lazy(() => OrderUncheckedUpdateManyWithoutTicketPriceInputSchema) ]),
}).strict();

export const OrderCreateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderCreateWithoutOrderHistoryInput> = z.object({
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  bookedByUser: z.lazy(() => UserCreateNestedOneWithoutBookedOrdersInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceCreateNestedOneWithoutOrdersInputSchema).optional(),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional(),
}).strict();

export const OrderUncheckedCreateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutOrderHistoryInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional(),
}).strict();

export const OrderCreateOrConnectWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutOrderHistoryInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedCreateWithoutOrderHistoryInputSchema) ]),
}).strict();

export const UserCreateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserCreateWithoutOrderHistoryInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutUserInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderCreateNestedManyWithoutBookedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutOrderHistoryInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRoles: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUncheckedCreateNestedManyWithoutBookedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutOrderHistoryInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutOrderHistoryInputSchema) ]),
}).strict();

export const OrderUpsertWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderUpsertWithoutOrderHistoryInput> = z.object({
  update: z.union([ z.lazy(() => OrderUpdateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutOrderHistoryInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedCreateWithoutOrderHistoryInputSchema) ]),
  where: z.lazy(() => OrderWhereInputSchema).optional(),
}).strict();

export const OrderUpdateToOneWithWhereWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderUpdateToOneWithWhereWithoutOrderHistoryInput> = z.object({
  where: z.lazy(() => OrderWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrderUpdateWithoutOrderHistoryInputSchema), z.lazy(() => OrderUncheckedUpdateWithoutOrderHistoryInputSchema) ]),
}).strict();

export const OrderUpdateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderUpdateWithoutOrderHistoryInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutOrderHistoryInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
}).strict();

export const UserUpsertWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserUpsertWithoutOrderHistoryInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutOrderHistoryInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutOrderHistoryInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutOrderHistoryInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutOrderHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutOrderHistoryInputSchema) ]),
}).strict();

export const UserUpdateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserUpdateWithoutOrderHistoryInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUpdateOneWithoutUserNestedInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutOrderHistoryInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutOrderHistoryInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRoles: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  bookedOrders: z.lazy(() => OrderUncheckedUpdateManyWithoutBookedByUserNestedInputSchema).optional(),
}).strict();

export const AllergyCreateManyAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateManyAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  inhabitantComment: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const DinnerEventAllergenCreateManyAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
}).strict();

export const AllergyUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateWithoutAllergyTypeInput> = z.object({
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema).optional(),
}).strict();

export const AllergyUncheckedUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateWithoutAllergyTypeInput> = z.object({
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutAllergensNestedInputSchema).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateManyWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderCreateManyBookedByUserInputSchema: z.ZodType<Prisma.OrderCreateManyBookedByUserInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const OrderHistoryCreateManyPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryCreateManyPerformedByUserInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  action: z.lazy(() => OrderAuditActionSchema),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderUpdateWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUpdateWithoutBookedByUserInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutBookedByUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutBookedByUserInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutBookedByUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderHistoryUpdateWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUpdateWithoutPerformedByUserInput> = z.object({
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  order: z.lazy(() => OrderUpdateOneWithoutOrderHistoryNestedInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedUpdateWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateWithoutPerformedByUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryUncheckedUpdateManyWithoutPerformedByUserInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateManyWithoutPerformedByUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const AllergyCreateManyInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  inhabitantComment: z.string().optional().nullable(),
  allergyTypeId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const DinnerEventCreateManyChefInputSchema: z.ZodType<Prisma.DinnerEventCreateManyChefInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderCreateManyInhabitantInputSchema: z.ZodType<Prisma.OrderCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamAssignmentCreateManyInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  cookingTeamId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AllergyUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateWithoutInhabitantInput> = z.object({
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema).optional(),
}).strict();

export const AllergyUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantComment: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUpdateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutChefInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutChefInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutChefInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateWithoutInhabitantInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutInhabitantInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneRequiredWithoutAssignmentsNestedInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateManyHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateManyHouseholdInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  dinnerPreferences: z.string().optional().nullable(),
}).strict();

export const InvoiceCreateManyHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateManyHouseHoldInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  billingPeriodSummaryId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
}).strict();

export const InhabitantUpdateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutHouseholdInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutHouseholdInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
}).strict();

export const InhabitantUncheckedUpdateManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateManyWithoutHouseholdInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerPreferences: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InvoiceUpdateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateWithoutHouseHoldInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUpdateManyWithoutInvoiceNestedInputSchema).optional(),
  billingPeriodSummary: z.lazy(() => BillingPeriodSummaryUpdateOneWithoutInvoicesNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateWithoutHouseHoldInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriodSummaryId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutHouseHoldInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriodSummaryId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderCreateManyDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateManyDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  ticketPriceId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const DinnerEventAllergenCreateManyDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  allergyTypeId: z.number().int(),
}).strict();

export const OrderUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateWithoutDinnerEventInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  ticketPrice: z.lazy(() => TicketPriceUpdateOneWithoutOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  ticketPriceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateWithoutDinnerEventInput> = z.object({
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutDinnerEventAllergensNestedInputSchema).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderHistoryCreateManyOrderInputSchema: z.ZodType<Prisma.OrderHistoryCreateManyOrderInput> = z.object({
  id: z.number().int().optional(),
  action: z.lazy(() => OrderAuditActionSchema),
  performedByUserId: z.number().int().optional().nullable(),
  auditData: z.string(),
  timestamp: z.coerce.date().optional(),
  inhabitantId: z.number().int().optional().nullable(),
  dinnerEventId: z.number().int().optional().nullable(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const OrderHistoryUpdateWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUpdateWithoutOrderInput> = z.object({
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  performedByUser: z.lazy(() => UserUpdateOneWithoutOrderHistoryNestedInputSchema).optional(),
}).strict();

export const OrderHistoryUncheckedUpdateWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateWithoutOrderInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  performedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderHistoryUncheckedUpdateManyWithoutOrderInputSchema: z.ZodType<Prisma.OrderHistoryUncheckedUpdateManyWithoutOrderInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => OrderAuditActionSchema), z.lazy(() => EnumOrderAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  performedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  auditData: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  timestamp: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionCreateManyInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateManyInvoiceInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional().nullable(),
  orderSnapshot: z.string(),
  userSnapshot: z.string(),
  amount: z.number().int(),
  userEmailHandle: z.string(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const TransactionUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateWithoutInvoiceInput> = z.object({
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  order: z.lazy(() => OrderUpdateOneWithoutTransactionNestedInputSchema).optional(),
}).strict();

export const TransactionUncheckedUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orderSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userSnapshot: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userEmailHandle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InvoiceCreateManyBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceCreateManyBillingPeriodSummaryInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  billingPeriod: z.string(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int().optional().nullable(),
  pbsId: z.number().int(),
  address: z.string(),
}).strict();

export const InvoiceUpdateWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUpdateWithoutBillingPeriodSummaryInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUpdateManyWithoutInvoiceNestedInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdUpdateOneWithoutInvoiceNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateWithoutBillingPeriodSummaryInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutBillingPeriodSummaryInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  billingPeriod: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventCreateManyCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateManyCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
}).strict();

export const CookingTeamAssignmentCreateManyCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema),
  allocationPercentage: z.number().int().optional(),
  affinity: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const DinnerEventUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutCookingTeamInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutCookingTeamInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema), z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  allocationPercentage: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateManySeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  affinity: z.string().optional().nullable(),
}).strict();

export const TicketPriceCreateManySeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  maximumAgeLimit: z.number().int().optional().nullable(),
}).strict();

export const DinnerEventCreateManySeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  state: z.lazy(() => DinnerStateSchema).optional(),
  totalCost: z.number().int().optional(),
  heynaboEventId: z.number().int().optional().nullable(),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const CookingTeamUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutSeasonInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  assignments: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
}).strict();

export const CookingTeamUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  affinity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateWithoutSeasonInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orders: z.lazy(() => OrderUpdateManyWithoutTicketPriceNestedInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  orders: z.lazy(() => OrderUncheckedUpdateManyWithoutTicketPriceNestedInputSchema).optional(),
}).strict();

export const TicketPriceUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema), z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  maximumAgeLimit: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const DinnerEventUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutSeasonInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  allergens: z.lazy(() => DinnerEventAllergenUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  state: z.union([ z.lazy(() => DinnerStateSchema), z.lazy(() => EnumDinnerStateFieldUpdateOperationsInputSchema) ]).optional(),
  totalCost: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboEventId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderCreateManyTicketPriceInputSchema: z.ZodType<Prisma.OrderCreateManyTicketPriceInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  bookedByUserId: z.number().int().optional().nullable(),
  priceAtBooking: z.number().int(),
  dinnerMode: z.lazy(() => DinnerModeSchema).optional(),
  state: z.lazy(() => OrderStateSchema).optional(),
  isGuestTicket: z.boolean().optional(),
  releasedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const OrderUpdateWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUpdateWithoutTicketPriceInput> = z.object({
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  bookedByUser: z.lazy(() => UserUpdateOneWithoutBookedOrdersNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutTicketPriceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional(),
  orderHistory: z.lazy(() => OrderHistoryUncheckedUpdateManyWithoutOrderNestedInputSchema).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutTicketPriceInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutTicketPriceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  bookedByUserId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  priceAtBooking: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema), z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  state: z.union([ z.lazy(() => OrderStateSchema), z.lazy(() => EnumOrderStateFieldUpdateOperationsInputSchema) ]).optional(),
  isGuestTicket: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  releasedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  closedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const AllergyTypeFindFirstArgsSchema: z.ZodType<Prisma.AllergyTypeFindFirstArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(), AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema, AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyTypeFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AllergyTypeFindFirstOrThrowArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(), AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema, AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyTypeFindManyArgsSchema: z.ZodType<Prisma.AllergyTypeFindManyArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(), AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema, AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyTypeAggregateArgsSchema: z.ZodType<Prisma.AllergyTypeAggregateArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(), AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AllergyTypeGroupByArgsSchema: z.ZodType<Prisma.AllergyTypeGroupByArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyTypeOrderByWithAggregationInputSchema.array(), AllergyTypeOrderByWithAggregationInputSchema ]).optional(),
  by: AllergyTypeScalarFieldEnumSchema.array(), 
  having: AllergyTypeScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AllergyTypeFindUniqueArgsSchema: z.ZodType<Prisma.AllergyTypeFindUniqueArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema, 
}).strict();

export const AllergyTypeFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AllergyTypeFindUniqueOrThrowArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema, 
}).strict();

export const DinnerEventAllergenFindFirstArgsSchema: z.ZodType<Prisma.DinnerEventAllergenFindFirstArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventAllergenOrderByWithRelationInputSchema.array(), DinnerEventAllergenOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventAllergenWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventAllergenScalarFieldEnumSchema, DinnerEventAllergenScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventAllergenFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventAllergenFindFirstOrThrowArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventAllergenOrderByWithRelationInputSchema.array(), DinnerEventAllergenOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventAllergenWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventAllergenScalarFieldEnumSchema, DinnerEventAllergenScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventAllergenFindManyArgsSchema: z.ZodType<Prisma.DinnerEventAllergenFindManyArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventAllergenOrderByWithRelationInputSchema.array(), DinnerEventAllergenOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventAllergenWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventAllergenScalarFieldEnumSchema, DinnerEventAllergenScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventAllergenAggregateArgsSchema: z.ZodType<Prisma.DinnerEventAllergenAggregateArgs> = z.object({
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventAllergenOrderByWithRelationInputSchema.array(), DinnerEventAllergenOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventAllergenWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DinnerEventAllergenGroupByArgsSchema: z.ZodType<Prisma.DinnerEventAllergenGroupByArgs> = z.object({
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventAllergenOrderByWithAggregationInputSchema.array(), DinnerEventAllergenOrderByWithAggregationInputSchema ]).optional(),
  by: DinnerEventAllergenScalarFieldEnumSchema.array(), 
  having: DinnerEventAllergenScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DinnerEventAllergenFindUniqueArgsSchema: z.ZodType<Prisma.DinnerEventAllergenFindUniqueArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereUniqueInputSchema, 
}).strict();

export const DinnerEventAllergenFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventAllergenFindUniqueOrThrowArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereUniqueInputSchema, 
}).strict();

export const AllergyFindFirstArgsSchema: z.ZodType<Prisma.AllergyFindFirstArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(), AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema, AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AllergyFindFirstOrThrowArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(), AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema, AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyFindManyArgsSchema: z.ZodType<Prisma.AllergyFindManyArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(), AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema, AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AllergyAggregateArgsSchema: z.ZodType<Prisma.AllergyAggregateArgs> = z.object({
  where: AllergyWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(), AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AllergyGroupByArgsSchema: z.ZodType<Prisma.AllergyGroupByArgs> = z.object({
  where: AllergyWhereInputSchema.optional(), 
  orderBy: z.union([ AllergyOrderByWithAggregationInputSchema.array(), AllergyOrderByWithAggregationInputSchema ]).optional(),
  by: AllergyScalarFieldEnumSchema.array(), 
  having: AllergyScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AllergyFindUniqueArgsSchema: z.ZodType<Prisma.AllergyFindUniqueArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema, 
}).strict();

export const AllergyFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AllergyFindUniqueOrThrowArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema, 
}).strict();

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithAggregationInputSchema.array(), UserOrderByWithAggregationInputSchema ]).optional(),
  by: UserScalarFieldEnumSchema.array(), 
  having: UserScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const InhabitantFindFirstArgsSchema: z.ZodType<Prisma.InhabitantFindFirstArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(), 
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(), InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema, InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InhabitantFindFirstOrThrowArgsSchema: z.ZodType<Prisma.InhabitantFindFirstOrThrowArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(), 
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(), InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema, InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InhabitantFindManyArgsSchema: z.ZodType<Prisma.InhabitantFindManyArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(), 
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(), InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema, InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InhabitantAggregateArgsSchema: z.ZodType<Prisma.InhabitantAggregateArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(), 
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(), InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const InhabitantGroupByArgsSchema: z.ZodType<Prisma.InhabitantGroupByArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(), 
  orderBy: z.union([ InhabitantOrderByWithAggregationInputSchema.array(), InhabitantOrderByWithAggregationInputSchema ]).optional(),
  by: InhabitantScalarFieldEnumSchema.array(), 
  having: InhabitantScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const InhabitantFindUniqueArgsSchema: z.ZodType<Prisma.InhabitantFindUniqueArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema, 
}).strict();

export const InhabitantFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.InhabitantFindUniqueOrThrowArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema, 
}).strict();

export const HouseholdFindFirstArgsSchema: z.ZodType<Prisma.HouseholdFindFirstArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(), 
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(), HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema, HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const HouseholdFindFirstOrThrowArgsSchema: z.ZodType<Prisma.HouseholdFindFirstOrThrowArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(), 
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(), HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema, HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const HouseholdFindManyArgsSchema: z.ZodType<Prisma.HouseholdFindManyArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(), 
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(), HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema, HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const HouseholdAggregateArgsSchema: z.ZodType<Prisma.HouseholdAggregateArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(), 
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(), HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const HouseholdGroupByArgsSchema: z.ZodType<Prisma.HouseholdGroupByArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(), 
  orderBy: z.union([ HouseholdOrderByWithAggregationInputSchema.array(), HouseholdOrderByWithAggregationInputSchema ]).optional(),
  by: HouseholdScalarFieldEnumSchema.array(), 
  having: HouseholdScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const HouseholdFindUniqueArgsSchema: z.ZodType<Prisma.HouseholdFindUniqueArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema, 
}).strict();

export const HouseholdFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.HouseholdFindUniqueOrThrowArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema, 
}).strict();

export const DinnerEventFindFirstArgsSchema: z.ZodType<Prisma.DinnerEventFindFirstArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(), DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema, DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventFindFirstOrThrowArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(), DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema, DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventFindManyArgsSchema: z.ZodType<Prisma.DinnerEventFindManyArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(), DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema, DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DinnerEventAggregateArgsSchema: z.ZodType<Prisma.DinnerEventAggregateArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(), DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DinnerEventGroupByArgsSchema: z.ZodType<Prisma.DinnerEventGroupByArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(), 
  orderBy: z.union([ DinnerEventOrderByWithAggregationInputSchema.array(), DinnerEventOrderByWithAggregationInputSchema ]).optional(),
  by: DinnerEventScalarFieldEnumSchema.array(), 
  having: DinnerEventScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DinnerEventFindUniqueArgsSchema: z.ZodType<Prisma.DinnerEventFindUniqueArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema, 
}).strict();

export const DinnerEventFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventFindUniqueOrThrowArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema, 
}).strict();

export const OrderFindFirstArgsSchema: z.ZodType<Prisma.OrderFindFirstArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(), 
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(), OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema, OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderFindFirstOrThrowArgsSchema: z.ZodType<Prisma.OrderFindFirstOrThrowArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(), 
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(), OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema, OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderFindManyArgsSchema: z.ZodType<Prisma.OrderFindManyArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(), 
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(), OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema, OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderAggregateArgsSchema: z.ZodType<Prisma.OrderAggregateArgs> = z.object({
  where: OrderWhereInputSchema.optional(), 
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(), OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const OrderGroupByArgsSchema: z.ZodType<Prisma.OrderGroupByArgs> = z.object({
  where: OrderWhereInputSchema.optional(), 
  orderBy: z.union([ OrderOrderByWithAggregationInputSchema.array(), OrderOrderByWithAggregationInputSchema ]).optional(),
  by: OrderScalarFieldEnumSchema.array(), 
  having: OrderScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const OrderFindUniqueArgsSchema: z.ZodType<Prisma.OrderFindUniqueArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema, 
}).strict();

export const OrderFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.OrderFindUniqueOrThrowArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema, 
}).strict();

export const TransactionFindFirstArgsSchema: z.ZodType<Prisma.TransactionFindFirstArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(), 
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(), TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema, TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TransactionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TransactionFindFirstOrThrowArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(), 
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(), TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema, TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TransactionFindManyArgsSchema: z.ZodType<Prisma.TransactionFindManyArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(), 
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(), TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema, TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TransactionAggregateArgsSchema: z.ZodType<Prisma.TransactionAggregateArgs> = z.object({
  where: TransactionWhereInputSchema.optional(), 
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(), TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const TransactionGroupByArgsSchema: z.ZodType<Prisma.TransactionGroupByArgs> = z.object({
  where: TransactionWhereInputSchema.optional(), 
  orderBy: z.union([ TransactionOrderByWithAggregationInputSchema.array(), TransactionOrderByWithAggregationInputSchema ]).optional(),
  by: TransactionScalarFieldEnumSchema.array(), 
  having: TransactionScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const TransactionFindUniqueArgsSchema: z.ZodType<Prisma.TransactionFindUniqueArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema, 
}).strict();

export const TransactionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TransactionFindUniqueOrThrowArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema, 
}).strict();

export const InvoiceFindFirstArgsSchema: z.ZodType<Prisma.InvoiceFindFirstArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(), 
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(), InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema, InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InvoiceFindFirstOrThrowArgsSchema: z.ZodType<Prisma.InvoiceFindFirstOrThrowArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(), 
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(), InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema, InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InvoiceFindManyArgsSchema: z.ZodType<Prisma.InvoiceFindManyArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(), 
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(), InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema, InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const InvoiceAggregateArgsSchema: z.ZodType<Prisma.InvoiceAggregateArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(), 
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(), InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const InvoiceGroupByArgsSchema: z.ZodType<Prisma.InvoiceGroupByArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(), 
  orderBy: z.union([ InvoiceOrderByWithAggregationInputSchema.array(), InvoiceOrderByWithAggregationInputSchema ]).optional(),
  by: InvoiceScalarFieldEnumSchema.array(), 
  having: InvoiceScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const InvoiceFindUniqueArgsSchema: z.ZodType<Prisma.InvoiceFindUniqueArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema, 
}).strict();

export const InvoiceFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.InvoiceFindUniqueOrThrowArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema, 
}).strict();

export const BillingPeriodSummaryFindFirstArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryFindFirstArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  orderBy: z.union([ BillingPeriodSummaryOrderByWithRelationInputSchema.array(), BillingPeriodSummaryOrderByWithRelationInputSchema ]).optional(),
  cursor: BillingPeriodSummaryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ BillingPeriodSummaryScalarFieldEnumSchema, BillingPeriodSummaryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const BillingPeriodSummaryFindFirstOrThrowArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryFindFirstOrThrowArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  orderBy: z.union([ BillingPeriodSummaryOrderByWithRelationInputSchema.array(), BillingPeriodSummaryOrderByWithRelationInputSchema ]).optional(),
  cursor: BillingPeriodSummaryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ BillingPeriodSummaryScalarFieldEnumSchema, BillingPeriodSummaryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const BillingPeriodSummaryFindManyArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryFindManyArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  orderBy: z.union([ BillingPeriodSummaryOrderByWithRelationInputSchema.array(), BillingPeriodSummaryOrderByWithRelationInputSchema ]).optional(),
  cursor: BillingPeriodSummaryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ BillingPeriodSummaryScalarFieldEnumSchema, BillingPeriodSummaryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const BillingPeriodSummaryAggregateArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryAggregateArgs> = z.object({
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  orderBy: z.union([ BillingPeriodSummaryOrderByWithRelationInputSchema.array(), BillingPeriodSummaryOrderByWithRelationInputSchema ]).optional(),
  cursor: BillingPeriodSummaryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const BillingPeriodSummaryGroupByArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryGroupByArgs> = z.object({
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  orderBy: z.union([ BillingPeriodSummaryOrderByWithAggregationInputSchema.array(), BillingPeriodSummaryOrderByWithAggregationInputSchema ]).optional(),
  by: BillingPeriodSummaryScalarFieldEnumSchema.array(), 
  having: BillingPeriodSummaryScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const BillingPeriodSummaryFindUniqueArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryFindUniqueArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereUniqueInputSchema, 
}).strict();

export const BillingPeriodSummaryFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryFindUniqueOrThrowArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereUniqueInputSchema, 
}).strict();

export const CookingTeamFindFirstArgsSchema: z.ZodType<Prisma.CookingTeamFindFirstArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(), CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema, CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamFindFirstOrThrowArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(), CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema, CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamFindManyArgsSchema: z.ZodType<Prisma.CookingTeamFindManyArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(), CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema, CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamAggregateArgsSchema: z.ZodType<Prisma.CookingTeamAggregateArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(), CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const CookingTeamGroupByArgsSchema: z.ZodType<Prisma.CookingTeamGroupByArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamOrderByWithAggregationInputSchema.array(), CookingTeamOrderByWithAggregationInputSchema ]).optional(),
  by: CookingTeamScalarFieldEnumSchema.array(), 
  having: CookingTeamScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const CookingTeamFindUniqueArgsSchema: z.ZodType<Prisma.CookingTeamFindUniqueArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema, 
}).strict();

export const CookingTeamFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamFindUniqueOrThrowArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema, 
}).strict();

export const CookingTeamAssignmentFindFirstArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindFirstArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(), CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema, CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamAssignmentFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindFirstOrThrowArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(), CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema, CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamAssignmentFindManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindManyArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(), CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema, CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const CookingTeamAssignmentAggregateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentAggregateArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(), CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const CookingTeamAssignmentGroupByArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentGroupByArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  orderBy: z.union([ CookingTeamAssignmentOrderByWithAggregationInputSchema.array(), CookingTeamAssignmentOrderByWithAggregationInputSchema ]).optional(),
  by: CookingTeamAssignmentScalarFieldEnumSchema.array(), 
  having: CookingTeamAssignmentScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const CookingTeamAssignmentFindUniqueArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindUniqueArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema, 
}).strict();

export const CookingTeamAssignmentFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindUniqueOrThrowArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema, 
}).strict();

export const SeasonFindFirstArgsSchema: z.ZodType<Prisma.SeasonFindFirstArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(), 
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(), SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema, SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SeasonFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SeasonFindFirstOrThrowArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(), 
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(), SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema, SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SeasonFindManyArgsSchema: z.ZodType<Prisma.SeasonFindManyArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(), 
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(), SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema, SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SeasonAggregateArgsSchema: z.ZodType<Prisma.SeasonAggregateArgs> = z.object({
  where: SeasonWhereInputSchema.optional(), 
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(), SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SeasonGroupByArgsSchema: z.ZodType<Prisma.SeasonGroupByArgs> = z.object({
  where: SeasonWhereInputSchema.optional(), 
  orderBy: z.union([ SeasonOrderByWithAggregationInputSchema.array(), SeasonOrderByWithAggregationInputSchema ]).optional(),
  by: SeasonScalarFieldEnumSchema.array(), 
  having: SeasonScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SeasonFindUniqueArgsSchema: z.ZodType<Prisma.SeasonFindUniqueArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema, 
}).strict();

export const SeasonFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SeasonFindUniqueOrThrowArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema, 
}).strict();

export const TicketPriceFindFirstArgsSchema: z.ZodType<Prisma.TicketPriceFindFirstArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(), 
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(), TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema, TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TicketPriceFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TicketPriceFindFirstOrThrowArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(), 
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(), TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema, TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TicketPriceFindManyArgsSchema: z.ZodType<Prisma.TicketPriceFindManyArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(), 
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(), TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema, TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const TicketPriceAggregateArgsSchema: z.ZodType<Prisma.TicketPriceAggregateArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(), 
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(), TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const TicketPriceGroupByArgsSchema: z.ZodType<Prisma.TicketPriceGroupByArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(), 
  orderBy: z.union([ TicketPriceOrderByWithAggregationInputSchema.array(), TicketPriceOrderByWithAggregationInputSchema ]).optional(),
  by: TicketPriceScalarFieldEnumSchema.array(), 
  having: TicketPriceScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const TicketPriceFindUniqueArgsSchema: z.ZodType<Prisma.TicketPriceFindUniqueArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema, 
}).strict();

export const TicketPriceFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TicketPriceFindUniqueOrThrowArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema, 
}).strict();

export const OrderHistoryFindFirstArgsSchema: z.ZodType<Prisma.OrderHistoryFindFirstArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ OrderHistoryOrderByWithRelationInputSchema.array(), OrderHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderHistoryScalarFieldEnumSchema, OrderHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderHistoryFindFirstOrThrowArgsSchema: z.ZodType<Prisma.OrderHistoryFindFirstOrThrowArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ OrderHistoryOrderByWithRelationInputSchema.array(), OrderHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderHistoryScalarFieldEnumSchema, OrderHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderHistoryFindManyArgsSchema: z.ZodType<Prisma.OrderHistoryFindManyArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ OrderHistoryOrderByWithRelationInputSchema.array(), OrderHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderHistoryScalarFieldEnumSchema, OrderHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const OrderHistoryAggregateArgsSchema: z.ZodType<Prisma.OrderHistoryAggregateArgs> = z.object({
  where: OrderHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ OrderHistoryOrderByWithRelationInputSchema.array(), OrderHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const OrderHistoryGroupByArgsSchema: z.ZodType<Prisma.OrderHistoryGroupByArgs> = z.object({
  where: OrderHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ OrderHistoryOrderByWithAggregationInputSchema.array(), OrderHistoryOrderByWithAggregationInputSchema ]).optional(),
  by: OrderHistoryScalarFieldEnumSchema.array(), 
  having: OrderHistoryScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const OrderHistoryFindUniqueArgsSchema: z.ZodType<Prisma.OrderHistoryFindUniqueArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereUniqueInputSchema, 
}).strict();

export const OrderHistoryFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.OrderHistoryFindUniqueOrThrowArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereUniqueInputSchema, 
}).strict();

export const JobRunFindFirstArgsSchema: z.ZodType<Prisma.JobRunFindFirstArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereInputSchema.optional(), 
  orderBy: z.union([ JobRunOrderByWithRelationInputSchema.array(), JobRunOrderByWithRelationInputSchema ]).optional(),
  cursor: JobRunWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ JobRunScalarFieldEnumSchema, JobRunScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const JobRunFindFirstOrThrowArgsSchema: z.ZodType<Prisma.JobRunFindFirstOrThrowArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereInputSchema.optional(), 
  orderBy: z.union([ JobRunOrderByWithRelationInputSchema.array(), JobRunOrderByWithRelationInputSchema ]).optional(),
  cursor: JobRunWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ JobRunScalarFieldEnumSchema, JobRunScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const JobRunFindManyArgsSchema: z.ZodType<Prisma.JobRunFindManyArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereInputSchema.optional(), 
  orderBy: z.union([ JobRunOrderByWithRelationInputSchema.array(), JobRunOrderByWithRelationInputSchema ]).optional(),
  cursor: JobRunWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ JobRunScalarFieldEnumSchema, JobRunScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const JobRunAggregateArgsSchema: z.ZodType<Prisma.JobRunAggregateArgs> = z.object({
  where: JobRunWhereInputSchema.optional(), 
  orderBy: z.union([ JobRunOrderByWithRelationInputSchema.array(), JobRunOrderByWithRelationInputSchema ]).optional(),
  cursor: JobRunWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const JobRunGroupByArgsSchema: z.ZodType<Prisma.JobRunGroupByArgs> = z.object({
  where: JobRunWhereInputSchema.optional(), 
  orderBy: z.union([ JobRunOrderByWithAggregationInputSchema.array(), JobRunOrderByWithAggregationInputSchema ]).optional(),
  by: JobRunScalarFieldEnumSchema.array(), 
  having: JobRunScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const JobRunFindUniqueArgsSchema: z.ZodType<Prisma.JobRunFindUniqueArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereUniqueInputSchema, 
}).strict();

export const JobRunFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.JobRunFindUniqueOrThrowArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereUniqueInputSchema, 
}).strict();

export const AllergyTypeCreateArgsSchema: z.ZodType<Prisma.AllergyTypeCreateArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  data: z.union([ AllergyTypeCreateInputSchema, AllergyTypeUncheckedCreateInputSchema ]),
}).strict();

export const AllergyTypeUpsertArgsSchema: z.ZodType<Prisma.AllergyTypeUpsertArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema, 
  create: z.union([ AllergyTypeCreateInputSchema, AllergyTypeUncheckedCreateInputSchema ]),
  update: z.union([ AllergyTypeUpdateInputSchema, AllergyTypeUncheckedUpdateInputSchema ]),
}).strict();

export const AllergyTypeCreateManyArgsSchema: z.ZodType<Prisma.AllergyTypeCreateManyArgs> = z.object({
  data: z.union([ AllergyTypeCreateManyInputSchema, AllergyTypeCreateManyInputSchema.array() ]),
}).strict();

export const AllergyTypeCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyTypeCreateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyTypeCreateManyInputSchema, AllergyTypeCreateManyInputSchema.array() ]),
}).strict();

export const AllergyTypeDeleteArgsSchema: z.ZodType<Prisma.AllergyTypeDeleteArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema, 
}).strict();

export const AllergyTypeUpdateArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  data: z.union([ AllergyTypeUpdateInputSchema, AllergyTypeUncheckedUpdateInputSchema ]),
  where: AllergyTypeWhereUniqueInputSchema, 
}).strict();

export const AllergyTypeUpdateManyArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateManyArgs> = z.object({
  data: z.union([ AllergyTypeUpdateManyMutationInputSchema, AllergyTypeUncheckedUpdateManyInputSchema ]),
  where: AllergyTypeWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AllergyTypeUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyTypeUpdateManyMutationInputSchema, AllergyTypeUncheckedUpdateManyInputSchema ]),
  where: AllergyTypeWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AllergyTypeDeleteManyArgsSchema: z.ZodType<Prisma.AllergyTypeDeleteManyArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventAllergenCreateArgsSchema: z.ZodType<Prisma.DinnerEventAllergenCreateArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  data: z.union([ DinnerEventAllergenCreateInputSchema, DinnerEventAllergenUncheckedCreateInputSchema ]),
}).strict();

export const DinnerEventAllergenUpsertArgsSchema: z.ZodType<Prisma.DinnerEventAllergenUpsertArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereUniqueInputSchema, 
  create: z.union([ DinnerEventAllergenCreateInputSchema, DinnerEventAllergenUncheckedCreateInputSchema ]),
  update: z.union([ DinnerEventAllergenUpdateInputSchema, DinnerEventAllergenUncheckedUpdateInputSchema ]),
}).strict();

export const DinnerEventAllergenCreateManyArgsSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyArgs> = z.object({
  data: z.union([ DinnerEventAllergenCreateManyInputSchema, DinnerEventAllergenCreateManyInputSchema.array() ]),
}).strict();

export const DinnerEventAllergenCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventAllergenCreateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventAllergenCreateManyInputSchema, DinnerEventAllergenCreateManyInputSchema.array() ]),
}).strict();

export const DinnerEventAllergenDeleteArgsSchema: z.ZodType<Prisma.DinnerEventAllergenDeleteArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  where: DinnerEventAllergenWhereUniqueInputSchema, 
}).strict();

export const DinnerEventAllergenUpdateArgsSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateArgs> = z.object({
  select: DinnerEventAllergenSelectSchema.optional(),
  include: DinnerEventAllergenIncludeSchema.optional(),
  data: z.union([ DinnerEventAllergenUpdateInputSchema, DinnerEventAllergenUncheckedUpdateInputSchema ]),
  where: DinnerEventAllergenWhereUniqueInputSchema, 
}).strict();

export const DinnerEventAllergenUpdateManyArgsSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyArgs> = z.object({
  data: z.union([ DinnerEventAllergenUpdateManyMutationInputSchema, DinnerEventAllergenUncheckedUpdateManyInputSchema ]),
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventAllergenUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventAllergenUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventAllergenUpdateManyMutationInputSchema, DinnerEventAllergenUncheckedUpdateManyInputSchema ]),
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventAllergenDeleteManyArgsSchema: z.ZodType<Prisma.DinnerEventAllergenDeleteManyArgs> = z.object({
  where: DinnerEventAllergenWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AllergyCreateArgsSchema: z.ZodType<Prisma.AllergyCreateArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  data: z.union([ AllergyCreateInputSchema, AllergyUncheckedCreateInputSchema ]),
}).strict();

export const AllergyUpsertArgsSchema: z.ZodType<Prisma.AllergyUpsertArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema, 
  create: z.union([ AllergyCreateInputSchema, AllergyUncheckedCreateInputSchema ]),
  update: z.union([ AllergyUpdateInputSchema, AllergyUncheckedUpdateInputSchema ]),
}).strict();

export const AllergyCreateManyArgsSchema: z.ZodType<Prisma.AllergyCreateManyArgs> = z.object({
  data: z.union([ AllergyCreateManyInputSchema, AllergyCreateManyInputSchema.array() ]),
}).strict();

export const AllergyCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyCreateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyCreateManyInputSchema, AllergyCreateManyInputSchema.array() ]),
}).strict();

export const AllergyDeleteArgsSchema: z.ZodType<Prisma.AllergyDeleteArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema, 
}).strict();

export const AllergyUpdateArgsSchema: z.ZodType<Prisma.AllergyUpdateArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  data: z.union([ AllergyUpdateInputSchema, AllergyUncheckedUpdateInputSchema ]),
  where: AllergyWhereUniqueInputSchema, 
}).strict();

export const AllergyUpdateManyArgsSchema: z.ZodType<Prisma.AllergyUpdateManyArgs> = z.object({
  data: z.union([ AllergyUpdateManyMutationInputSchema, AllergyUncheckedUpdateManyInputSchema ]),
  where: AllergyWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AllergyUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyUpdateManyMutationInputSchema, AllergyUncheckedUpdateManyInputSchema ]),
  where: AllergyWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AllergyDeleteManyArgsSchema: z.ZodType<Prisma.AllergyDeleteManyArgs> = z.object({
  where: AllergyWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserCreateInputSchema, UserUncheckedCreateInputSchema ]),
}).strict();

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
  create: z.union([ UserCreateInputSchema, UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema, UserUncheckedUpdateInputSchema ]),
}).strict();

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema, UserCreateManyInputSchema.array() ]),
}).strict();

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema, UserCreateManyInputSchema.array() ]),
}).strict();

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserUpdateInputSchema, UserUncheckedUpdateInputSchema ]),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema, UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema, UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InhabitantCreateArgsSchema: z.ZodType<Prisma.InhabitantCreateArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  data: z.union([ InhabitantCreateInputSchema, InhabitantUncheckedCreateInputSchema ]),
}).strict();

export const InhabitantUpsertArgsSchema: z.ZodType<Prisma.InhabitantUpsertArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema, 
  create: z.union([ InhabitantCreateInputSchema, InhabitantUncheckedCreateInputSchema ]),
  update: z.union([ InhabitantUpdateInputSchema, InhabitantUncheckedUpdateInputSchema ]),
}).strict();

export const InhabitantCreateManyArgsSchema: z.ZodType<Prisma.InhabitantCreateManyArgs> = z.object({
  data: z.union([ InhabitantCreateManyInputSchema, InhabitantCreateManyInputSchema.array() ]),
}).strict();

export const InhabitantCreateManyAndReturnArgsSchema: z.ZodType<Prisma.InhabitantCreateManyAndReturnArgs> = z.object({
  data: z.union([ InhabitantCreateManyInputSchema, InhabitantCreateManyInputSchema.array() ]),
}).strict();

export const InhabitantDeleteArgsSchema: z.ZodType<Prisma.InhabitantDeleteArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema, 
}).strict();

export const InhabitantUpdateArgsSchema: z.ZodType<Prisma.InhabitantUpdateArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  data: z.union([ InhabitantUpdateInputSchema, InhabitantUncheckedUpdateInputSchema ]),
  where: InhabitantWhereUniqueInputSchema, 
}).strict();

export const InhabitantUpdateManyArgsSchema: z.ZodType<Prisma.InhabitantUpdateManyArgs> = z.object({
  data: z.union([ InhabitantUpdateManyMutationInputSchema, InhabitantUncheckedUpdateManyInputSchema ]),
  where: InhabitantWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InhabitantUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.InhabitantUpdateManyAndReturnArgs> = z.object({
  data: z.union([ InhabitantUpdateManyMutationInputSchema, InhabitantUncheckedUpdateManyInputSchema ]),
  where: InhabitantWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InhabitantDeleteManyArgsSchema: z.ZodType<Prisma.InhabitantDeleteManyArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const HouseholdCreateArgsSchema: z.ZodType<Prisma.HouseholdCreateArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  data: z.union([ HouseholdCreateInputSchema, HouseholdUncheckedCreateInputSchema ]),
}).strict();

export const HouseholdUpsertArgsSchema: z.ZodType<Prisma.HouseholdUpsertArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema, 
  create: z.union([ HouseholdCreateInputSchema, HouseholdUncheckedCreateInputSchema ]),
  update: z.union([ HouseholdUpdateInputSchema, HouseholdUncheckedUpdateInputSchema ]),
}).strict();

export const HouseholdCreateManyArgsSchema: z.ZodType<Prisma.HouseholdCreateManyArgs> = z.object({
  data: z.union([ HouseholdCreateManyInputSchema, HouseholdCreateManyInputSchema.array() ]),
}).strict();

export const HouseholdCreateManyAndReturnArgsSchema: z.ZodType<Prisma.HouseholdCreateManyAndReturnArgs> = z.object({
  data: z.union([ HouseholdCreateManyInputSchema, HouseholdCreateManyInputSchema.array() ]),
}).strict();

export const HouseholdDeleteArgsSchema: z.ZodType<Prisma.HouseholdDeleteArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema, 
}).strict();

export const HouseholdUpdateArgsSchema: z.ZodType<Prisma.HouseholdUpdateArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  data: z.union([ HouseholdUpdateInputSchema, HouseholdUncheckedUpdateInputSchema ]),
  where: HouseholdWhereUniqueInputSchema, 
}).strict();

export const HouseholdUpdateManyArgsSchema: z.ZodType<Prisma.HouseholdUpdateManyArgs> = z.object({
  data: z.union([ HouseholdUpdateManyMutationInputSchema, HouseholdUncheckedUpdateManyInputSchema ]),
  where: HouseholdWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const HouseholdUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.HouseholdUpdateManyAndReturnArgs> = z.object({
  data: z.union([ HouseholdUpdateManyMutationInputSchema, HouseholdUncheckedUpdateManyInputSchema ]),
  where: HouseholdWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const HouseholdDeleteManyArgsSchema: z.ZodType<Prisma.HouseholdDeleteManyArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventCreateArgsSchema: z.ZodType<Prisma.DinnerEventCreateArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  data: z.union([ DinnerEventCreateInputSchema, DinnerEventUncheckedCreateInputSchema ]),
}).strict();

export const DinnerEventUpsertArgsSchema: z.ZodType<Prisma.DinnerEventUpsertArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema, 
  create: z.union([ DinnerEventCreateInputSchema, DinnerEventUncheckedCreateInputSchema ]),
  update: z.union([ DinnerEventUpdateInputSchema, DinnerEventUncheckedUpdateInputSchema ]),
}).strict();

export const DinnerEventCreateManyArgsSchema: z.ZodType<Prisma.DinnerEventCreateManyArgs> = z.object({
  data: z.union([ DinnerEventCreateManyInputSchema, DinnerEventCreateManyInputSchema.array() ]),
}).strict();

export const DinnerEventCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventCreateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventCreateManyInputSchema, DinnerEventCreateManyInputSchema.array() ]),
}).strict();

export const DinnerEventDeleteArgsSchema: z.ZodType<Prisma.DinnerEventDeleteArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema, 
}).strict();

export const DinnerEventUpdateArgsSchema: z.ZodType<Prisma.DinnerEventUpdateArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  data: z.union([ DinnerEventUpdateInputSchema, DinnerEventUncheckedUpdateInputSchema ]),
  where: DinnerEventWhereUniqueInputSchema, 
}).strict();

export const DinnerEventUpdateManyArgsSchema: z.ZodType<Prisma.DinnerEventUpdateManyArgs> = z.object({
  data: z.union([ DinnerEventUpdateManyMutationInputSchema, DinnerEventUncheckedUpdateManyInputSchema ]),
  where: DinnerEventWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventUpdateManyMutationInputSchema, DinnerEventUncheckedUpdateManyInputSchema ]),
  where: DinnerEventWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DinnerEventDeleteManyArgsSchema: z.ZodType<Prisma.DinnerEventDeleteManyArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderCreateArgsSchema: z.ZodType<Prisma.OrderCreateArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  data: z.union([ OrderCreateInputSchema, OrderUncheckedCreateInputSchema ]),
}).strict();

export const OrderUpsertArgsSchema: z.ZodType<Prisma.OrderUpsertArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema, 
  create: z.union([ OrderCreateInputSchema, OrderUncheckedCreateInputSchema ]),
  update: z.union([ OrderUpdateInputSchema, OrderUncheckedUpdateInputSchema ]),
}).strict();

export const OrderCreateManyArgsSchema: z.ZodType<Prisma.OrderCreateManyArgs> = z.object({
  data: z.union([ OrderCreateManyInputSchema, OrderCreateManyInputSchema.array() ]),
}).strict();

export const OrderCreateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderCreateManyAndReturnArgs> = z.object({
  data: z.union([ OrderCreateManyInputSchema, OrderCreateManyInputSchema.array() ]),
}).strict();

export const OrderDeleteArgsSchema: z.ZodType<Prisma.OrderDeleteArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema, 
}).strict();

export const OrderUpdateArgsSchema: z.ZodType<Prisma.OrderUpdateArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  data: z.union([ OrderUpdateInputSchema, OrderUncheckedUpdateInputSchema ]),
  where: OrderWhereUniqueInputSchema, 
}).strict();

export const OrderUpdateManyArgsSchema: z.ZodType<Prisma.OrderUpdateManyArgs> = z.object({
  data: z.union([ OrderUpdateManyMutationInputSchema, OrderUncheckedUpdateManyInputSchema ]),
  where: OrderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderUpdateManyAndReturnArgs> = z.object({
  data: z.union([ OrderUpdateManyMutationInputSchema, OrderUncheckedUpdateManyInputSchema ]),
  where: OrderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderDeleteManyArgsSchema: z.ZodType<Prisma.OrderDeleteManyArgs> = z.object({
  where: OrderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TransactionCreateArgsSchema: z.ZodType<Prisma.TransactionCreateArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  data: z.union([ TransactionCreateInputSchema, TransactionUncheckedCreateInputSchema ]),
}).strict();

export const TransactionUpsertArgsSchema: z.ZodType<Prisma.TransactionUpsertArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema, 
  create: z.union([ TransactionCreateInputSchema, TransactionUncheckedCreateInputSchema ]),
  update: z.union([ TransactionUpdateInputSchema, TransactionUncheckedUpdateInputSchema ]),
}).strict();

export const TransactionCreateManyArgsSchema: z.ZodType<Prisma.TransactionCreateManyArgs> = z.object({
  data: z.union([ TransactionCreateManyInputSchema, TransactionCreateManyInputSchema.array() ]),
}).strict();

export const TransactionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TransactionCreateManyAndReturnArgs> = z.object({
  data: z.union([ TransactionCreateManyInputSchema, TransactionCreateManyInputSchema.array() ]),
}).strict();

export const TransactionDeleteArgsSchema: z.ZodType<Prisma.TransactionDeleteArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema, 
}).strict();

export const TransactionUpdateArgsSchema: z.ZodType<Prisma.TransactionUpdateArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  data: z.union([ TransactionUpdateInputSchema, TransactionUncheckedUpdateInputSchema ]),
  where: TransactionWhereUniqueInputSchema, 
}).strict();

export const TransactionUpdateManyArgsSchema: z.ZodType<Prisma.TransactionUpdateManyArgs> = z.object({
  data: z.union([ TransactionUpdateManyMutationInputSchema, TransactionUncheckedUpdateManyInputSchema ]),
  where: TransactionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TransactionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TransactionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TransactionUpdateManyMutationInputSchema, TransactionUncheckedUpdateManyInputSchema ]),
  where: TransactionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TransactionDeleteManyArgsSchema: z.ZodType<Prisma.TransactionDeleteManyArgs> = z.object({
  where: TransactionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InvoiceCreateArgsSchema: z.ZodType<Prisma.InvoiceCreateArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  data: z.union([ InvoiceCreateInputSchema, InvoiceUncheckedCreateInputSchema ]),
}).strict();

export const InvoiceUpsertArgsSchema: z.ZodType<Prisma.InvoiceUpsertArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema, 
  create: z.union([ InvoiceCreateInputSchema, InvoiceUncheckedCreateInputSchema ]),
  update: z.union([ InvoiceUpdateInputSchema, InvoiceUncheckedUpdateInputSchema ]),
}).strict();

export const InvoiceCreateManyArgsSchema: z.ZodType<Prisma.InvoiceCreateManyArgs> = z.object({
  data: z.union([ InvoiceCreateManyInputSchema, InvoiceCreateManyInputSchema.array() ]),
}).strict();

export const InvoiceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.InvoiceCreateManyAndReturnArgs> = z.object({
  data: z.union([ InvoiceCreateManyInputSchema, InvoiceCreateManyInputSchema.array() ]),
}).strict();

export const InvoiceDeleteArgsSchema: z.ZodType<Prisma.InvoiceDeleteArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema, 
}).strict();

export const InvoiceUpdateArgsSchema: z.ZodType<Prisma.InvoiceUpdateArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  data: z.union([ InvoiceUpdateInputSchema, InvoiceUncheckedUpdateInputSchema ]),
  where: InvoiceWhereUniqueInputSchema, 
}).strict();

export const InvoiceUpdateManyArgsSchema: z.ZodType<Prisma.InvoiceUpdateManyArgs> = z.object({
  data: z.union([ InvoiceUpdateManyMutationInputSchema, InvoiceUncheckedUpdateManyInputSchema ]),
  where: InvoiceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InvoiceUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.InvoiceUpdateManyAndReturnArgs> = z.object({
  data: z.union([ InvoiceUpdateManyMutationInputSchema, InvoiceUncheckedUpdateManyInputSchema ]),
  where: InvoiceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const InvoiceDeleteManyArgsSchema: z.ZodType<Prisma.InvoiceDeleteManyArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const BillingPeriodSummaryCreateArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  data: z.union([ BillingPeriodSummaryCreateInputSchema, BillingPeriodSummaryUncheckedCreateInputSchema ]),
}).strict();

export const BillingPeriodSummaryUpsertArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryUpsertArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereUniqueInputSchema, 
  create: z.union([ BillingPeriodSummaryCreateInputSchema, BillingPeriodSummaryUncheckedCreateInputSchema ]),
  update: z.union([ BillingPeriodSummaryUpdateInputSchema, BillingPeriodSummaryUncheckedUpdateInputSchema ]),
}).strict();

export const BillingPeriodSummaryCreateManyArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateManyArgs> = z.object({
  data: z.union([ BillingPeriodSummaryCreateManyInputSchema, BillingPeriodSummaryCreateManyInputSchema.array() ]),
}).strict();

export const BillingPeriodSummaryCreateManyAndReturnArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryCreateManyAndReturnArgs> = z.object({
  data: z.union([ BillingPeriodSummaryCreateManyInputSchema, BillingPeriodSummaryCreateManyInputSchema.array() ]),
}).strict();

export const BillingPeriodSummaryDeleteArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryDeleteArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  where: BillingPeriodSummaryWhereUniqueInputSchema, 
}).strict();

export const BillingPeriodSummaryUpdateArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateArgs> = z.object({
  select: BillingPeriodSummarySelectSchema.optional(),
  include: BillingPeriodSummaryIncludeSchema.optional(),
  data: z.union([ BillingPeriodSummaryUpdateInputSchema, BillingPeriodSummaryUncheckedUpdateInputSchema ]),
  where: BillingPeriodSummaryWhereUniqueInputSchema, 
}).strict();

export const BillingPeriodSummaryUpdateManyArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateManyArgs> = z.object({
  data: z.union([ BillingPeriodSummaryUpdateManyMutationInputSchema, BillingPeriodSummaryUncheckedUpdateManyInputSchema ]),
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const BillingPeriodSummaryUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryUpdateManyAndReturnArgs> = z.object({
  data: z.union([ BillingPeriodSummaryUpdateManyMutationInputSchema, BillingPeriodSummaryUncheckedUpdateManyInputSchema ]),
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const BillingPeriodSummaryDeleteManyArgsSchema: z.ZodType<Prisma.BillingPeriodSummaryDeleteManyArgs> = z.object({
  where: BillingPeriodSummaryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamCreateArgsSchema: z.ZodType<Prisma.CookingTeamCreateArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  data: z.union([ CookingTeamCreateInputSchema, CookingTeamUncheckedCreateInputSchema ]),
}).strict();

export const CookingTeamUpsertArgsSchema: z.ZodType<Prisma.CookingTeamUpsertArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema, 
  create: z.union([ CookingTeamCreateInputSchema, CookingTeamUncheckedCreateInputSchema ]),
  update: z.union([ CookingTeamUpdateInputSchema, CookingTeamUncheckedUpdateInputSchema ]),
}).strict();

export const CookingTeamCreateManyArgsSchema: z.ZodType<Prisma.CookingTeamCreateManyArgs> = z.object({
  data: z.union([ CookingTeamCreateManyInputSchema, CookingTeamCreateManyInputSchema.array() ]),
}).strict();

export const CookingTeamCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamCreateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamCreateManyInputSchema, CookingTeamCreateManyInputSchema.array() ]),
}).strict();

export const CookingTeamDeleteArgsSchema: z.ZodType<Prisma.CookingTeamDeleteArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema, 
}).strict();

export const CookingTeamUpdateArgsSchema: z.ZodType<Prisma.CookingTeamUpdateArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  data: z.union([ CookingTeamUpdateInputSchema, CookingTeamUncheckedUpdateInputSchema ]),
  where: CookingTeamWhereUniqueInputSchema, 
}).strict();

export const CookingTeamUpdateManyArgsSchema: z.ZodType<Prisma.CookingTeamUpdateManyArgs> = z.object({
  data: z.union([ CookingTeamUpdateManyMutationInputSchema, CookingTeamUncheckedUpdateManyInputSchema ]),
  where: CookingTeamWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamUpdateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamUpdateManyMutationInputSchema, CookingTeamUncheckedUpdateManyInputSchema ]),
  where: CookingTeamWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamDeleteManyArgsSchema: z.ZodType<Prisma.CookingTeamDeleteManyArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamAssignmentCreateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  data: z.union([ CookingTeamAssignmentCreateInputSchema, CookingTeamAssignmentUncheckedCreateInputSchema ]),
}).strict();

export const CookingTeamAssignmentUpsertArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema, 
  create: z.union([ CookingTeamAssignmentCreateInputSchema, CookingTeamAssignmentUncheckedCreateInputSchema ]),
  update: z.union([ CookingTeamAssignmentUpdateInputSchema, CookingTeamAssignmentUncheckedUpdateInputSchema ]),
}).strict();

export const CookingTeamAssignmentCreateManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyArgs> = z.object({
  data: z.union([ CookingTeamAssignmentCreateManyInputSchema, CookingTeamAssignmentCreateManyInputSchema.array() ]),
}).strict();

export const CookingTeamAssignmentCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamAssignmentCreateManyInputSchema, CookingTeamAssignmentCreateManyInputSchema.array() ]),
}).strict();

export const CookingTeamAssignmentDeleteArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDeleteArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema, 
}).strict();

export const CookingTeamAssignmentUpdateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  data: z.union([ CookingTeamAssignmentUpdateInputSchema, CookingTeamAssignmentUncheckedUpdateInputSchema ]),
  where: CookingTeamAssignmentWhereUniqueInputSchema, 
}).strict();

export const CookingTeamAssignmentUpdateManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyArgs> = z.object({
  data: z.union([ CookingTeamAssignmentUpdateManyMutationInputSchema, CookingTeamAssignmentUncheckedUpdateManyInputSchema ]),
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamAssignmentUpdateManyMutationInputSchema, CookingTeamAssignmentUncheckedUpdateManyInputSchema ]),
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const CookingTeamAssignmentDeleteManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDeleteManyArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SeasonCreateArgsSchema: z.ZodType<Prisma.SeasonCreateArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  data: z.union([ SeasonCreateInputSchema, SeasonUncheckedCreateInputSchema ]),
}).strict();

export const SeasonUpsertArgsSchema: z.ZodType<Prisma.SeasonUpsertArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema, 
  create: z.union([ SeasonCreateInputSchema, SeasonUncheckedCreateInputSchema ]),
  update: z.union([ SeasonUpdateInputSchema, SeasonUncheckedUpdateInputSchema ]),
}).strict();

export const SeasonCreateManyArgsSchema: z.ZodType<Prisma.SeasonCreateManyArgs> = z.object({
  data: z.union([ SeasonCreateManyInputSchema, SeasonCreateManyInputSchema.array() ]),
}).strict();

export const SeasonCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SeasonCreateManyAndReturnArgs> = z.object({
  data: z.union([ SeasonCreateManyInputSchema, SeasonCreateManyInputSchema.array() ]),
}).strict();

export const SeasonDeleteArgsSchema: z.ZodType<Prisma.SeasonDeleteArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema, 
}).strict();

export const SeasonUpdateArgsSchema: z.ZodType<Prisma.SeasonUpdateArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  data: z.union([ SeasonUpdateInputSchema, SeasonUncheckedUpdateInputSchema ]),
  where: SeasonWhereUniqueInputSchema, 
}).strict();

export const SeasonUpdateManyArgsSchema: z.ZodType<Prisma.SeasonUpdateManyArgs> = z.object({
  data: z.union([ SeasonUpdateManyMutationInputSchema, SeasonUncheckedUpdateManyInputSchema ]),
  where: SeasonWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SeasonUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.SeasonUpdateManyAndReturnArgs> = z.object({
  data: z.union([ SeasonUpdateManyMutationInputSchema, SeasonUncheckedUpdateManyInputSchema ]),
  where: SeasonWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SeasonDeleteManyArgsSchema: z.ZodType<Prisma.SeasonDeleteManyArgs> = z.object({
  where: SeasonWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TicketPriceCreateArgsSchema: z.ZodType<Prisma.TicketPriceCreateArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  data: z.union([ TicketPriceCreateInputSchema, TicketPriceUncheckedCreateInputSchema ]),
}).strict();

export const TicketPriceUpsertArgsSchema: z.ZodType<Prisma.TicketPriceUpsertArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema, 
  create: z.union([ TicketPriceCreateInputSchema, TicketPriceUncheckedCreateInputSchema ]),
  update: z.union([ TicketPriceUpdateInputSchema, TicketPriceUncheckedUpdateInputSchema ]),
}).strict();

export const TicketPriceCreateManyArgsSchema: z.ZodType<Prisma.TicketPriceCreateManyArgs> = z.object({
  data: z.union([ TicketPriceCreateManyInputSchema, TicketPriceCreateManyInputSchema.array() ]),
}).strict();

export const TicketPriceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TicketPriceCreateManyAndReturnArgs> = z.object({
  data: z.union([ TicketPriceCreateManyInputSchema, TicketPriceCreateManyInputSchema.array() ]),
}).strict();

export const TicketPriceDeleteArgsSchema: z.ZodType<Prisma.TicketPriceDeleteArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema, 
}).strict();

export const TicketPriceUpdateArgsSchema: z.ZodType<Prisma.TicketPriceUpdateArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  data: z.union([ TicketPriceUpdateInputSchema, TicketPriceUncheckedUpdateInputSchema ]),
  where: TicketPriceWhereUniqueInputSchema, 
}).strict();

export const TicketPriceUpdateManyArgsSchema: z.ZodType<Prisma.TicketPriceUpdateManyArgs> = z.object({
  data: z.union([ TicketPriceUpdateManyMutationInputSchema, TicketPriceUncheckedUpdateManyInputSchema ]),
  where: TicketPriceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TicketPriceUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TicketPriceUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TicketPriceUpdateManyMutationInputSchema, TicketPriceUncheckedUpdateManyInputSchema ]),
  where: TicketPriceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const TicketPriceDeleteManyArgsSchema: z.ZodType<Prisma.TicketPriceDeleteManyArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderHistoryCreateArgsSchema: z.ZodType<Prisma.OrderHistoryCreateArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  data: z.union([ OrderHistoryCreateInputSchema, OrderHistoryUncheckedCreateInputSchema ]),
}).strict();

export const OrderHistoryUpsertArgsSchema: z.ZodType<Prisma.OrderHistoryUpsertArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereUniqueInputSchema, 
  create: z.union([ OrderHistoryCreateInputSchema, OrderHistoryUncheckedCreateInputSchema ]),
  update: z.union([ OrderHistoryUpdateInputSchema, OrderHistoryUncheckedUpdateInputSchema ]),
}).strict();

export const OrderHistoryCreateManyArgsSchema: z.ZodType<Prisma.OrderHistoryCreateManyArgs> = z.object({
  data: z.union([ OrderHistoryCreateManyInputSchema, OrderHistoryCreateManyInputSchema.array() ]),
}).strict();

export const OrderHistoryCreateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderHistoryCreateManyAndReturnArgs> = z.object({
  data: z.union([ OrderHistoryCreateManyInputSchema, OrderHistoryCreateManyInputSchema.array() ]),
}).strict();

export const OrderHistoryDeleteArgsSchema: z.ZodType<Prisma.OrderHistoryDeleteArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  where: OrderHistoryWhereUniqueInputSchema, 
}).strict();

export const OrderHistoryUpdateArgsSchema: z.ZodType<Prisma.OrderHistoryUpdateArgs> = z.object({
  select: OrderHistorySelectSchema.optional(),
  include: OrderHistoryIncludeSchema.optional(),
  data: z.union([ OrderHistoryUpdateInputSchema, OrderHistoryUncheckedUpdateInputSchema ]),
  where: OrderHistoryWhereUniqueInputSchema, 
}).strict();

export const OrderHistoryUpdateManyArgsSchema: z.ZodType<Prisma.OrderHistoryUpdateManyArgs> = z.object({
  data: z.union([ OrderHistoryUpdateManyMutationInputSchema, OrderHistoryUncheckedUpdateManyInputSchema ]),
  where: OrderHistoryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderHistoryUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderHistoryUpdateManyAndReturnArgs> = z.object({
  data: z.union([ OrderHistoryUpdateManyMutationInputSchema, OrderHistoryUncheckedUpdateManyInputSchema ]),
  where: OrderHistoryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const OrderHistoryDeleteManyArgsSchema: z.ZodType<Prisma.OrderHistoryDeleteManyArgs> = z.object({
  where: OrderHistoryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const JobRunCreateArgsSchema: z.ZodType<Prisma.JobRunCreateArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  data: z.union([ JobRunCreateInputSchema, JobRunUncheckedCreateInputSchema ]),
}).strict();

export const JobRunUpsertArgsSchema: z.ZodType<Prisma.JobRunUpsertArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereUniqueInputSchema, 
  create: z.union([ JobRunCreateInputSchema, JobRunUncheckedCreateInputSchema ]),
  update: z.union([ JobRunUpdateInputSchema, JobRunUncheckedUpdateInputSchema ]),
}).strict();

export const JobRunCreateManyArgsSchema: z.ZodType<Prisma.JobRunCreateManyArgs> = z.object({
  data: z.union([ JobRunCreateManyInputSchema, JobRunCreateManyInputSchema.array() ]),
}).strict();

export const JobRunCreateManyAndReturnArgsSchema: z.ZodType<Prisma.JobRunCreateManyAndReturnArgs> = z.object({
  data: z.union([ JobRunCreateManyInputSchema, JobRunCreateManyInputSchema.array() ]),
}).strict();

export const JobRunDeleteArgsSchema: z.ZodType<Prisma.JobRunDeleteArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  where: JobRunWhereUniqueInputSchema, 
}).strict();

export const JobRunUpdateArgsSchema: z.ZodType<Prisma.JobRunUpdateArgs> = z.object({
  select: JobRunSelectSchema.optional(),
  data: z.union([ JobRunUpdateInputSchema, JobRunUncheckedUpdateInputSchema ]),
  where: JobRunWhereUniqueInputSchema, 
}).strict();

export const JobRunUpdateManyArgsSchema: z.ZodType<Prisma.JobRunUpdateManyArgs> = z.object({
  data: z.union([ JobRunUpdateManyMutationInputSchema, JobRunUncheckedUpdateManyInputSchema ]),
  where: JobRunWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const JobRunUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.JobRunUpdateManyAndReturnArgs> = z.object({
  data: z.union([ JobRunUpdateManyMutationInputSchema, JobRunUncheckedUpdateManyInputSchema ]),
  where: JobRunWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const JobRunDeleteManyArgsSchema: z.ZodType<Prisma.JobRunDeleteManyArgs> = z.object({
  where: JobRunWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();