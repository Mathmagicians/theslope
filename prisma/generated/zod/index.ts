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

export const AllergyScalarFieldEnumSchema = z.enum(['id','inhabitantId','allergyTypeId']);

export const UserScalarFieldEnumSchema = z.enum(['id','email','phone','passwordHash','systemRole','createdAt','updatedAt']);

export const DinnerPreferenceScalarFieldEnumSchema = z.enum(['id','inhabitantId','weekday','dinnerMode']);

export const InhabitantScalarFieldEnumSchema = z.enum(['id','heynaboId','userId','householdId','pictureUrl','name','lastName','birthDate']);

export const HouseholdScalarFieldEnumSchema = z.enum(['id','heynaboId','pbsId','movedInDate','moveOutDate','name','address']);

export const DinnerEventScalarFieldEnumSchema = z.enum(['id','date','menuTitle','menuDescription','menuPictureUrl','dinnerMode','chefId','cookingTeamId','createdAt','updatedAt','seasonId']);

export const OrderScalarFieldEnumSchema = z.enum(['id','dinnerEventId','inhabitantId','createdAt','updatedAt','ticketType']);

export const TransactionScalarFieldEnumSchema = z.enum(['id','orderId','amount','createdAt','invoiceId']);

export const InvoiceScalarFieldEnumSchema = z.enum(['id','cutoffDate','paymentDate','amount','createdAt','householdId']);

export const CookingTeamScalarFieldEnumSchema = z.enum(['id','seasonId','name']);

export const CookingTeamAssignmentScalarFieldEnumSchema = z.enum(['id','chefForcookingTeamId','cookForcookingTeamId','juniorForcookingTeamId','inhabitantId','role']);

export const SeasonScalarFieldEnumSchema = z.enum(['id','shortName','startDate','endDate','isActive','cookingDays','holidays','ticketIsCancellableDaysBefore','diningModeIsEditableMinutesBefore']);

export const TicketPriceScalarFieldEnumSchema = z.enum(['id','seasonId','ticketType','price','description']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullsOrderSchema = z.enum(['first','last']);

export const SystemRoleSchema = z.enum(['ADMIN','USER']);

export type SystemRoleType = `${z.infer<typeof SystemRoleSchema>}`

export const RoleSchema = z.enum(['CHEF','COOK','JUNIORHELPER']);

export type RoleType = `${z.infer<typeof RoleSchema>}`

export const WeekdaySchema = z.enum(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']);

export type WeekdayType = `${z.infer<typeof WeekdaySchema>}`

export const TicketTypeSchema = z.enum(['ADULT','CHILD']);

export type TicketTypeType = `${z.infer<typeof TicketTypeSchema>}`

export const DinnerModeSchema = z.enum(['TAKEAWAY','DINEIN','NONE']);

export type DinnerModeType = `${z.infer<typeof DinnerModeSchema>}`

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
// ALLERGY SCHEMA
/////////////////////////////////////////

export const AllergySchema = z.object({
  id: z.number().int(),
  inhabitantId: z.number().int(),
  allergyTypeId: z.number().int(),
})

export type Allergy = z.infer<typeof AllergySchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  systemRole: SystemRoleSchema,
  id: z.number().int(),
  email: z.string(),
  phone: z.string().nullable(),
  passwordHash: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// DINNER PREFERENCE SCHEMA
/////////////////////////////////////////

export const DinnerPreferenceSchema = z.object({
  weekday: WeekdaySchema,
  dinnerMode: DinnerModeSchema,
  id: z.number().int(),
  inhabitantId: z.number().int(),
})

export type DinnerPreference = z.infer<typeof DinnerPreferenceSchema>

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
  dinnerMode: DinnerModeSchema,
  id: z.number().int(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().nullable(),
  menuPictureUrl: z.string().nullable(),
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
  ticketType: TicketTypeSchema,
  id: z.number().int(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Order = z.infer<typeof OrderSchema>

/////////////////////////////////////////
// TRANSACTION SCHEMA
/////////////////////////////////////////

export const TransactionSchema = z.object({
  id: z.number().int(),
  orderId: z.number().int(),
  amount: z.number().int(),
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
  amount: z.number().int(),
  createdAt: z.coerce.date(),
  householdId: z.number().int(),
})

export type Invoice = z.infer<typeof InvoiceSchema>

/////////////////////////////////////////
// COOKING TEAM SCHEMA
/////////////////////////////////////////

export const CookingTeamSchema = z.object({
  id: z.number().int(),
  seasonId: z.number().int(),
  name: z.string(),
})

export type CookingTeam = z.infer<typeof CookingTeamSchema>

/////////////////////////////////////////
// COOKING TEAM ASSIGNMENT SCHEMA
/////////////////////////////////////////

export const CookingTeamAssignmentSchema = z.object({
  role: RoleSchema,
  id: z.number().int(),
  chefForcookingTeamId: z.number().int().nullable(),
  cookForcookingTeamId: z.number().int().nullable(),
  juniorForcookingTeamId: z.number().int().nullable(),
  inhabitantId: z.number().int(),
})

export type CookingTeamAssignment = z.infer<typeof CookingTeamAssignmentSchema>

/////////////////////////////////////////
// SEASON SCHEMA
/////////////////////////////////////////

export const SeasonSchema = z.object({
  id: z.number().int(),
  shortName: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
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
})

export type TicketPrice = z.infer<typeof TicketPriceSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// ALLERGY TYPE
//------------------------------------------------------

export const AllergyTypeIncludeSchema: z.ZodType<Prisma.AllergyTypeInclude> = z.object({
  Allergy: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => AllergyTypeCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const AllergyTypeArgsSchema: z.ZodType<Prisma.AllergyTypeDefaultArgs> = z.object({
  select: z.lazy(() => AllergyTypeSelectSchema).optional(),
  include: z.lazy(() => AllergyTypeIncludeSchema).optional(),
}).strict();

export const AllergyTypeCountOutputTypeArgsSchema: z.ZodType<Prisma.AllergyTypeCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => AllergyTypeCountOutputTypeSelectSchema).nullish(),
}).strict();

export const AllergyTypeCountOutputTypeSelectSchema: z.ZodType<Prisma.AllergyTypeCountOutputTypeSelect> = z.object({
  Allergy: z.boolean().optional(),
}).strict();

export const AllergyTypeSelectSchema: z.ZodType<Prisma.AllergyTypeSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  icon: z.boolean().optional(),
  Allergy: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => AllergyTypeCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ALLERGY
//------------------------------------------------------

export const AllergyIncludeSchema: z.ZodType<Prisma.AllergyInclude> = z.object({
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict()

export const AllergyArgsSchema: z.ZodType<Prisma.AllergyDefaultArgs> = z.object({
  select: z.lazy(() => AllergySelectSchema).optional(),
  include: z.lazy(() => AllergyIncludeSchema).optional(),
}).strict();

export const AllergySelectSchema: z.ZodType<Prisma.AllergySelect> = z.object({
  id: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  allergyTypeId: z.boolean().optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  allergyType: z.union([z.boolean(),z.lazy(() => AllergyTypeArgsSchema)]).optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  Inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z.object({
  select: z.lazy(() => UserSelectSchema).optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  phone: z.boolean().optional(),
  passwordHash: z.boolean().optional(),
  systemRole: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  Inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

// DINNER PREFERENCE
//------------------------------------------------------

export const DinnerPreferenceIncludeSchema: z.ZodType<Prisma.DinnerPreferenceInclude> = z.object({
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

export const DinnerPreferenceArgsSchema: z.ZodType<Prisma.DinnerPreferenceDefaultArgs> = z.object({
  select: z.lazy(() => DinnerPreferenceSelectSchema).optional(),
  include: z.lazy(() => DinnerPreferenceIncludeSchema).optional(),
}).strict();

export const DinnerPreferenceSelectSchema: z.ZodType<Prisma.DinnerPreferenceSelect> = z.object({
  id: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  weekday: z.boolean().optional(),
  dinnerMode: z.boolean().optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

// INHABITANT
//------------------------------------------------------

export const InhabitantIncludeSchema: z.ZodType<Prisma.InhabitantInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  household: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  allergies: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  dinnerPreferences: z.union([z.boolean(),z.lazy(() => DinnerPreferenceFindManyArgsSchema)]).optional(),
  DinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  Order: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  CookingTeamAssignment: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InhabitantCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const InhabitantArgsSchema: z.ZodType<Prisma.InhabitantDefaultArgs> = z.object({
  select: z.lazy(() => InhabitantSelectSchema).optional(),
  include: z.lazy(() => InhabitantIncludeSchema).optional(),
}).strict();

export const InhabitantCountOutputTypeArgsSchema: z.ZodType<Prisma.InhabitantCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => InhabitantCountOutputTypeSelectSchema).nullish(),
}).strict();

export const InhabitantCountOutputTypeSelectSchema: z.ZodType<Prisma.InhabitantCountOutputTypeSelect> = z.object({
  allergies: z.boolean().optional(),
  dinnerPreferences: z.boolean().optional(),
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
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  household: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  allergies: z.union([z.boolean(),z.lazy(() => AllergyFindManyArgsSchema)]).optional(),
  dinnerPreferences: z.union([z.boolean(),z.lazy(() => DinnerPreferenceFindManyArgsSchema)]).optional(),
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
}).strict()

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
  _count: z.union([z.boolean(),z.lazy(() => DinnerEventCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const DinnerEventArgsSchema: z.ZodType<Prisma.DinnerEventDefaultArgs> = z.object({
  select: z.lazy(() => DinnerEventSelectSchema).optional(),
  include: z.lazy(() => DinnerEventIncludeSchema).optional(),
}).strict();

export const DinnerEventCountOutputTypeArgsSchema: z.ZodType<Prisma.DinnerEventCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => DinnerEventCountOutputTypeSelectSchema).nullish(),
}).strict();

export const DinnerEventCountOutputTypeSelectSchema: z.ZodType<Prisma.DinnerEventCountOutputTypeSelect> = z.object({
  tickets: z.boolean().optional(),
}).strict();

export const DinnerEventSelectSchema: z.ZodType<Prisma.DinnerEventSelect> = z.object({
  id: z.boolean().optional(),
  date: z.boolean().optional(),
  menuTitle: z.boolean().optional(),
  menuDescription: z.boolean().optional(),
  menuPictureUrl: z.boolean().optional(),
  dinnerMode: z.boolean().optional(),
  chefId: z.boolean().optional(),
  cookingTeamId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  chef: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  cookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  tickets: z.union([z.boolean(),z.lazy(() => OrderFindManyArgsSchema)]).optional(),
  Season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => DinnerEventCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ORDER
//------------------------------------------------------

export const OrderIncludeSchema: z.ZodType<Prisma.OrderInclude> = z.object({
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  Transaction: z.union([z.boolean(),z.lazy(() => TransactionArgsSchema)]).optional(),
}).strict()

export const OrderArgsSchema: z.ZodType<Prisma.OrderDefaultArgs> = z.object({
  select: z.lazy(() => OrderSelectSchema).optional(),
  include: z.lazy(() => OrderIncludeSchema).optional(),
}).strict();

export const OrderSelectSchema: z.ZodType<Prisma.OrderSelect> = z.object({
  id: z.boolean().optional(),
  dinnerEventId: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  ticketType: z.boolean().optional(),
  dinnerEvent: z.union([z.boolean(),z.lazy(() => DinnerEventArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
  Transaction: z.union([z.boolean(),z.lazy(() => TransactionArgsSchema)]).optional(),
}).strict()

// TRANSACTION
//------------------------------------------------------

export const TransactionIncludeSchema: z.ZodType<Prisma.TransactionInclude> = z.object({
  order: z.union([z.boolean(),z.lazy(() => OrderArgsSchema)]).optional(),
  invoice: z.union([z.boolean(),z.lazy(() => InvoiceArgsSchema)]).optional(),
}).strict()

export const TransactionArgsSchema: z.ZodType<Prisma.TransactionDefaultArgs> = z.object({
  select: z.lazy(() => TransactionSelectSchema).optional(),
  include: z.lazy(() => TransactionIncludeSchema).optional(),
}).strict();

export const TransactionSelectSchema: z.ZodType<Prisma.TransactionSelect> = z.object({
  id: z.boolean().optional(),
  orderId: z.boolean().optional(),
  amount: z.boolean().optional(),
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
  _count: z.union([z.boolean(),z.lazy(() => InvoiceCountOutputTypeArgsSchema)]).optional(),
}).strict()

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
  amount: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  householdId: z.boolean().optional(),
  transactions: z.union([z.boolean(),z.lazy(() => TransactionFindManyArgsSchema)]).optional(),
  houseHold: z.union([z.boolean(),z.lazy(() => HouseholdArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => InvoiceCountOutputTypeArgsSchema)]).optional(),
}).strict()

// COOKING TEAM
//------------------------------------------------------

export const CookingTeamIncludeSchema: z.ZodType<Prisma.CookingTeamInclude> = z.object({
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  dinners: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  chefs: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  cooks: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  juniorHelpers: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CookingTeamCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const CookingTeamArgsSchema: z.ZodType<Prisma.CookingTeamDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamSelectSchema).optional(),
  include: z.lazy(() => CookingTeamIncludeSchema).optional(),
}).strict();

export const CookingTeamCountOutputTypeArgsSchema: z.ZodType<Prisma.CookingTeamCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamCountOutputTypeSelectSchema).nullish(),
}).strict();

export const CookingTeamCountOutputTypeSelectSchema: z.ZodType<Prisma.CookingTeamCountOutputTypeSelect> = z.object({
  dinners: z.boolean().optional(),
  chefs: z.boolean().optional(),
  cooks: z.boolean().optional(),
  juniorHelpers: z.boolean().optional(),
}).strict();

export const CookingTeamSelectSchema: z.ZodType<Prisma.CookingTeamSelect> = z.object({
  id: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  name: z.boolean().optional(),
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
  dinners: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  chefs: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  cooks: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  juniorHelpers: z.union([z.boolean(),z.lazy(() => CookingTeamAssignmentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CookingTeamCountOutputTypeArgsSchema)]).optional(),
}).strict()

// COOKING TEAM ASSIGNMENT
//------------------------------------------------------

export const CookingTeamAssignmentIncludeSchema: z.ZodType<Prisma.CookingTeamAssignmentInclude> = z.object({
  chefForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  cookForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  juniorForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

export const CookingTeamAssignmentArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDefaultArgs> = z.object({
  select: z.lazy(() => CookingTeamAssignmentSelectSchema).optional(),
  include: z.lazy(() => CookingTeamAssignmentIncludeSchema).optional(),
}).strict();

export const CookingTeamAssignmentSelectSchema: z.ZodType<Prisma.CookingTeamAssignmentSelect> = z.object({
  id: z.boolean().optional(),
  chefForcookingTeamId: z.boolean().optional(),
  cookForcookingTeamId: z.boolean().optional(),
  juniorForcookingTeamId: z.boolean().optional(),
  inhabitantId: z.boolean().optional(),
  role: z.boolean().optional(),
  chefForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  cookForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  juniorForCcookingTeam: z.union([z.boolean(),z.lazy(() => CookingTeamArgsSchema)]).optional(),
  inhabitant: z.union([z.boolean(),z.lazy(() => InhabitantArgsSchema)]).optional(),
}).strict()

// SEASON
//------------------------------------------------------

export const SeasonIncludeSchema: z.ZodType<Prisma.SeasonInclude> = z.object({
  CookingTeams: z.union([z.boolean(),z.lazy(() => CookingTeamFindManyArgsSchema)]).optional(),
  ticketPrices: z.union([z.boolean(),z.lazy(() => TicketPriceFindManyArgsSchema)]).optional(),
  dinnerEvents: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => SeasonCountOutputTypeArgsSchema)]).optional(),
}).strict()

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
  startDate: z.boolean().optional(),
  endDate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  cookingDays: z.boolean().optional(),
  holidays: z.boolean().optional(),
  ticketIsCancellableDaysBefore: z.boolean().optional(),
  diningModeIsEditableMinutesBefore: z.boolean().optional(),
  CookingTeams: z.union([z.boolean(),z.lazy(() => CookingTeamFindManyArgsSchema)]).optional(),
  ticketPrices: z.union([z.boolean(),z.lazy(() => TicketPriceFindManyArgsSchema)]).optional(),
  dinnerEvents: z.union([z.boolean(),z.lazy(() => DinnerEventFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => SeasonCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TICKET PRICE
//------------------------------------------------------

export const TicketPriceIncludeSchema: z.ZodType<Prisma.TicketPriceInclude> = z.object({
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
}).strict()

export const TicketPriceArgsSchema: z.ZodType<Prisma.TicketPriceDefaultArgs> = z.object({
  select: z.lazy(() => TicketPriceSelectSchema).optional(),
  include: z.lazy(() => TicketPriceIncludeSchema).optional(),
}).strict();

export const TicketPriceSelectSchema: z.ZodType<Prisma.TicketPriceSelect> = z.object({
  id: z.boolean().optional(),
  seasonId: z.boolean().optional(),
  ticketType: z.boolean().optional(),
  price: z.boolean().optional(),
  description: z.boolean().optional(),
  season: z.union([z.boolean(),z.lazy(() => SeasonArgsSchema)]).optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const AllergyTypeWhereInputSchema: z.ZodType<Prisma.AllergyTypeWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyTypeWhereInputSchema),z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeWhereInputSchema),z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyListRelationFilterSchema).optional()
}).strict();

export const AllergyTypeOrderByWithRelationInputSchema: z.ZodType<Prisma.AllergyTypeOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  Allergy: z.lazy(() => AllergyOrderByRelationAggregateInputSchema).optional()
}).strict();

export const AllergyTypeWhereUniqueInputSchema: z.ZodType<Prisma.AllergyTypeWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => AllergyTypeWhereInputSchema),z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeWhereInputSchema),z.lazy(() => AllergyTypeWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyListRelationFilterSchema).optional()
}).strict());

export const AllergyTypeOrderByWithAggregationInputSchema: z.ZodType<Prisma.AllergyTypeOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => AllergyTypeCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => AllergyTypeAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AllergyTypeMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AllergyTypeMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => AllergyTypeSumOrderByAggregateInputSchema).optional()
}).strict();

export const AllergyTypeScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AllergyTypeScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema),z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema),z.lazy(() => AllergyTypeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  icon: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const AllergyWhereInputSchema: z.ZodType<Prisma.AllergyWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyWhereInputSchema),z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyWhereInputSchema),z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema),z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict();

export const AllergyOrderByWithRelationInputSchema: z.ZodType<Prisma.AllergyOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeOrderByWithRelationInputSchema).optional()
}).strict();

export const AllergyWhereUniqueInputSchema: z.ZodType<Prisma.AllergyWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => AllergyWhereInputSchema),z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyWhereInputSchema),z.lazy(() => AllergyWhereInputSchema).array() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  allergyType: z.union([ z.lazy(() => AllergyTypeScalarRelationFilterSchema),z.lazy(() => AllergyTypeWhereInputSchema) ]).optional(),
}).strict());

export const AllergyOrderByWithAggregationInputSchema: z.ZodType<Prisma.AllergyOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AllergyCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => AllergyAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AllergyMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AllergyMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => AllergySumOrderByAggregateInputSchema).optional()
}).strict();

export const AllergyScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AllergyScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema),z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema),z.lazy(() => AllergyScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
}).strict();

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  systemRole: z.union([ z.lazy(() => EnumSystemRoleFilterSchema),z.lazy(() => SystemRoleSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  Inhabitant: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
}).strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRole: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  Inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional()
}).strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    email: z.string()
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
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  systemRole: z.union([ z.lazy(() => EnumSystemRoleFilterSchema),z.lazy(() => SystemRoleSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  Inhabitant: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
}).strict());

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRole: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => UserAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => UserSumOrderByAggregateInputSchema).optional()
}).strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  phone: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  passwordHash: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  systemRole: z.union([ z.lazy(() => EnumSystemRoleWithAggregatesFilterSchema),z.lazy(() => SystemRoleSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const DinnerPreferenceWhereInputSchema: z.ZodType<Prisma.DinnerPreferenceWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerPreferenceWhereInputSchema),z.lazy(() => DinnerPreferenceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerPreferenceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerPreferenceWhereInputSchema),z.lazy(() => DinnerPreferenceWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  weekday: z.union([ z.lazy(() => EnumWeekdayFilterSchema),z.lazy(() => WeekdaySchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceOrderByWithRelationInputSchema: z.ZodType<Prisma.DinnerPreferenceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  weekday: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional()
}).strict();

export const DinnerPreferenceWhereUniqueInputSchema: z.ZodType<Prisma.DinnerPreferenceWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => DinnerPreferenceWhereInputSchema),z.lazy(() => DinnerPreferenceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerPreferenceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerPreferenceWhereInputSchema),z.lazy(() => DinnerPreferenceWhereInputSchema).array() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  weekday: z.union([ z.lazy(() => EnumWeekdayFilterSchema),z.lazy(() => WeekdaySchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict());

export const DinnerPreferenceOrderByWithAggregationInputSchema: z.ZodType<Prisma.DinnerPreferenceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  weekday: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => DinnerPreferenceCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DinnerPreferenceAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DinnerPreferenceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DinnerPreferenceMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DinnerPreferenceSumOrderByAggregateInputSchema).optional()
}).strict();

export const DinnerPreferenceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DinnerPreferenceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerPreferenceScalarWhereWithAggregatesInputSchema),z.lazy(() => DinnerPreferenceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerPreferenceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerPreferenceScalarWhereWithAggregatesInputSchema),z.lazy(() => DinnerPreferenceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  weekday: z.union([ z.lazy(() => EnumWeekdayWithAggregatesFilterSchema),z.lazy(() => WeekdaySchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeWithAggregatesFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
}).strict();

export const InhabitantWhereInputSchema: z.ZodType<Prisma.InhabitantWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantWhereInputSchema),z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantWhereInputSchema),z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  household: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  allergies: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceListRelationFilterSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  Order: z.lazy(() => OrderListRelationFilterSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional()
}).strict();

export const InhabitantOrderByWithRelationInputSchema: z.ZodType<Prisma.InhabitantOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  household: z.lazy(() => HouseholdOrderByWithRelationInputSchema).optional(),
  allergies: z.lazy(() => AllergyOrderByRelationAggregateInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceOrderByRelationAggregateInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional(),
  Order: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional()
}).strict();

export const InhabitantWhereUniqueInputSchema: z.ZodType<Prisma.InhabitantWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
    userId: z.number().int()
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
  AND: z.union([ z.lazy(() => InhabitantWhereInputSchema),z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantWhereInputSchema),z.lazy(() => InhabitantWhereInputSchema).array() ]).optional(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  household: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
  allergies: z.lazy(() => AllergyListRelationFilterSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceListRelationFilterSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  Order: z.lazy(() => OrderListRelationFilterSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional()
}).strict());

export const InhabitantOrderByWithAggregationInputSchema: z.ZodType<Prisma.InhabitantOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => InhabitantCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => InhabitantAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => InhabitantMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => InhabitantMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => InhabitantSumOrderByAggregateInputSchema).optional()
}).strict();

export const InhabitantScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.InhabitantScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema),z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema),z.lazy(() => InhabitantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
}).strict();

export const HouseholdWhereInputSchema: z.ZodType<Prisma.HouseholdWhereInput> = z.object({
  AND: z.union([ z.lazy(() => HouseholdWhereInputSchema),z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdWhereInputSchema),z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  pbsId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  inhabitants: z.lazy(() => InhabitantListRelationFilterSchema).optional(),
  Invoice: z.lazy(() => InvoiceListRelationFilterSchema).optional()
}).strict();

export const HouseholdOrderByWithRelationInputSchema: z.ZodType<Prisma.HouseholdOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  inhabitants: z.lazy(() => InhabitantOrderByRelationAggregateInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceOrderByRelationAggregateInputSchema).optional()
}).strict();

export const HouseholdWhereUniqueInputSchema: z.ZodType<Prisma.HouseholdWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    heynaboId: z.number().int(),
    pbsId: z.number().int()
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
  AND: z.union([ z.lazy(() => HouseholdWhereInputSchema),z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdWhereInputSchema),z.lazy(() => HouseholdWhereInputSchema).array() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  inhabitants: z.lazy(() => InhabitantListRelationFilterSchema).optional(),
  Invoice: z.lazy(() => InvoiceListRelationFilterSchema).optional()
}).strict());

export const HouseholdOrderByWithAggregationInputSchema: z.ZodType<Prisma.HouseholdOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => HouseholdCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => HouseholdAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => HouseholdMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => HouseholdMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => HouseholdSumOrderByAggregateInputSchema).optional()
}).strict();

export const HouseholdScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.HouseholdScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema),z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema),z.lazy(() => HouseholdScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  pbsId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  movedInDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  moveOutDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  address: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const DinnerEventWhereInputSchema: z.ZodType<Prisma.DinnerEventWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventWhereInputSchema),z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventWhereInputSchema),z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  chef: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderListRelationFilterSchema).optional(),
  Season: z.union([ z.lazy(() => SeasonNullableScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional().nullable(),
}).strict();

export const DinnerEventOrderByWithRelationInputSchema: z.ZodType<Prisma.DinnerEventOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  menuPictureUrl: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  tickets: z.lazy(() => OrderOrderByRelationAggregateInputSchema).optional(),
  Season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional()
}).strict();

export const DinnerEventWhereUniqueInputSchema: z.ZodType<Prisma.DinnerEventWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => DinnerEventWhereInputSchema),z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventWhereInputSchema),z.lazy(() => DinnerEventWhereInputSchema).array() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  chef: z.union([ z.lazy(() => InhabitantNullableScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional().nullable(),
  cookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderListRelationFilterSchema).optional(),
  Season: z.union([ z.lazy(() => SeasonNullableScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional().nullable(),
}).strict());

export const DinnerEventOrderByWithAggregationInputSchema: z.ZodType<Prisma.DinnerEventOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  menuPictureUrl: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => DinnerEventCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DinnerEventAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DinnerEventMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DinnerEventMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DinnerEventSumOrderByAggregateInputSchema).optional()
}).strict();

export const DinnerEventScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DinnerEventScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema),z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema),z.lazy(() => DinnerEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeWithAggregatesFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
}).strict();

export const OrderWhereInputSchema: z.ZodType<Prisma.OrderWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderWhereInputSchema),z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderWhereInputSchema),z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema),z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  Transaction: z.union([ z.lazy(() => TransactionNullableScalarRelationFilterSchema),z.lazy(() => TransactionWhereInputSchema) ]).optional().nullable(),
}).strict();

export const OrderOrderByWithRelationInputSchema: z.ZodType<Prisma.OrderOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  dinnerEvent: z.lazy(() => DinnerEventOrderByWithRelationInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional(),
  Transaction: z.lazy(() => TransactionOrderByWithRelationInputSchema).optional()
}).strict();

export const OrderWhereUniqueInputSchema: z.ZodType<Prisma.OrderWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => OrderWhereInputSchema),z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderWhereInputSchema),z.lazy(() => OrderWhereInputSchema).array() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  dinnerEvent: z.union([ z.lazy(() => DinnerEventScalarRelationFilterSchema),z.lazy(() => DinnerEventWhereInputSchema) ]).optional(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  Transaction: z.union([ z.lazy(() => TransactionNullableScalarRelationFilterSchema),z.lazy(() => TransactionWhereInputSchema) ]).optional().nullable(),
}).strict());

export const OrderOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrderOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrderCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => OrderAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrderMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrderMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => OrderSumOrderByAggregateInputSchema).optional()
}).strict();

export const OrderScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.OrderScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => OrderScalarWhereWithAggregatesInputSchema),z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderScalarWhereWithAggregatesInputSchema),z.lazy(() => OrderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeWithAggregatesFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
}).strict();

export const TransactionWhereInputSchema: z.ZodType<Prisma.TransactionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionWhereInputSchema),z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionWhereInputSchema),z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  order: z.union([ z.lazy(() => OrderScalarRelationFilterSchema),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  invoice: z.union([ z.lazy(() => InvoiceNullableScalarRelationFilterSchema),z.lazy(() => InvoiceWhereInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionOrderByWithRelationInputSchema: z.ZodType<Prisma.TransactionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  order: z.lazy(() => OrderOrderByWithRelationInputSchema).optional(),
  invoice: z.lazy(() => InvoiceOrderByWithRelationInputSchema).optional()
}).strict();

export const TransactionWhereUniqueInputSchema: z.ZodType<Prisma.TransactionWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    orderId: z.number().int(),
    invoiceId: z.number().int()
  }),
  z.object({
    id: z.number().int(),
    orderId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
    invoiceId: z.number().int(),
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    orderId: z.number().int(),
    invoiceId: z.number().int(),
  }),
  z.object({
    orderId: z.number().int(),
  }),
  z.object({
    invoiceId: z.number().int(),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  orderId: z.number().int().optional(),
  invoiceId: z.number().int().optional(),
  AND: z.union([ z.lazy(() => TransactionWhereInputSchema),z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionWhereInputSchema),z.lazy(() => TransactionWhereInputSchema).array() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  order: z.union([ z.lazy(() => OrderScalarRelationFilterSchema),z.lazy(() => OrderWhereInputSchema) ]).optional(),
  invoice: z.union([ z.lazy(() => InvoiceNullableScalarRelationFilterSchema),z.lazy(() => InvoiceWhereInputSchema) ]).optional().nullable(),
}).strict());

export const TransactionOrderByWithAggregationInputSchema: z.ZodType<Prisma.TransactionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => TransactionCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => TransactionAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TransactionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TransactionMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => TransactionSumOrderByAggregateInputSchema).optional()
}).strict();

export const TransactionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TransactionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema),z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema),z.lazy(() => TransactionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  amount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
}).strict();

export const InvoiceWhereInputSchema: z.ZodType<Prisma.InvoiceWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceWhereInputSchema),z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceWhereInputSchema),z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  transactions: z.lazy(() => TransactionListRelationFilterSchema).optional(),
  houseHold: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
}).strict();

export const InvoiceOrderByWithRelationInputSchema: z.ZodType<Prisma.InvoiceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  transactions: z.lazy(() => TransactionOrderByRelationAggregateInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdOrderByWithRelationInputSchema).optional()
}).strict();

export const InvoiceWhereUniqueInputSchema: z.ZodType<Prisma.InvoiceWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => InvoiceWhereInputSchema),z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceWhereInputSchema),z.lazy(() => InvoiceWhereInputSchema).array() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  transactions: z.lazy(() => TransactionListRelationFilterSchema).optional(),
  houseHold: z.union([ z.lazy(() => HouseholdScalarRelationFilterSchema),z.lazy(() => HouseholdWhereInputSchema) ]).optional(),
}).strict());

export const InvoiceOrderByWithAggregationInputSchema: z.ZodType<Prisma.InvoiceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => InvoiceCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => InvoiceAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => InvoiceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => InvoiceMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => InvoiceSumOrderByAggregateInputSchema).optional()
}).strict();

export const InvoiceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.InvoiceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema),z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema),z.lazy(() => InvoiceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  amount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
}).strict();

export const CookingTeamWhereInputSchema: z.ZodType<Prisma.CookingTeamWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamWhereInputSchema),z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamWhereInputSchema),z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional()
}).strict();

export const CookingTeamOrderByWithRelationInputSchema: z.ZodType<Prisma.CookingTeamOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentOrderByRelationAggregateInputSchema).optional()
}).strict();

export const CookingTeamWhereUniqueInputSchema: z.ZodType<Prisma.CookingTeamWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => CookingTeamWhereInputSchema),z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamWhereInputSchema),z.lazy(() => CookingTeamWhereInputSchema).array() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventListRelationFilterSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentListRelationFilterSchema).optional()
}).strict());

export const CookingTeamOrderByWithAggregationInputSchema: z.ZodType<Prisma.CookingTeamOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => CookingTeamCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => CookingTeamAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => CookingTeamMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => CookingTeamMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => CookingTeamSumOrderByAggregateInputSchema).optional()
}).strict();

export const CookingTeamScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CookingTeamScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema),z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema),z.lazy(() => CookingTeamScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const CookingTeamAssignmentWhereInputSchema: z.ZodType<Prisma.CookingTeamAssignmentWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema),z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema),z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema),z.lazy(() => RoleSchema) ]).optional(),
  chefForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  cookForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  juniorForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentOrderByWithRelationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  juniorForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  chefForCcookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamOrderByWithRelationInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantOrderByWithRelationInputSchema).optional()
}).strict();

export const CookingTeamAssignmentWhereUniqueInputSchema: z.ZodType<Prisma.CookingTeamAssignmentWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema),z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentWhereInputSchema),z.lazy(() => CookingTeamAssignmentWhereInputSchema).array() ]).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema),z.lazy(() => RoleSchema) ]).optional(),
  chefForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  cookForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  juniorForCcookingTeam: z.union([ z.lazy(() => CookingTeamNullableScalarRelationFilterSchema),z.lazy(() => CookingTeamWhereInputSchema) ]).optional().nullable(),
  inhabitant: z.union([ z.lazy(() => InhabitantScalarRelationFilterSchema),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
}).strict());

export const CookingTeamAssignmentOrderByWithAggregationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cookForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  juniorForcookingTeamId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => CookingTeamAssignmentCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => CookingTeamAssignmentAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => CookingTeamAssignmentMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => CookingTeamAssignmentMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => CookingTeamAssignmentSumOrderByAggregateInputSchema).optional()
}).strict();

export const CookingTeamAssignmentScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CookingTeamAssignmentScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  inhabitantId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleWithAggregatesFilterSchema),z.lazy(() => RoleSchema) ]).optional(),
}).strict();

export const SeasonWhereInputSchema: z.ZodType<Prisma.SeasonWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SeasonWhereInputSchema),z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonWhereInputSchema),z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  shortName: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  startDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  endDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamListRelationFilterSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceListRelationFilterSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventListRelationFilterSchema).optional()
}).strict();

export const SeasonOrderByWithRelationInputSchema: z.ZodType<Prisma.SeasonOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  CookingTeams: z.lazy(() => CookingTeamOrderByRelationAggregateInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceOrderByRelationAggregateInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventOrderByRelationAggregateInputSchema).optional()
}).strict();

export const SeasonWhereUniqueInputSchema: z.ZodType<Prisma.SeasonWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => SeasonWhereInputSchema),z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonWhereInputSchema),z.lazy(() => SeasonWhereInputSchema).array() ]).optional(),
  shortName: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  startDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  endDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamListRelationFilterSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceListRelationFilterSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventListRelationFilterSchema).optional()
}).strict());

export const SeasonOrderByWithAggregationInputSchema: z.ZodType<Prisma.SeasonOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SeasonCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => SeasonAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SeasonMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SeasonMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => SeasonSumOrderByAggregateInputSchema).optional()
}).strict();

export const SeasonScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SeasonScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema),z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema),z.lazy(() => SeasonScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  shortName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  startDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  endDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  cookingDays: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  holidays: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
}).strict();

export const TicketPriceWhereInputSchema: z.ZodType<Prisma.TicketPriceWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceWhereInputSchema),z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceWhereInputSchema),z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
}).strict();

export const TicketPriceOrderByWithRelationInputSchema: z.ZodType<Prisma.TicketPriceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  season: z.lazy(() => SeasonOrderByWithRelationInputSchema).optional()
}).strict();

export const TicketPriceWhereUniqueInputSchema: z.ZodType<Prisma.TicketPriceWhereUniqueInput> = z.object({
  id: z.number().int()
})
.and(z.object({
  id: z.number().int().optional(),
  AND: z.union([ z.lazy(() => TicketPriceWhereInputSchema),z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceWhereInputSchema),z.lazy(() => TicketPriceWhereInputSchema).array() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  season: z.union([ z.lazy(() => SeasonScalarRelationFilterSchema),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
}).strict());

export const TicketPriceOrderByWithAggregationInputSchema: z.ZodType<Prisma.TicketPriceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => TicketPriceCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => TicketPriceAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TicketPriceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TicketPriceMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => TicketPriceSumOrderByAggregateInputSchema).optional()
}).strict();

export const TicketPriceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TicketPriceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema),z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema),z.lazy(() => TicketPriceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeWithAggregatesFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const AllergyTypeCreateInputSchema: z.ZodType<Prisma.AllergyTypeCreateInput> = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyCreateNestedManyWithoutAllergyTypeInputSchema).optional()
}).strict();

export const AllergyTypeUncheckedCreateInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutAllergyTypeInputSchema).optional()
}).strict();

export const AllergyTypeUpdateInputSchema: z.ZodType<Prisma.AllergyTypeUpdateInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUpdateManyWithoutAllergyTypeNestedInputSchema).optional()
}).strict();

export const AllergyTypeUncheckedUpdateInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  Allergy: z.lazy(() => AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema).optional()
}).strict();

export const AllergyTypeCreateManyInputSchema: z.ZodType<Prisma.AllergyTypeCreateManyInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable()
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

export const AllergyCreateInputSchema: z.ZodType<Prisma.AllergyCreateInput> = z.object({
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutAllergiesInputSchema),
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutAllergyInputSchema)
}).strict();

export const AllergyUncheckedCreateInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  allergyTypeId: z.number().int()
}).strict();

export const AllergyUpdateInputSchema: z.ZodType<Prisma.AllergyUpdateInput> = z.object({
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema).optional(),
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema).optional()
}).strict();

export const AllergyUncheckedUpdateInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyCreateManyInputSchema: z.ZodType<Prisma.AllergyCreateManyInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  allergyTypeId: z.number().int()
}).strict();

export const AllergyUpdateManyMutationInputSchema: z.ZodType<Prisma.AllergyUpdateManyMutationInput> = z.object({
}).strict();

export const AllergyUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRole: z.lazy(() => SystemRoleSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRole: z.lazy(() => SystemRoleSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedCreateNestedOneWithoutUserInputSchema).optional()
}).strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUpdateOneWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  Inhabitant: z.lazy(() => InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema).optional()
}).strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRole: z.lazy(() => SystemRoleSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceCreateInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateInput> = z.object({
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerPreferencesInputSchema)
}).strict();

export const DinnerPreferenceUncheckedCreateInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema)
}).strict();

export const DinnerPreferenceUpdateInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateInput> = z.object({
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutDinnerPreferencesNestedInputSchema).optional()
}).strict();

export const DinnerPreferenceUncheckedUpdateInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceCreateManyInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateManyInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema)
}).strict();

export const DinnerPreferenceUpdateManyMutationInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateManyMutationInput> = z.object({
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateInputSchema: z.ZodType<Prisma.InhabitantCreateInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantUpdateInputSchema: z.ZodType<Prisma.InhabitantUpdateInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantCreateManyInputSchema: z.ZodType<Prisma.InhabitantCreateManyInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable()
}).strict();

export const InhabitantUpdateManyMutationInputSchema: z.ZodType<Prisma.InhabitantUpdateManyMutationInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
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
}).strict();

export const HouseholdCreateInputSchema: z.ZodType<Prisma.HouseholdCreateInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantCreateNestedManyWithoutHouseholdInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceCreateNestedManyWithoutHouseHoldInputSchema).optional()
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
  Invoice: z.lazy(() => InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema).optional()
}).strict();

export const HouseholdUpdateInputSchema: z.ZodType<Prisma.HouseholdUpdateInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUpdateManyWithoutHouseholdNestedInputSchema).optional(),
  Invoice: z.lazy(() => InvoiceUpdateManyWithoutHouseHoldNestedInputSchema).optional()
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
  Invoice: z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema).optional()
}).strict();

export const HouseholdCreateManyInputSchema: z.ZodType<Prisma.HouseholdCreateManyInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string()
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
  dinnerMode: z.lazy(() => DinnerModeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional()
}).strict();

export const DinnerEventUncheckedCreateInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional()
}).strict();

export const DinnerEventUpdateInputSchema: z.ZodType<Prisma.DinnerEventUpdateInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional()
}).strict();

export const DinnerEventCreateManyInputSchema: z.ZodType<Prisma.DinnerEventCreateManyInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable()
}).strict();

export const DinnerEventUpdateManyMutationInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyMutationInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderCreateInputSchema: z.ZodType<Prisma.OrderCreateInput> = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderUncheckedCreateInputSchema: z.ZodType<Prisma.OrderUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderUpdateInputSchema: z.ZodType<Prisma.OrderUpdateInput> = z.object({
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderCreateManyInputSchema: z.ZodType<Prisma.OrderCreateManyInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema)
}).strict();

export const OrderUpdateManyMutationInputSchema: z.ZodType<Prisma.OrderUpdateManyMutationInput> = z.object({
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateInputSchema: z.ZodType<Prisma.TransactionCreateInput> = z.object({
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  order: z.lazy(() => OrderCreateNestedOneWithoutTransactionInputSchema),
  invoice: z.lazy(() => InvoiceCreateNestedOneWithoutTransactionsInputSchema).optional()
}).strict();

export const TransactionUncheckedCreateInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable()
}).strict();

export const TransactionUpdateInputSchema: z.ZodType<Prisma.TransactionUpdateInput> = z.object({
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  order: z.lazy(() => OrderUpdateOneRequiredWithoutTransactionNestedInputSchema).optional(),
  invoice: z.lazy(() => InvoiceUpdateOneWithoutTransactionsNestedInputSchema).optional()
}).strict();

export const TransactionUncheckedUpdateInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TransactionCreateManyInputSchema: z.ZodType<Prisma.TransactionCreateManyInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable()
}).strict();

export const TransactionUpdateManyMutationInputSchema: z.ZodType<Prisma.TransactionUpdateManyMutationInput> = z.object({
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InvoiceCreateInputSchema: z.ZodType<Prisma.InvoiceCreateInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  transactions: z.lazy(() => TransactionCreateNestedManyWithoutInvoiceInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdCreateNestedOneWithoutInvoiceInputSchema)
}).strict();

export const InvoiceUncheckedCreateInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int(),
  transactions: z.lazy(() => TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema).optional()
}).strict();

export const InvoiceUpdateInputSchema: z.ZodType<Prisma.InvoiceUpdateInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUpdateManyWithoutInvoiceNestedInputSchema).optional(),
  houseHold: z.lazy(() => HouseholdUpdateOneRequiredWithoutInvoiceNestedInputSchema).optional()
}).strict();

export const InvoiceUncheckedUpdateInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema).optional()
}).strict();

export const InvoiceCreateManyInputSchema: z.ZodType<Prisma.InvoiceCreateManyInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int()
}).strict();

export const InvoiceUpdateManyMutationInputSchema: z.ZodType<Prisma.InvoiceUpdateManyMutationInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateInputSchema: z.ZodType<Prisma.CookingTeamCreateInput> = z.object({
  name: z.string(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUpdateInputSchema: z.ZodType<Prisma.CookingTeamUpdateInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamCreateManyInputSchema: z.ZodType<Prisma.CookingTeamCreateManyInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string()
}).strict();

export const CookingTeamUpdateManyMutationInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyMutationInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateInput> = z.object({
  role: z.lazy(() => RoleSchema),
  chefForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutChefsInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutCooksInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutJuniorHelpersInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema)
}).strict();

export const CookingTeamAssignmentUncheckedCreateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentUpdateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  chefForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutChefsNestedInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutCooksNestedInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutJuniorHelpersNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedUpdateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateManyInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentUpdateManyMutationInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyMutationInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SeasonCreateInputSchema: z.ZodType<Prisma.SeasonCreateInput> = z.object({
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonUncheckedCreateInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonUpdateInputSchema: z.ZodType<Prisma.SeasonUpdateInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const SeasonUncheckedUpdateInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const SeasonCreateManyInputSchema: z.ZodType<Prisma.SeasonCreateManyInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int()
}).strict();

export const SeasonUpdateManyMutationInputSchema: z.ZodType<Prisma.SeasonUpdateManyMutationInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SeasonUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TicketPriceCreateInputSchema: z.ZodType<Prisma.TicketPriceCreateInput> = z.object({
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutTicketPricesInputSchema)
}).strict();

export const TicketPriceUncheckedCreateInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable()
}).strict();

export const TicketPriceUpdateInputSchema: z.ZodType<Prisma.TicketPriceUpdateInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutTicketPricesNestedInputSchema).optional()
}).strict();

export const TicketPriceUncheckedUpdateInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceCreateManyInputSchema: z.ZodType<Prisma.TicketPriceCreateManyInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable()
}).strict();

export const TicketPriceUpdateManyMutationInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyMutationInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
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
  none: z.lazy(() => AllergyWhereInputSchema).optional()
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional()
}).strict();

export const AllergyOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AllergyOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyTypeCountOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyTypeAvgOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyTypeMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyTypeMinOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  icon: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyTypeSumOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyTypeSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
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
  _max: z.lazy(() => NestedIntFilterSchema).optional()
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
  _max: z.lazy(() => NestedStringFilterSchema).optional()
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
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const InhabitantScalarRelationFilterSchema: z.ZodType<Prisma.InhabitantScalarRelationFilter> = z.object({
  is: z.lazy(() => InhabitantWhereInputSchema).optional(),
  isNot: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const AllergyTypeScalarRelationFilterSchema: z.ZodType<Prisma.AllergyTypeScalarRelationFilter> = z.object({
  is: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
  isNot: z.lazy(() => AllergyTypeWhereInputSchema).optional()
}).strict();

export const AllergyCountOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyAvgOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyMinOrderByAggregateInputSchema: z.ZodType<Prisma.AllergyMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergySumOrderByAggregateInputSchema: z.ZodType<Prisma.AllergySumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  allergyTypeId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumSystemRoleFilterSchema: z.ZodType<Prisma.EnumSystemRoleFilter> = z.object({
  equals: z.lazy(() => SystemRoleSchema).optional(),
  in: z.lazy(() => SystemRoleSchema).array().optional(),
  notIn: z.lazy(() => SystemRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => NestedEnumSystemRoleFilterSchema) ]).optional(),
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

export const InhabitantNullableScalarRelationFilterSchema: z.ZodType<Prisma.InhabitantNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => InhabitantWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => InhabitantWhereInputSchema).optional().nullable()
}).strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRole: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRole: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  passwordHash: z.lazy(() => SortOrderSchema).optional(),
  systemRole: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumSystemRoleWithAggregatesFilterSchema: z.ZodType<Prisma.EnumSystemRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => SystemRoleSchema).optional(),
  in: z.lazy(() => SystemRoleSchema).array().optional(),
  notIn: z.lazy(() => SystemRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => NestedEnumSystemRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumSystemRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumSystemRoleFilterSchema).optional()
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
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const EnumWeekdayFilterSchema: z.ZodType<Prisma.EnumWeekdayFilter> = z.object({
  equals: z.lazy(() => WeekdaySchema).optional(),
  in: z.lazy(() => WeekdaySchema).array().optional(),
  notIn: z.lazy(() => WeekdaySchema).array().optional(),
  not: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => NestedEnumWeekdayFilterSchema) ]).optional(),
}).strict();

export const EnumDinnerModeFilterSchema: z.ZodType<Prisma.EnumDinnerModeFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => NestedEnumDinnerModeFilterSchema) ]).optional(),
}).strict();

export const DinnerPreferenceCountOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  weekday: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerPreferenceAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerPreferenceMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  weekday: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerPreferenceMinOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  weekday: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerPreferenceSumOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumWeekdayWithAggregatesFilterSchema: z.ZodType<Prisma.EnumWeekdayWithAggregatesFilter> = z.object({
  equals: z.lazy(() => WeekdaySchema).optional(),
  in: z.lazy(() => WeekdaySchema).array().optional(),
  notIn: z.lazy(() => WeekdaySchema).array().optional(),
  not: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => NestedEnumWeekdayWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumWeekdayFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumWeekdayFilterSchema).optional()
}).strict();

export const EnumDinnerModeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumDinnerModeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => NestedEnumDinnerModeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional()
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
  isNot: z.lazy(() => UserWhereInputSchema).optional().nullable()
}).strict();

export const HouseholdScalarRelationFilterSchema: z.ZodType<Prisma.HouseholdScalarRelationFilter> = z.object({
  is: z.lazy(() => HouseholdWhereInputSchema).optional(),
  isNot: z.lazy(() => HouseholdWhereInputSchema).optional()
}).strict();

export const DinnerPreferenceListRelationFilterSchema: z.ZodType<Prisma.DinnerPreferenceListRelationFilter> = z.object({
  every: z.lazy(() => DinnerPreferenceWhereInputSchema).optional(),
  some: z.lazy(() => DinnerPreferenceWhereInputSchema).optional(),
  none: z.lazy(() => DinnerPreferenceWhereInputSchema).optional()
}).strict();

export const DinnerEventListRelationFilterSchema: z.ZodType<Prisma.DinnerEventListRelationFilter> = z.object({
  every: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  some: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  none: z.lazy(() => DinnerEventWhereInputSchema).optional()
}).strict();

export const OrderListRelationFilterSchema: z.ZodType<Prisma.OrderListRelationFilter> = z.object({
  every: z.lazy(() => OrderWhereInputSchema).optional(),
  some: z.lazy(() => OrderWhereInputSchema).optional(),
  none: z.lazy(() => OrderWhereInputSchema).optional()
}).strict();

export const CookingTeamAssignmentListRelationFilterSchema: z.ZodType<Prisma.CookingTeamAssignmentListRelationFilter> = z.object({
  every: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional(),
  some: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional(),
  none: z.lazy(() => CookingTeamAssignmentWhereInputSchema).optional()
}).strict();

export const DinnerPreferenceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DinnerPreferenceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerEventOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DinnerEventOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const OrderOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrderOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAssignmentOrderByRelationAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InhabitantCountOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InhabitantAvgOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InhabitantMaxOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InhabitantMinOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional(),
  pictureUrl: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  birthDate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InhabitantSumOrderByAggregateInputSchema: z.ZodType<Prisma.InhabitantSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
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
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
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
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const InhabitantListRelationFilterSchema: z.ZodType<Prisma.InhabitantListRelationFilter> = z.object({
  every: z.lazy(() => InhabitantWhereInputSchema).optional(),
  some: z.lazy(() => InhabitantWhereInputSchema).optional(),
  none: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InvoiceListRelationFilterSchema: z.ZodType<Prisma.InvoiceListRelationFilter> = z.object({
  every: z.lazy(() => InvoiceWhereInputSchema).optional(),
  some: z.lazy(() => InvoiceWhereInputSchema).optional(),
  none: z.lazy(() => InvoiceWhereInputSchema).optional()
}).strict();

export const InhabitantOrderByRelationAggregateInputSchema: z.ZodType<Prisma.InhabitantOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.InvoiceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const HouseholdCountOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const HouseholdAvgOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const HouseholdMaxOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const HouseholdMinOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional(),
  movedInDate: z.lazy(() => SortOrderSchema).optional(),
  moveOutDate: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const HouseholdSumOrderByAggregateInputSchema: z.ZodType<Prisma.HouseholdSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  heynaboId: z.lazy(() => SortOrderSchema).optional(),
  pbsId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamNullableScalarRelationFilterSchema: z.ZodType<Prisma.CookingTeamNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => CookingTeamWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => CookingTeamWhereInputSchema).optional().nullable()
}).strict();

export const SeasonNullableScalarRelationFilterSchema: z.ZodType<Prisma.SeasonNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => SeasonWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => SeasonWhereInputSchema).optional().nullable()
}).strict();

export const DinnerEventCountOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerEventAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerEventMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerEventMinOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  date: z.lazy(() => SortOrderSchema).optional(),
  menuTitle: z.lazy(() => SortOrderSchema).optional(),
  menuDescription: z.lazy(() => SortOrderSchema).optional(),
  menuPictureUrl: z.lazy(() => SortOrderSchema).optional(),
  dinnerMode: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DinnerEventSumOrderByAggregateInputSchema: z.ZodType<Prisma.DinnerEventSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefId: z.lazy(() => SortOrderSchema).optional(),
  cookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumTicketTypeFilterSchema: z.ZodType<Prisma.EnumTicketTypeFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => NestedEnumTicketTypeFilterSchema) ]).optional(),
}).strict();

export const DinnerEventScalarRelationFilterSchema: z.ZodType<Prisma.DinnerEventScalarRelationFilter> = z.object({
  is: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  isNot: z.lazy(() => DinnerEventWhereInputSchema).optional()
}).strict();

export const TransactionNullableScalarRelationFilterSchema: z.ZodType<Prisma.TransactionNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => TransactionWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => TransactionWhereInputSchema).optional().nullable()
}).strict();

export const OrderCountOrderByAggregateInputSchema: z.ZodType<Prisma.OrderCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const OrderAvgOrderByAggregateInputSchema: z.ZodType<Prisma.OrderAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const OrderMaxOrderByAggregateInputSchema: z.ZodType<Prisma.OrderMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const OrderMinOrderByAggregateInputSchema: z.ZodType<Prisma.OrderMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const OrderSumOrderByAggregateInputSchema: z.ZodType<Prisma.OrderSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  dinnerEventId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumTicketTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumTicketTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => NestedEnumTicketTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional()
}).strict();

export const OrderScalarRelationFilterSchema: z.ZodType<Prisma.OrderScalarRelationFilter> = z.object({
  is: z.lazy(() => OrderWhereInputSchema).optional(),
  isNot: z.lazy(() => OrderWhereInputSchema).optional()
}).strict();

export const InvoiceNullableScalarRelationFilterSchema: z.ZodType<Prisma.InvoiceNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => InvoiceWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => InvoiceWhereInputSchema).optional().nullable()
}).strict();

export const TransactionCountOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TransactionAvgOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TransactionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TransactionMinOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TransactionSumOrderByAggregateInputSchema: z.ZodType<Prisma.TransactionSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  orderId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  invoiceId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TransactionListRelationFilterSchema: z.ZodType<Prisma.TransactionListRelationFilter> = z.object({
  every: z.lazy(() => TransactionWhereInputSchema).optional(),
  some: z.lazy(() => TransactionWhereInputSchema).optional(),
  none: z.lazy(() => TransactionWhereInputSchema).optional()
}).strict();

export const TransactionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TransactionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceCountOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceAvgOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceMaxOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceMinOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  cutoffDate: z.lazy(() => SortOrderSchema).optional(),
  paymentDate: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const InvoiceSumOrderByAggregateInputSchema: z.ZodType<Prisma.InvoiceSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  householdId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonScalarRelationFilterSchema: z.ZodType<Prisma.SeasonScalarRelationFilter> = z.object({
  is: z.lazy(() => SeasonWhereInputSchema).optional(),
  isNot: z.lazy(() => SeasonWhereInputSchema).optional()
}).strict();

export const CookingTeamCountOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamMinOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamSumOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumRoleFilterSchema: z.ZodType<Prisma.EnumRoleFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema),z.lazy(() => NestedEnumRoleFilterSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentCountOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  cookForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  juniorForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAssignmentAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  cookForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  juniorForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAssignmentMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  cookForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  juniorForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAssignmentMinOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  cookForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  juniorForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CookingTeamAssignmentSumOrderByAggregateInputSchema: z.ZodType<Prisma.CookingTeamAssignmentSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  chefForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  cookForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  juniorForcookingTeamId: z.lazy(() => SortOrderSchema).optional(),
  inhabitantId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumRoleWithAggregatesFilterSchema: z.ZodType<Prisma.EnumRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema),z.lazy(() => NestedEnumRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRoleFilterSchema).optional()
}).strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const CookingTeamListRelationFilterSchema: z.ZodType<Prisma.CookingTeamListRelationFilter> = z.object({
  every: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  some: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  none: z.lazy(() => CookingTeamWhereInputSchema).optional()
}).strict();

export const TicketPriceListRelationFilterSchema: z.ZodType<Prisma.TicketPriceListRelationFilter> = z.object({
  every: z.lazy(() => TicketPriceWhereInputSchema).optional(),
  some: z.lazy(() => TicketPriceWhereInputSchema).optional(),
  none: z.lazy(() => TicketPriceWhereInputSchema).optional()
}).strict();

export const CookingTeamOrderByRelationAggregateInputSchema: z.ZodType<Prisma.CookingTeamOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TicketPriceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TicketPriceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonCountOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonAvgOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonMinOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  shortName: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  cookingDays: z.lazy(() => SortOrderSchema).optional(),
  holidays: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SeasonSumOrderByAggregateInputSchema: z.ZodType<Prisma.SeasonSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  ticketIsCancellableDaysBefore: z.lazy(() => SortOrderSchema).optional(),
  diningModeIsEditableMinutesBefore: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const TicketPriceCountOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TicketPriceAvgOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TicketPriceMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TicketPriceMinOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  ticketType: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TicketPriceSumOrderByAggregateInputSchema: z.ZodType<Prisma.TicketPriceSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  seasonId: z.lazy(() => SortOrderSchema).optional(),
  price: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AllergyCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AllergyUncheckedCreateNestedManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateNestedManyWithoutAllergyTypeInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional()
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable()
}).strict();

export const AllergyUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutAllergyTypeNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutAllergyTypeInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyAllergyTypeInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutAllergiesInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutAllergiesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const AllergyTypeCreateNestedOneWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateNestedOneWithoutAllergyInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutAllergyInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional()
}).strict();

export const InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutAllergiesNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutAllergiesInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutAllergiesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutAllergiesInputSchema),z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]).optional(),
}).strict();

export const AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema: z.ZodType<Prisma.AllergyTypeUpdateOneRequiredWithoutAllergyNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => AllergyTypeCreateOrConnectWithoutAllergyInputSchema).optional(),
  upsert: z.lazy(() => AllergyTypeUpsertWithoutAllergyInputSchema).optional(),
  connect: z.lazy(() => AllergyTypeWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => AllergyTypeUpdateToOneWithWhereWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const InhabitantUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const EnumSystemRoleFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumSystemRoleFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => SystemRoleSchema).optional()
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional()
}).strict();

export const InhabitantUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutUserInputSchema),z.lazy(() => InhabitantUpdateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const InhabitantUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutUserInputSchema),z.lazy(() => InhabitantUpdateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutDinnerPreferencesInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerPreferencesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerPreferencesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const EnumWeekdayFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumWeekdayFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => WeekdaySchema).optional()
}).strict();

export const EnumDinnerModeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumDinnerModeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => DinnerModeSchema).optional()
}).strict();

export const InhabitantUpdateOneRequiredWithoutDinnerPreferencesNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutDinnerPreferencesNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerPreferencesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerPreferencesInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutDinnerPreferencesInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUpdateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerPreferencesInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutInhabitantInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const HouseholdCreateNestedOneWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateNestedOneWithoutInhabitantsInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInhabitantsInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional()
}).strict();

export const AllergyCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema).array(),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerPreferenceCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutChefInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema).array(),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerPreferenceCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutChefInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable()
}).strict();

export const UserUpdateOneWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutInhabitantInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutInhabitantInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutInhabitantInputSchema),z.lazy(() => UserUpdateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]).optional(),
}).strict();

export const HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema: z.ZodType<Prisma.HouseholdUpdateOneRequiredWithoutInhabitantsNestedInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInhabitantsInputSchema).optional(),
  upsert: z.lazy(() => HouseholdUpsertWithoutInhabitantsInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => HouseholdUpdateToOneWithWhereWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]).optional(),
}).strict();

export const AllergyUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema).array(),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerPreferenceCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerPreferenceScalarWhereInputSchema),z.lazy(() => DinnerPreferenceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutChefNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutChefNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const NullableIntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableIntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateWithoutInhabitantInputSchema).array(),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => AllergyCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AllergyCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AllergyWhereUniqueInputSchema),z.lazy(() => AllergyWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => AllergyUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema).array(),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerPreferenceCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),z.lazy(() => DinnerPreferenceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerPreferenceScalarWhereInputSchema),z.lazy(() => DinnerPreferenceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutChefNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventCreateWithoutChefInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutChefInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyChefInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutChefInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderCreateWithoutInhabitantInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => OrderCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => OrderUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantCreateNestedManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateNestedManyWithoutHouseholdInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceCreateNestedManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateNestedManyWithoutHouseHoldInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedCreateNestedManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateNestedManyWithoutHouseholdInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateNestedManyWithoutHouseHoldInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUpdateManyWithoutHouseholdNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateManyWithoutHouseholdNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema),z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUpdateManyWithoutHouseHoldNestedInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithoutHouseHoldNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema),z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUncheckedUpdateManyWithoutHouseholdNestedInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateManyWithoutHouseholdNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema).array(),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema),z.lazy(() => InhabitantCreateOrConnectWithoutHouseholdInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InhabitantCreateManyHouseholdInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InhabitantWhereUniqueInputSchema),z.lazy(() => InhabitantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema),z.lazy(() => InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema),z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema).array(),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema),z.lazy(() => InvoiceCreateOrConnectWithoutHouseHoldInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  createMany: z.lazy(() => InvoiceCreateManyHouseHoldInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => InvoiceWhereUniqueInputSchema),z.lazy(() => InvoiceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema),z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const InhabitantCreateNestedOneWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerEventInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const CookingTeamCreateNestedOneWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutDinnersInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutDinnersInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional()
}).strict();

export const OrderCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutDinnerEventsInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutDinnerEventsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional()
}).strict();

export const OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedCreateNestedManyWithoutDinnerEventInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const InhabitantUpdateOneWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutDinnerEventInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutDinnerEventInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InhabitantWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]).optional(),
}).strict();

export const CookingTeamUpdateOneWithoutDinnersNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneWithoutDinnersNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutDinnersInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutDinnersInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutDinnersInputSchema),z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]).optional(),
}).strict();

export const OrderUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.OrderUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema),z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema),z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema),z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonUpdateOneWithoutDinnerEventsNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneWithoutDinnerEventsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutDinnerEventsInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutDinnerEventsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => SeasonWhereInputSchema) ]).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]).optional(),
}).strict();

export const OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutDinnerEventNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateWithoutDinnerEventInputSchema).array(),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema),z.lazy(() => OrderCreateOrConnectWithoutDinnerEventInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema),z.lazy(() => OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrderCreateManyDinnerEventInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrderWhereUniqueInputSchema),z.lazy(() => OrderWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema),z.lazy(() => OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema),z.lazy(() => OrderUpdateManyWithWhereWithoutDinnerEventInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedOneWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedOneWithoutTicketsInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutTicketsInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional()
}).strict();

export const InhabitantCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const TransactionCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional()
}).strict();

export const TransactionUncheckedCreateNestedOneWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateNestedOneWithoutOrderInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional()
}).strict();

export const EnumTicketTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumTicketTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => TicketTypeSchema).optional()
}).strict();

export const DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateOneRequiredWithoutTicketsNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => DinnerEventCreateOrConnectWithoutTicketsInputSchema).optional(),
  upsert: z.lazy(() => DinnerEventUpsertWithoutTicketsInputSchema).optional(),
  connect: z.lazy(() => DinnerEventWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateToOneWithWhereWithoutTicketsInputSchema),z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]).optional(),
}).strict();

export const InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutOrderInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutOrderInputSchema),z.lazy(() => InhabitantUpdateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const TransactionUpdateOneWithoutOrderNestedInputSchema: z.ZodType<Prisma.TransactionUpdateOneWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => TransactionUpsertWithoutOrderInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateToOneWithWhereWithoutOrderInputSchema),z.lazy(() => TransactionUpdateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateOneWithoutOrderNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TransactionCreateOrConnectWithoutOrderInputSchema).optional(),
  upsert: z.lazy(() => TransactionUpsertWithoutOrderInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => TransactionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => TransactionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateToOneWithWhereWithoutOrderInputSchema),z.lazy(() => TransactionUpdateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]).optional(),
}).strict();

export const OrderCreateNestedOneWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateNestedOneWithoutTransactionInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutTransactionInputSchema).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional()
}).strict();

export const InvoiceCreateNestedOneWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateNestedOneWithoutTransactionsInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InvoiceCreateOrConnectWithoutTransactionsInputSchema).optional(),
  connect: z.lazy(() => InvoiceWhereUniqueInputSchema).optional()
}).strict();

export const OrderUpdateOneRequiredWithoutTransactionNestedInputSchema: z.ZodType<Prisma.OrderUpdateOneRequiredWithoutTransactionNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrderCreateOrConnectWithoutTransactionInputSchema).optional(),
  upsert: z.lazy(() => OrderUpsertWithoutTransactionInputSchema).optional(),
  connect: z.lazy(() => OrderWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrderUpdateToOneWithWhereWithoutTransactionInputSchema),z.lazy(() => OrderUpdateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]).optional(),
}).strict();

export const InvoiceUpdateOneWithoutTransactionsNestedInputSchema: z.ZodType<Prisma.InvoiceUpdateOneWithoutTransactionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InvoiceCreateOrConnectWithoutTransactionsInputSchema).optional(),
  upsert: z.lazy(() => InvoiceUpsertWithoutTransactionsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => InvoiceWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => InvoiceWhereInputSchema) ]).optional(),
  connect: z.lazy(() => InvoiceWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InvoiceUpdateToOneWithWhereWithoutTransactionsInputSchema),z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateNestedManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateNestedManyWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const HouseholdCreateNestedOneWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateNestedOneWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInvoiceInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional()
}).strict();

export const TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateNestedManyWithoutInvoiceInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TransactionUpdateManyWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.TransactionUpdateManyWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema),z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema),z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema),z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TransactionScalarWhereInputSchema),z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const HouseholdUpdateOneRequiredWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.HouseholdUpdateOneRequiredWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => HouseholdCreateOrConnectWithoutInvoiceInputSchema).optional(),
  upsert: z.lazy(() => HouseholdUpsertWithoutInvoiceInputSchema).optional(),
  connect: z.lazy(() => HouseholdWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => HouseholdUpdateToOneWithWhereWithoutInvoiceInputSchema),z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyWithoutInvoiceNestedInput> = z.object({
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateWithoutInvoiceInputSchema).array(),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema),z.lazy(() => TransactionCreateOrConnectWithoutInvoiceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema),z.lazy(() => TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TransactionCreateManyInvoiceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TransactionWhereUniqueInputSchema),z.lazy(() => TransactionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema),z.lazy(() => TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema),z.lazy(() => TransactionUpdateManyWithWhereWithoutInvoiceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TransactionScalarWhereInputSchema),z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutCookingTeamsInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutCookingTeamsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional()
}).strict();

export const DinnerEventCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneRequiredWithoutCookingTeamsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutCookingTeamsInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutCookingTeamsInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutCookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManyCookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema).array(),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamCreateNestedOneWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutChefsInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutChefsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutChefsInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional()
}).strict();

export const CookingTeamCreateNestedOneWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutCooksInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutCooksInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutCooksInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional()
}).strict();

export const CookingTeamCreateNestedOneWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedOneWithoutJuniorHelpersInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutJuniorHelpersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutJuniorHelpersInputSchema).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional()
}).strict();

export const InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateNestedOneWithoutCookingTeamAssignmentInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional()
}).strict();

export const EnumRoleFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumRoleFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => RoleSchema).optional()
}).strict();

export const CookingTeamUpdateOneWithoutChefsNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneWithoutChefsNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutChefsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutChefsInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutChefsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutChefsInputSchema),z.lazy(() => CookingTeamUpdateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutChefsInputSchema) ]).optional(),
}).strict();

export const CookingTeamUpdateOneWithoutCooksNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneWithoutCooksNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutCooksInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutCooksInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutCooksInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutCooksInputSchema),z.lazy(() => CookingTeamUpdateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutCooksInputSchema) ]).optional(),
}).strict();

export const CookingTeamUpdateOneWithoutJuniorHelpersNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateOneWithoutJuniorHelpersNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutJuniorHelpersInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CookingTeamCreateOrConnectWithoutJuniorHelpersInputSchema).optional(),
  upsert: z.lazy(() => CookingTeamUpsertWithoutJuniorHelpersInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CookingTeamWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CookingTeamWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateToOneWithWhereWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUpdateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutJuniorHelpersInputSchema) ]).optional(),
}).strict();

export const InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema: z.ZodType<Prisma.InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInput> = z.object({
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema).optional(),
  upsert: z.lazy(() => InhabitantUpsertWithoutCookingTeamAssignmentInputSchema).optional(),
  connect: z.lazy(() => InhabitantWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateNestedManyWithoutSeasonInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional()
}).strict();

export const CookingTeamUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema),z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema),z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema).array(),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => CookingTeamCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => CookingTeamCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => CookingTeamWhereUniqueInputSchema),z.lazy(() => CookingTeamWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema),z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema).array(),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => TicketPriceCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TicketPriceCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TicketPriceWhereUniqueInputSchema),z.lazy(() => TicketPriceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema),z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutSeasonNestedInput> = z.object({
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema).array(),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema),z.lazy(() => DinnerEventCreateOrConnectWithoutSeasonInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DinnerEventCreateManySeasonInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DinnerEventWhereUniqueInputSchema),z.lazy(() => DinnerEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema),z.lazy(() => DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SeasonCreateNestedOneWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateNestedOneWithoutTicketPricesInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutTicketPricesInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional()
}).strict();

export const SeasonUpdateOneRequiredWithoutTicketPricesNestedInputSchema: z.ZodType<Prisma.SeasonUpdateOneRequiredWithoutTicketPricesNestedInput> = z.object({
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SeasonCreateOrConnectWithoutTicketPricesInputSchema).optional(),
  upsert: z.lazy(() => SeasonUpsertWithoutTicketPricesInputSchema).optional(),
  connect: z.lazy(() => SeasonWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SeasonUpdateToOneWithWhereWithoutTicketPricesInputSchema),z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]).optional(),
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
  _max: z.lazy(() => NestedIntFilterSchema).optional()
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
  _max: z.lazy(() => NestedStringFilterSchema).optional()
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
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
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

export const NestedEnumSystemRoleFilterSchema: z.ZodType<Prisma.NestedEnumSystemRoleFilter> = z.object({
  equals: z.lazy(() => SystemRoleSchema).optional(),
  in: z.lazy(() => SystemRoleSchema).array().optional(),
  notIn: z.lazy(() => SystemRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => NestedEnumSystemRoleFilterSchema) ]).optional(),
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

export const NestedEnumSystemRoleWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumSystemRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => SystemRoleSchema).optional(),
  in: z.lazy(() => SystemRoleSchema).array().optional(),
  notIn: z.lazy(() => SystemRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => NestedEnumSystemRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumSystemRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumSystemRoleFilterSchema).optional()
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
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const NestedEnumWeekdayFilterSchema: z.ZodType<Prisma.NestedEnumWeekdayFilter> = z.object({
  equals: z.lazy(() => WeekdaySchema).optional(),
  in: z.lazy(() => WeekdaySchema).array().optional(),
  notIn: z.lazy(() => WeekdaySchema).array().optional(),
  not: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => NestedEnumWeekdayFilterSchema) ]).optional(),
}).strict();

export const NestedEnumDinnerModeFilterSchema: z.ZodType<Prisma.NestedEnumDinnerModeFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => NestedEnumDinnerModeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumWeekdayWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumWeekdayWithAggregatesFilter> = z.object({
  equals: z.lazy(() => WeekdaySchema).optional(),
  in: z.lazy(() => WeekdaySchema).array().optional(),
  notIn: z.lazy(() => WeekdaySchema).array().optional(),
  not: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => NestedEnumWeekdayWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumWeekdayFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumWeekdayFilterSchema).optional()
}).strict();

export const NestedEnumDinnerModeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumDinnerModeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => DinnerModeSchema).optional(),
  in: z.lazy(() => DinnerModeSchema).array().optional(),
  notIn: z.lazy(() => DinnerModeSchema).array().optional(),
  not: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => NestedEnumDinnerModeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumDinnerModeFilterSchema).optional()
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
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
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
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const NestedEnumTicketTypeFilterSchema: z.ZodType<Prisma.NestedEnumTicketTypeFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => NestedEnumTicketTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumTicketTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumTicketTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => TicketTypeSchema).optional(),
  in: z.lazy(() => TicketTypeSchema).array().optional(),
  notIn: z.lazy(() => TicketTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => NestedEnumTicketTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumTicketTypeFilterSchema).optional()
}).strict();

export const NestedEnumRoleFilterSchema: z.ZodType<Prisma.NestedEnumRoleFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema),z.lazy(() => NestedEnumRoleFilterSchema) ]).optional(),
}).strict();

export const NestedEnumRoleWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RoleSchema).optional(),
  in: z.lazy(() => RoleSchema).array().optional(),
  notIn: z.lazy(() => RoleSchema).array().optional(),
  not: z.union([ z.lazy(() => RoleSchema),z.lazy(() => NestedEnumRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRoleFilterSchema).optional()
}).strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const AllergyCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateWithoutAllergyTypeInput> = z.object({
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutAllergiesInputSchema)
}).strict();

export const AllergyUncheckedCreateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateWithoutAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int()
}).strict();

export const AllergyCreateOrConnectWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateOrConnectWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyCreateManyAllergyTypeInputEnvelopeSchema: z.ZodType<Prisma.AllergyCreateManyAllergyTypeInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AllergyCreateManyAllergyTypeInputSchema),z.lazy(() => AllergyCreateManyAllergyTypeInputSchema).array() ]),
}).strict();

export const AllergyUpsertWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpsertWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AllergyUpdateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyCreateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyUpdateWithWhereUniqueWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateWithWhereUniqueWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateWithoutAllergyTypeInputSchema),z.lazy(() => AllergyUncheckedUpdateWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyUpdateManyWithWhereWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithWhereWithoutAllergyTypeInput> = z.object({
  where: z.lazy(() => AllergyScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateManyMutationInputSchema),z.lazy(() => AllergyUncheckedUpdateManyWithoutAllergyTypeInputSchema) ]),
}).strict();

export const AllergyScalarWhereInputSchema: z.ZodType<Prisma.AllergyScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AllergyScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AllergyScalarWhereInputSchema),z.lazy(() => AllergyScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  allergyTypeId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
}).strict();

export const InhabitantCreateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutAllergiesInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
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
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutAllergiesInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]),
}).strict();

export const AllergyTypeCreateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateWithoutAllergyInput> = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable()
}).strict();

export const AllergyTypeUncheckedCreateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedCreateWithoutAllergyInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable()
}).strict();

export const AllergyTypeCreateOrConnectWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeCreateOrConnectWithoutAllergyInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]),
}).strict();

export const InhabitantUpsertWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutAllergiesInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutAllergiesInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutAllergiesInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutAllergiesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutAllergiesInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutAllergiesInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutAllergiesInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
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
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const AllergyTypeUpsertWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpsertWithoutAllergyInput> = z.object({
  update: z.union([ z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyTypeCreateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedCreateWithoutAllergyInputSchema) ]),
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional()
}).strict();

export const AllergyTypeUpdateToOneWithWhereWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpdateToOneWithWhereWithoutAllergyInput> = z.object({
  where: z.lazy(() => AllergyTypeWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => AllergyTypeUpdateWithoutAllergyInputSchema),z.lazy(() => AllergyTypeUncheckedUpdateWithoutAllergyInputSchema) ]),
}).strict();

export const AllergyTypeUpdateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUpdateWithoutAllergyInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const AllergyTypeUncheckedUpdateWithoutAllergyInputSchema: z.ZodType<Prisma.AllergyTypeUncheckedUpdateWithoutAllergyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  icon: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InhabitantCreateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutUserInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutUserInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const InhabitantUpsertWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutUserInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutUserInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutUserInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutUserInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantCreateWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutDinnerPreferencesInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantUncheckedCreateWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutDinnerPreferencesInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  householdId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutDinnerPreferencesInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerPreferencesInputSchema) ]),
}).strict();

export const InhabitantUpsertWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutDinnerPreferencesInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerPreferencesInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerPreferencesInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutDinnerPreferencesInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerPreferencesInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerPreferencesInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutDinnerPreferencesInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantUncheckedUpdateWithoutDinnerPreferencesInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutDinnerPreferencesInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateWithoutInhabitantInput> = z.object({
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRole: z.lazy(() => SystemRoleSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const UserUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  email: z.string(),
  phone: z.string().optional().nullable(),
  passwordHash: z.string(),
  systemRole: z.lazy(() => SystemRoleSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const UserCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const HouseholdCreateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateWithoutInhabitantsInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  Invoice: z.lazy(() => InvoiceCreateNestedManyWithoutHouseHoldInputSchema).optional()
}).strict();

export const HouseholdUncheckedCreateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUncheckedCreateWithoutInhabitantsInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  Invoice: z.lazy(() => InvoiceUncheckedCreateNestedManyWithoutHouseHoldInputSchema).optional()
}).strict();

export const HouseholdCreateOrConnectWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdCreateOrConnectWithoutInhabitantsInput> = z.object({
  where: z.lazy(() => HouseholdWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]),
}).strict();

export const AllergyCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateWithoutInhabitantInput> = z.object({
  allergyType: z.lazy(() => AllergyTypeCreateNestedOneWithoutAllergyInputSchema)
}).strict();

export const AllergyUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  allergyTypeId: z.number().int()
}).strict();

export const AllergyCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.AllergyCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AllergyCreateManyInhabitantInputSchema),z.lazy(() => AllergyCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const DinnerPreferenceCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateWithoutInhabitantInput> = z.object({
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema)
}).strict();

export const DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema)
}).strict();

export const DinnerPreferenceCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerPreferenceCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.DinnerPreferenceCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerPreferenceCreateManyInhabitantInputSchema),z.lazy(() => DinnerPreferenceCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const DinnerEventCreateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutChefInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional()
}).strict();

export const DinnerEventUncheckedCreateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutChefInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional()
}).strict();

export const DinnerEventCreateOrConnectWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventCreateManyChefInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManyChefInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManyChefInputSchema),z.lazy(() => DinnerEventCreateManyChefInputSchema).array() ]),
}).strict();

export const OrderCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateWithoutInhabitantInput> = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyInhabitantInputSchema),z.lazy(() => OrderCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutInhabitantInput> = z.object({
  role: z.lazy(() => RoleSchema),
  chefForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutChefsInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutCooksInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutJuniorHelpersInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutInhabitantInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyInhabitantInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInhabitantInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentCreateManyInhabitantInputSchema).array() ]),
}).strict();

export const UserUpsertWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpsertWithoutInhabitantInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedCreateWithoutInhabitantInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutInhabitantInputSchema),z.lazy(() => UserUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const UserUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUpdateWithoutInhabitantInput> = z.object({
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  passwordHash: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  systemRole: z.union([ z.lazy(() => SystemRoleSchema),z.lazy(() => EnumSystemRoleFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const HouseholdUpsertWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpsertWithoutInhabitantsInput> = z.object({
  update: z.union([ z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInhabitantsInputSchema) ]),
  where: z.lazy(() => HouseholdWhereInputSchema).optional()
}).strict();

export const HouseholdUpdateToOneWithWhereWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpdateToOneWithWhereWithoutInhabitantsInput> = z.object({
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => HouseholdUpdateWithoutInhabitantsInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInhabitantsInputSchema) ]),
}).strict();

export const HouseholdUpdateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUpdateWithoutInhabitantsInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  Invoice: z.lazy(() => InvoiceUpdateManyWithoutHouseHoldNestedInputSchema).optional()
}).strict();

export const HouseholdUncheckedUpdateWithoutInhabitantsInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateWithoutInhabitantsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  Invoice: z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldNestedInputSchema).optional()
}).strict();

export const AllergyUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AllergyUpdateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => AllergyCreateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateWithoutInhabitantInputSchema),z.lazy(() => AllergyUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const AllergyUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => AllergyScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AllergyUpdateManyMutationInputSchema),z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerPreferenceUpdateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerPreferenceCreateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => DinnerPreferenceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerPreferenceUpdateWithoutInhabitantInputSchema),z.lazy(() => DinnerPreferenceUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => DinnerPreferenceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerPreferenceUpdateManyMutationInputSchema),z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const DinnerPreferenceScalarWhereInputSchema: z.ZodType<Prisma.DinnerPreferenceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerPreferenceScalarWhereInputSchema),z.lazy(() => DinnerPreferenceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerPreferenceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerPreferenceScalarWhereInputSchema),z.lazy(() => DinnerPreferenceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  weekday: z.union([ z.lazy(() => EnumWeekdayFilterSchema),z.lazy(() => WeekdaySchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutChefInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutChefInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutChefInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema),z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefInputSchema) ]),
}).strict();

export const DinnerEventScalarWhereInputSchema: z.ZodType<Prisma.DinnerEventScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DinnerEventScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DinnerEventScalarWhereInputSchema),z.lazy(() => DinnerEventScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  date: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  menuTitle: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  menuDescription: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  menuPictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => EnumDinnerModeFilterSchema),z.lazy(() => DinnerModeSchema) ]).optional(),
  chefId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  cookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
}).strict();

export const OrderUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutInhabitantInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema),z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const OrderScalarWhereInputSchema: z.ZodType<Prisma.OrderScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrderScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrderScalarWhereInputSchema),z.lazy(() => OrderScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  dinnerEventId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutInhabitantInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutInhabitantInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInputSchema) ]),
}).strict();

export const CookingTeamAssignmentScalarWhereInputSchema: z.ZodType<Prisma.CookingTeamAssignmentScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  chefForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  inhabitantId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema),z.lazy(() => RoleSchema) ]).optional(),
}).strict();

export const InhabitantCreateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutHouseholdInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantUncheckedCreateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedCreateWithoutHouseholdInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantCreateManyHouseholdInputEnvelopeSchema: z.ZodType<Prisma.InhabitantCreateManyHouseholdInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => InhabitantCreateManyHouseholdInputSchema),z.lazy(() => InhabitantCreateManyHouseholdInputSchema).array() ]),
}).strict();

export const InvoiceCreateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateWithoutHouseHoldInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  transactions: z.lazy(() => TransactionCreateNestedManyWithoutInvoiceInputSchema).optional()
}).strict();

export const InvoiceUncheckedCreateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateWithoutHouseHoldInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  transactions: z.lazy(() => TransactionUncheckedCreateNestedManyWithoutInvoiceInputSchema).optional()
}).strict();

export const InvoiceCreateOrConnectWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateOrConnectWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceCreateManyHouseHoldInputEnvelopeSchema: z.ZodType<Prisma.InvoiceCreateManyHouseHoldInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => InvoiceCreateManyHouseHoldInputSchema),z.lazy(() => InvoiceCreateManyHouseHoldInputSchema).array() ]),
}).strict();

export const InhabitantUpsertWithWhereUniqueWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpsertWithWhereUniqueWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutHouseholdInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantUpdateWithWhereUniqueWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateWithWhereUniqueWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutHouseholdInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantUpdateManyWithWhereWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateManyWithWhereWithoutHouseholdInput> = z.object({
  where: z.lazy(() => InhabitantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => InhabitantUpdateManyMutationInputSchema),z.lazy(() => InhabitantUncheckedUpdateManyWithoutHouseholdInputSchema) ]),
}).strict();

export const InhabitantScalarWhereInputSchema: z.ZodType<Prisma.InhabitantScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema),z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InhabitantScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InhabitantScalarWhereInputSchema),z.lazy(() => InhabitantScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  heynaboId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  userId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  pictureUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
}).strict();

export const InvoiceUpsertWithWhereUniqueWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpsertWithWhereUniqueWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => InvoiceUpdateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedUpdateWithoutHouseHoldInputSchema) ]),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceUpdateWithWhereUniqueWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateWithWhereUniqueWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateWithoutHouseHoldInputSchema),z.lazy(() => InvoiceUncheckedUpdateWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceUpdateManyWithWhereWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateManyWithWhereWithoutHouseHoldInput> = z.object({
  where: z.lazy(() => InvoiceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => InvoiceUpdateManyMutationInputSchema),z.lazy(() => InvoiceUncheckedUpdateManyWithoutHouseHoldInputSchema) ]),
}).strict();

export const InvoiceScalarWhereInputSchema: z.ZodType<Prisma.InvoiceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema),z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => InvoiceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => InvoiceScalarWhereInputSchema),z.lazy(() => InvoiceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  cutoffDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  paymentDate: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  householdId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
}).strict();

export const InhabitantCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutDinnerEventInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutDinnersInput> = z.object({
  name: z.string(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  chefs: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutDinnersInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamCreateOrConnectWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutDinnersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]),
}).strict();

export const OrderCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateWithoutDinnerEventInput> = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema),
  Transaction: z.lazy(() => TransactionCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderUncheckedCreateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  Transaction: z.lazy(() => TransactionUncheckedCreateNestedOneWithoutOrderInputSchema).optional()
}).strict();

export const OrderCreateOrConnectWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderCreateManyDinnerEventInputEnvelopeSchema: z.ZodType<Prisma.OrderCreateManyDinnerEventInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrderCreateManyDinnerEventInputSchema),z.lazy(() => OrderCreateManyDinnerEventInputSchema).array() ]),
}).strict();

export const SeasonCreateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateWithoutDinnerEventsInput> = z.object({
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonUncheckedCreateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutDinnerEventsInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonCreateOrConnectWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutDinnerEventsInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]),
}).strict();

export const InhabitantUpsertWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutDinnerEventInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutDinnerEventInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutDinnerEventInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutDinnerEventInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutDinnerEventInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const CookingTeamUpsertWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutDinnersInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutDinnersInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional()
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutDinnersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutDinnersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutDinnersInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutDinnersInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateWithoutDinnersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutDinnersInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const OrderUpsertWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpsertWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrderUpdateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutDinnerEventInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedCreateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderUpdateWithWhereUniqueWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateWithWhereUniqueWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateWithoutDinnerEventInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutDinnerEventInputSchema) ]),
}).strict();

export const OrderUpdateManyWithWhereWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateManyWithWhereWithoutDinnerEventInput> = z.object({
  where: z.lazy(() => OrderScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrderUpdateManyMutationInputSchema),z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventInputSchema) ]),
}).strict();

export const SeasonUpsertWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutDinnerEventsInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutDinnerEventsInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional()
}).strict();

export const SeasonUpdateToOneWithWhereWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutDinnerEventsInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutDinnerEventsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutDinnerEventsInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutDinnerEventsInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const SeasonUncheckedUpdateWithoutDinnerEventsInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutDinnerEventsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const DinnerEventCreateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutTicketsInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional()
}).strict();

export const DinnerEventUncheckedCreateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutTicketsInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable()
}).strict();

export const DinnerEventCreateOrConnectWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutTicketsInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]),
}).strict();

export const InhabitantCreateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutOrderInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutInhabitantInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutOrderInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const TransactionCreateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateWithoutOrderInput> = z.object({
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  invoice: z.lazy(() => InvoiceCreateNestedOneWithoutTransactionsInputSchema).optional()
}).strict();

export const TransactionUncheckedCreateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateWithoutOrderInput> = z.object({
  id: z.number().int().optional(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  invoiceId: z.number().int().optional().nullable()
}).strict();

export const TransactionCreateOrConnectWithoutOrderInputSchema: z.ZodType<Prisma.TransactionCreateOrConnectWithoutOrderInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]),
}).strict();

export const DinnerEventUpsertWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithoutTicketsInput> = z.object({
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutTicketsInputSchema) ]),
  where: z.lazy(() => DinnerEventWhereInputSchema).optional()
}).strict();

export const DinnerEventUpdateToOneWithWhereWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpdateToOneWithWhereWithoutTicketsInput> = z.object({
  where: z.lazy(() => DinnerEventWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutTicketsInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutTicketsInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutTicketsInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateWithoutTicketsInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutTicketsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InhabitantUpsertWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutOrderInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutOrderInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutOrderInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutOrderInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutOrderInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutOrderInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutOrderInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const TransactionUpsertWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpsertWithoutOrderInput> = z.object({
  update: z.union([ z.lazy(() => TransactionUpdateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]),
  create: z.union([ z.lazy(() => TransactionCreateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutOrderInputSchema) ]),
  where: z.lazy(() => TransactionWhereInputSchema).optional()
}).strict();

export const TransactionUpdateToOneWithWhereWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpdateToOneWithWhereWithoutOrderInput> = z.object({
  where: z.lazy(() => TransactionWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => TransactionUpdateWithoutOrderInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutOrderInputSchema) ]),
}).strict();

export const TransactionUpdateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUpdateWithoutOrderInput> = z.object({
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoice: z.lazy(() => InvoiceUpdateOneWithoutTransactionsNestedInputSchema).optional()
}).strict();

export const TransactionUncheckedUpdateWithoutOrderInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateWithoutOrderInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderCreateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateWithoutTransactionInput> = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  dinnerEvent: z.lazy(() => DinnerEventCreateNestedOneWithoutTicketsInputSchema),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutOrderInputSchema)
}).strict();

export const OrderUncheckedCreateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUncheckedCreateWithoutTransactionInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema)
}).strict();

export const OrderCreateOrConnectWithoutTransactionInputSchema: z.ZodType<Prisma.OrderCreateOrConnectWithoutTransactionInput> = z.object({
  where: z.lazy(() => OrderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]),
}).strict();

export const InvoiceCreateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateWithoutTransactionsInput> = z.object({
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  houseHold: z.lazy(() => HouseholdCreateNestedOneWithoutInvoiceInputSchema)
}).strict();

export const InvoiceUncheckedCreateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUncheckedCreateWithoutTransactionsInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  householdId: z.number().int()
}).strict();

export const InvoiceCreateOrConnectWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceCreateOrConnectWithoutTransactionsInput> = z.object({
  where: z.lazy(() => InvoiceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]),
}).strict();

export const OrderUpsertWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpsertWithoutTransactionInput> = z.object({
  update: z.union([ z.lazy(() => OrderUpdateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]),
  create: z.union([ z.lazy(() => OrderCreateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedCreateWithoutTransactionInputSchema) ]),
  where: z.lazy(() => OrderWhereInputSchema).optional()
}).strict();

export const OrderUpdateToOneWithWhereWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpdateToOneWithWhereWithoutTransactionInput> = z.object({
  where: z.lazy(() => OrderWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrderUpdateWithoutTransactionInputSchema),z.lazy(() => OrderUncheckedUpdateWithoutTransactionInputSchema) ]),
}).strict();

export const OrderUpdateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUpdateWithoutTransactionInput> = z.object({
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateWithoutTransactionInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutTransactionInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InvoiceUpsertWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpsertWithoutTransactionsInput> = z.object({
  update: z.union([ z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]),
  create: z.union([ z.lazy(() => InvoiceCreateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedCreateWithoutTransactionsInputSchema) ]),
  where: z.lazy(() => InvoiceWhereInputSchema).optional()
}).strict();

export const InvoiceUpdateToOneWithWhereWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpdateToOneWithWhereWithoutTransactionsInput> = z.object({
  where: z.lazy(() => InvoiceWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InvoiceUpdateWithoutTransactionsInputSchema),z.lazy(() => InvoiceUncheckedUpdateWithoutTransactionsInputSchema) ]),
}).strict();

export const InvoiceUpdateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUpdateWithoutTransactionsInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  houseHold: z.lazy(() => HouseholdUpdateOneRequiredWithoutInvoiceNestedInputSchema).optional()
}).strict();

export const InvoiceUncheckedUpdateWithoutTransactionsInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateWithoutTransactionsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  householdId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateWithoutInvoiceInput> = z.object({
  amount: z.number().int(),
  createdAt: z.coerce.date().optional(),
  order: z.lazy(() => OrderCreateNestedOneWithoutTransactionInputSchema)
}).strict();

export const TransactionUncheckedCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedCreateWithoutInvoiceInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TransactionCreateOrConnectWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateOrConnectWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionCreateManyInvoiceInputEnvelopeSchema: z.ZodType<Prisma.TransactionCreateManyInvoiceInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TransactionCreateManyInvoiceInputSchema),z.lazy(() => TransactionCreateManyInvoiceInputSchema).array() ]),
}).strict();

export const HouseholdCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateWithoutInvoiceInput> = z.object({
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantCreateNestedManyWithoutHouseholdInputSchema).optional()
}).strict();

export const HouseholdUncheckedCreateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUncheckedCreateWithoutInvoiceInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  pbsId: z.number().int(),
  movedInDate: z.coerce.date(),
  moveOutDate: z.coerce.date().optional().nullable(),
  name: z.string(),
  address: z.string(),
  inhabitants: z.lazy(() => InhabitantUncheckedCreateNestedManyWithoutHouseholdInputSchema).optional()
}).strict();

export const HouseholdCreateOrConnectWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdCreateOrConnectWithoutInvoiceInput> = z.object({
  where: z.lazy(() => HouseholdWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionUpsertWithWhereUniqueWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpsertWithWhereUniqueWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TransactionUpdateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutInvoiceInputSchema) ]),
  create: z.union([ z.lazy(() => TransactionCreateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedCreateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionUpdateWithWhereUniqueWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateWithWhereUniqueWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TransactionUpdateWithoutInvoiceInputSchema),z.lazy(() => TransactionUncheckedUpdateWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionUpdateManyWithWhereWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateManyWithWhereWithoutInvoiceInput> = z.object({
  where: z.lazy(() => TransactionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TransactionUpdateManyMutationInputSchema),z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceInputSchema) ]),
}).strict();

export const TransactionScalarWhereInputSchema: z.ZodType<Prisma.TransactionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TransactionScalarWhereInputSchema),z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TransactionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TransactionScalarWhereInputSchema),z.lazy(() => TransactionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  orderId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  invoiceId: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
}).strict();

export const HouseholdUpsertWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpsertWithoutInvoiceInput> = z.object({
  update: z.union([ z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]),
  create: z.union([ z.lazy(() => HouseholdCreateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedCreateWithoutInvoiceInputSchema) ]),
  where: z.lazy(() => HouseholdWhereInputSchema).optional()
}).strict();

export const HouseholdUpdateToOneWithWhereWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpdateToOneWithWhereWithoutInvoiceInput> = z.object({
  where: z.lazy(() => HouseholdWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => HouseholdUpdateWithoutInvoiceInputSchema),z.lazy(() => HouseholdUncheckedUpdateWithoutInvoiceInputSchema) ]),
}).strict();

export const HouseholdUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUpdateWithoutInvoiceInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUpdateManyWithoutHouseholdNestedInputSchema).optional()
}).strict();

export const HouseholdUncheckedUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.HouseholdUncheckedUpdateWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pbsId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  movedInDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  moveOutDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  address: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitants: z.lazy(() => InhabitantUncheckedUpdateManyWithoutHouseholdNestedInputSchema).optional()
}).strict();

export const SeasonCreateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateWithoutCookingTeamsInput> = z.object({
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  ticketPrices: z.lazy(() => TicketPriceCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonUncheckedCreateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutCookingTeamsInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonCreateOrConnectWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutCookingTeamsInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]),
}).strict();

export const DinnerEventCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutCookingTeamInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional(),
  Season: z.lazy(() => SeasonCreateNestedOneWithoutDinnerEventsInputSchema).optional()
}).strict();

export const DinnerEventUncheckedCreateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional()
}).strict();

export const DinnerEventCreateOrConnectWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventCreateManyCookingTeamInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManyCookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManyCookingTeamInputSchema),z.lazy(() => DinnerEventCreateManyCookingTeamInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutChefForCcookingTeamInput> = z.object({
  role: z.lazy(() => RoleSchema),
  cookForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutCooksInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutJuniorHelpersInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema)
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutChefForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyChefForCcookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateManyChefForCcookingTeamInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutCookForCcookingTeamInput> = z.object({
  role: z.lazy(() => RoleSchema),
  chefForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutChefsInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutJuniorHelpersInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema)
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutCookForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyCookForCcookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateManyCookForCcookingTeamInputSchema).array() ]),
}).strict();

export const CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInput> = z.object({
  role: z.lazy(() => RoleSchema),
  chefForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutChefsInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutCooksInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantCreateNestedOneWithoutCookingTeamAssignmentInputSchema)
}).strict();

export const CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateOrConnectWithoutJuniorForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputSchema).array() ]),
}).strict();

export const SeasonUpsertWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutCookingTeamsInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutCookingTeamsInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional()
}).strict();

export const SeasonUpdateToOneWithWhereWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutCookingTeamsInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutCookingTeamsInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutCookingTeamsInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutCookingTeamsInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPrices: z.lazy(() => TicketPriceUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const SeasonUncheckedUpdateWithoutCookingTeamsInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutCookingTeamsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketPrices: z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutCookingTeamInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutCookingTeamInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema),z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutChefForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutChefForCcookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutChefForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutChefForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutChefForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutChefForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutChefForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutCookForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutCookForCcookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutCookForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutCookForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutCookForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutCookForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutCookForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertWithWhereUniqueWithoutJuniorForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutJuniorForCcookingTeamInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamAssignmentCreateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedCreateWithoutJuniorForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithWhereUniqueWithoutJuniorForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateWithoutJuniorForCcookingTeamInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateWithoutJuniorForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyWithWhereWithoutJuniorForCcookingTeamInput> = z.object({
  where: z.lazy(() => CookingTeamAssignmentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamAssignmentUpdateManyMutationInputSchema),z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutChefsInput> = z.object({
  name: z.string(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutChefsInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamCreateOrConnectWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutChefsInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutChefsInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutCooksInput> = z.object({
  name: z.string(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutCooksInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamCreateOrConnectWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutCooksInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutCooksInputSchema) ]),
}).strict();

export const CookingTeamCreateWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutJuniorHelpersInput> = z.object({
  name: z.string(),
  season: z.lazy(() => SeasonCreateNestedOneWithoutCookingTeamsInputSchema),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutJuniorHelpersInput> = z.object({
  id: z.number().int().optional(),
  seasonId: z.number().int(),
  name: z.string(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamCreateOrConnectWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutJuniorHelpersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutJuniorHelpersInputSchema) ]),
}).strict();

export const InhabitantCreateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateWithoutCookingTeamAssignmentInput> = z.object({
  heynaboId: z.number().int(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutInhabitantInputSchema).optional(),
  household: z.lazy(() => HouseholdCreateNestedOneWithoutInhabitantsInputSchema),
  allergies: z.lazy(() => AllergyCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderCreateNestedManyWithoutInhabitantInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutChefInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedCreateNestedManyWithoutInhabitantInputSchema).optional()
}).strict();

export const InhabitantCreateOrConnectWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantCreateOrConnectWithoutCookingTeamAssignmentInput> = z.object({
  where: z.lazy(() => InhabitantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]),
}).strict();

export const CookingTeamUpsertWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutChefsInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutChefsInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutChefsInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional()
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutChefsInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutChefsInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutChefsInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutChefsInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateWithoutChefsInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutChefsInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUpsertWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutCooksInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutCooksInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutCooksInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional()
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutCooksInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutCooksInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutCooksInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutCooksInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateWithoutCooksInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutCooksInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUpsertWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithoutJuniorHelpersInput> = z.object({
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutJuniorHelpersInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutJuniorHelpersInputSchema) ]),
  where: z.lazy(() => CookingTeamWhereInputSchema).optional()
}).strict();

export const CookingTeamUpdateToOneWithWhereWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamUpdateToOneWithWhereWithoutJuniorHelpersInput> = z.object({
  where: z.lazy(() => CookingTeamWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutJuniorHelpersInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutJuniorHelpersInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutJuniorHelpersInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  season: z.lazy(() => SeasonUpdateOneRequiredWithoutCookingTeamsNestedInputSchema).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateWithoutJuniorHelpersInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutJuniorHelpersInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional()
}).strict();

export const InhabitantUpsertWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpsertWithoutCookingTeamAssignmentInput> = z.object({
  update: z.union([ z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]),
  create: z.union([ z.lazy(() => InhabitantCreateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedCreateWithoutCookingTeamAssignmentInputSchema) ]),
  where: z.lazy(() => InhabitantWhereInputSchema).optional()
}).strict();

export const InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpdateToOneWithWhereWithoutCookingTeamAssignmentInput> = z.object({
  where: z.lazy(() => InhabitantWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => InhabitantUpdateWithoutCookingTeamAssignmentInputSchema),z.lazy(() => InhabitantUncheckedUpdateWithoutCookingTeamAssignmentInputSchema) ]),
}).strict();

export const InhabitantUpdateWithoutCookingTeamAssignmentInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutCookingTeamAssignmentInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  household: z.lazy(() => HouseholdUpdateOneRequiredWithoutInhabitantsNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional()
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
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const CookingTeamCreateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateWithoutSeasonInput> = z.object({
  name: z.string(),
  dinners: z.lazy(() => DinnerEventCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  dinners: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutCookingTeamInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutChefForCcookingTeamInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutCookForCcookingTeamInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedCreateNestedManyWithoutJuniorForCcookingTeamInputSchema).optional()
}).strict();

export const CookingTeamCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.CookingTeamCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => CookingTeamCreateManySeasonInputSchema),z.lazy(() => CookingTeamCreateManySeasonInputSchema).array() ]),
}).strict();

export const TicketPriceCreateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateWithoutSeasonInput> = z.object({
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable()
}).strict();

export const TicketPriceUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable()
}).strict();

export const TicketPriceCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.TicketPriceCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TicketPriceCreateManySeasonInputSchema),z.lazy(() => TicketPriceCreateManySeasonInputSchema).array() ]),
}).strict();

export const DinnerEventCreateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateWithoutSeasonInput> = z.object({
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  chef: z.lazy(() => InhabitantCreateNestedOneWithoutDinnerEventInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamCreateNestedOneWithoutDinnersInputSchema).optional(),
  tickets: z.lazy(() => OrderCreateNestedManyWithoutDinnerEventInputSchema).optional()
}).strict();

export const DinnerEventUncheckedCreateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedCreateWithoutSeasonInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tickets: z.lazy(() => OrderUncheckedCreateNestedManyWithoutDinnerEventInputSchema).optional()
}).strict();

export const DinnerEventCreateOrConnectWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateOrConnectWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventCreateManySeasonInputEnvelopeSchema: z.ZodType<Prisma.DinnerEventCreateManySeasonInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DinnerEventCreateManySeasonInputSchema),z.lazy(() => DinnerEventCreateManySeasonInputSchema).array() ]),
}).strict();

export const CookingTeamUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => CookingTeamUpdateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => CookingTeamCreateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => CookingTeamUpdateWithoutSeasonInputSchema),z.lazy(() => CookingTeamUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => CookingTeamScalarWhereInputSchema),
  data: z.union([ z.lazy(() => CookingTeamUpdateManyMutationInputSchema),z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const CookingTeamScalarWhereInputSchema: z.ZodType<Prisma.CookingTeamScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema),z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CookingTeamScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CookingTeamScalarWhereInputSchema),z.lazy(() => CookingTeamScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const TicketPriceUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TicketPriceUpdateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => TicketPriceCreateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TicketPriceUpdateWithoutSeasonInputSchema),z.lazy(() => TicketPriceUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => TicketPriceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TicketPriceUpdateManyMutationInputSchema),z.lazy(() => TicketPriceUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const TicketPriceScalarWhereInputSchema: z.ZodType<Prisma.TicketPriceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema),z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TicketPriceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TicketPriceScalarWhereInputSchema),z.lazy(() => TicketPriceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  seasonId: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  ticketType: z.union([ z.lazy(() => EnumTicketTypeFilterSchema),z.lazy(() => TicketTypeSchema) ]).optional(),
  price: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const DinnerEventUpsertWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpsertWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DinnerEventUpdateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutSeasonInputSchema) ]),
  create: z.union([ z.lazy(() => DinnerEventCreateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedCreateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventUpdateWithWhereUniqueWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithWhereUniqueWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateWithoutSeasonInputSchema),z.lazy(() => DinnerEventUncheckedUpdateWithoutSeasonInputSchema) ]),
}).strict();

export const DinnerEventUpdateManyWithWhereWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateManyWithWhereWithoutSeasonInput> = z.object({
  where: z.lazy(() => DinnerEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DinnerEventUpdateManyMutationInputSchema),z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonInputSchema) ]),
}).strict();

export const SeasonCreateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateWithoutTicketPricesInput> = z.object({
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonUncheckedCreateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUncheckedCreateWithoutTicketPricesInput> = z.object({
  id: z.number().int().optional(),
  shortName: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  cookingDays: z.string(),
  holidays: z.string(),
  ticketIsCancellableDaysBefore: z.number().int(),
  diningModeIsEditableMinutesBefore: z.number().int(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedCreateNestedManyWithoutSeasonInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedCreateNestedManyWithoutSeasonInputSchema).optional()
}).strict();

export const SeasonCreateOrConnectWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonCreateOrConnectWithoutTicketPricesInput> = z.object({
  where: z.lazy(() => SeasonWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]),
}).strict();

export const SeasonUpsertWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpsertWithoutTicketPricesInput> = z.object({
  update: z.union([ z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]),
  create: z.union([ z.lazy(() => SeasonCreateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedCreateWithoutTicketPricesInputSchema) ]),
  where: z.lazy(() => SeasonWhereInputSchema).optional()
}).strict();

export const SeasonUpdateToOneWithWhereWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpdateToOneWithWhereWithoutTicketPricesInput> = z.object({
  where: z.lazy(() => SeasonWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SeasonUpdateWithoutTicketPricesInputSchema),z.lazy(() => SeasonUncheckedUpdateWithoutTicketPricesInputSchema) ]),
}).strict();

export const SeasonUpdateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUpdateWithoutTicketPricesInput> = z.object({
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const SeasonUncheckedUpdateWithoutTicketPricesInputSchema: z.ZodType<Prisma.SeasonUncheckedUpdateWithoutTicketPricesInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  shortName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  cookingDays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  holidays: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  ticketIsCancellableDaysBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  diningModeIsEditableMinutesBefore: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  CookingTeams: z.lazy(() => CookingTeamUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional(),
  dinnerEvents: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutSeasonNestedInputSchema).optional()
}).strict();

export const AllergyCreateManyAllergyTypeInputSchema: z.ZodType<Prisma.AllergyCreateManyAllergyTypeInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int()
}).strict();

export const AllergyUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUpdateWithoutAllergyTypeInput> = z.object({
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutAllergiesNestedInputSchema).optional()
}).strict();

export const AllergyUncheckedUpdateWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutAllergyTypeInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutAllergyTypeInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyCreateManyInhabitantInputSchema: z.ZodType<Prisma.AllergyCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  allergyTypeId: z.number().int()
}).strict();

export const DinnerPreferenceCreateManyInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  weekday: z.lazy(() => WeekdaySchema),
  dinnerMode: z.lazy(() => DinnerModeSchema)
}).strict();

export const DinnerEventCreateManyChefInputSchema: z.ZodType<Prisma.DinnerEventCreateManyChefInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable()
}).strict();

export const OrderCreateManyInhabitantInputSchema: z.ZodType<Prisma.OrderCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  dinnerEventId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema)
}).strict();

export const CookingTeamAssignmentCreateManyInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyInhabitantInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const AllergyUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUpdateWithoutInhabitantInput> = z.object({
  allergyType: z.lazy(() => AllergyTypeUpdateOneRequiredWithoutAllergyNestedInputSchema).optional()
}).strict();

export const AllergyUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AllergyUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.AllergyUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  allergyTypeId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUpdateWithoutInhabitantInput> = z.object({
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerPreferenceUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.DinnerPreferenceUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  weekday: z.union([ z.lazy(() => WeekdaySchema),z.lazy(() => EnumWeekdayFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventUpdateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutChefInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutChefInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutChefInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutChefInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const OrderUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUpdateWithoutInhabitantInput> = z.object({
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEvent: z.lazy(() => DinnerEventUpdateOneRequiredWithoutTicketsNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  dinnerEventId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutInhabitantInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  chefForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutChefsNestedInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutCooksNestedInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutJuniorHelpersNestedInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const InhabitantCreateManyHouseholdInputSchema: z.ZodType<Prisma.InhabitantCreateManyHouseholdInput> = z.object({
  id: z.number().int().optional(),
  heynaboId: z.number().int(),
  userId: z.number().int().optional().nullable(),
  pictureUrl: z.string().optional().nullable(),
  name: z.string(),
  lastName: z.string(),
  birthDate: z.coerce.date().optional().nullable()
}).strict();

export const InvoiceCreateManyHouseHoldInputSchema: z.ZodType<Prisma.InvoiceCreateManyHouseHoldInput> = z.object({
  id: z.number().int().optional(),
  cutoffDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional()
}).strict();

export const InhabitantUpdateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUpdateWithoutHouseholdInput> = z.object({
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneWithoutInhabitantNestedInputSchema).optional(),
  allergies: z.lazy(() => AllergyUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantUncheckedUpdateWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateWithoutHouseholdInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  allergies: z.lazy(() => AllergyUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  dinnerPreferences: z.lazy(() => DinnerPreferenceUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  DinnerEvent: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutChefNestedInputSchema).optional(),
  Order: z.lazy(() => OrderUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional(),
  CookingTeamAssignment: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutInhabitantNestedInputSchema).optional()
}).strict();

export const InhabitantUncheckedUpdateManyWithoutHouseholdInputSchema: z.ZodType<Prisma.InhabitantUncheckedUpdateManyWithoutHouseholdInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  heynaboId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const InvoiceUpdateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUpdateWithoutHouseHoldInput> = z.object({
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUpdateManyWithoutInvoiceNestedInputSchema).optional()
}).strict();

export const InvoiceUncheckedUpdateWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateWithoutHouseHoldInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  transactions: z.lazy(() => TransactionUncheckedUpdateManyWithoutInvoiceNestedInputSchema).optional()
}).strict();

export const InvoiceUncheckedUpdateManyWithoutHouseHoldInputSchema: z.ZodType<Prisma.InvoiceUncheckedUpdateManyWithoutHouseHoldInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cutoffDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paymentDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const OrderCreateManyDinnerEventInputSchema: z.ZodType<Prisma.OrderCreateManyDinnerEventInput> = z.object({
  id: z.number().int().optional(),
  inhabitantId: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ticketType: z.lazy(() => TicketTypeSchema)
}).strict();

export const OrderUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUpdateWithoutDinnerEventInput> = z.object({
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutOrderNestedInputSchema).optional(),
  Transaction: z.lazy(() => TransactionUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  Transaction: z.lazy(() => TransactionUncheckedUpdateOneWithoutOrderNestedInputSchema).optional()
}).strict();

export const OrderUncheckedUpdateManyWithoutDinnerEventInputSchema: z.ZodType<Prisma.OrderUncheckedUpdateManyWithoutDinnerEventInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionCreateManyInvoiceInputSchema: z.ZodType<Prisma.TransactionCreateManyInvoiceInput> = z.object({
  id: z.number().int().optional(),
  orderId: z.number().int(),
  amount: z.number().int(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TransactionUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUpdateWithoutInvoiceInput> = z.object({
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  order: z.lazy(() => OrderUpdateOneRequiredWithoutTransactionNestedInputSchema).optional()
}).strict();

export const TransactionUncheckedUpdateWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TransactionUncheckedUpdateManyWithoutInvoiceInputSchema: z.ZodType<Prisma.TransactionUncheckedUpdateManyWithoutInvoiceInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  orderId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DinnerEventCreateManyCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventCreateManyCookingTeamInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  seasonId: z.number().int().optional().nullable()
}).strict();

export const CookingTeamAssignmentCreateManyChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyChefForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateManyCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyCookForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  juniorForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const CookingTeamAssignmentCreateManyJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyJuniorForCcookingTeamInput> = z.object({
  id: z.number().int().optional(),
  chefForcookingTeamId: z.number().int().optional().nullable(),
  cookForcookingTeamId: z.number().int().optional().nullable(),
  inhabitantId: z.number().int(),
  role: z.lazy(() => RoleSchema)
}).strict();

export const DinnerEventUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutCookingTeamInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional(),
  Season: z.lazy(() => SeasonUpdateOneWithoutDinnerEventsNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutCookingTeamInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutCookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  seasonId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutChefForCcookingTeamInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutCooksNestedInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutJuniorHelpersNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutChefForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutCookForCcookingTeamInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  chefForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutChefsNestedInputSchema).optional(),
  juniorForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutJuniorHelpersNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutCookForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  juniorForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUpdateWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateWithoutJuniorForCcookingTeamInput> = z.object({
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  chefForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutChefsNestedInputSchema).optional(),
  cookForCcookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutCooksNestedInputSchema).optional(),
  inhabitant: z.lazy(() => InhabitantUpdateOneRequiredWithoutCookingTeamAssignmentNestedInputSchema).optional()
}).strict();

export const CookingTeamAssignmentUncheckedUpdateWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateWithoutJuniorForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamInputSchema: z.ZodType<Prisma.CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  chefForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookForcookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  inhabitantId: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CookingTeamCreateManySeasonInputSchema: z.ZodType<Prisma.CookingTeamCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  name: z.string()
}).strict();

export const TicketPriceCreateManySeasonInputSchema: z.ZodType<Prisma.TicketPriceCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  ticketType: z.lazy(() => TicketTypeSchema),
  price: z.number().int(),
  description: z.string().optional().nullable()
}).strict();

export const DinnerEventCreateManySeasonInputSchema: z.ZodType<Prisma.DinnerEventCreateManySeasonInput> = z.object({
  id: z.number().int().optional(),
  date: z.coerce.date(),
  menuTitle: z.string(),
  menuDescription: z.string().optional().nullable(),
  menuPictureUrl: z.string().optional().nullable(),
  dinnerMode: z.lazy(() => DinnerModeSchema),
  chefId: z.number().int().optional().nullable(),
  cookingTeamId: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const CookingTeamUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUpdateWithoutSeasonInput> = z.object({
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dinners: z.lazy(() => DinnerEventUncheckedUpdateManyWithoutCookingTeamNestedInputSchema).optional(),
  chefs: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutChefForCcookingTeamNestedInputSchema).optional(),
  cooks: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutCookForCcookingTeamNestedInputSchema).optional(),
  juniorHelpers: z.lazy(() => CookingTeamAssignmentUncheckedUpdateManyWithoutJuniorForCcookingTeamNestedInputSchema).optional()
}).strict();

export const CookingTeamUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.CookingTeamUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TicketPriceUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUpdateWithoutSeasonInput> = z.object({
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const TicketPriceUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.TicketPriceUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  ticketType: z.union([ z.lazy(() => TicketTypeSchema),z.lazy(() => EnumTicketTypeFieldUpdateOperationsInputSchema) ]).optional(),
  price: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const DinnerEventUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUpdateWithoutSeasonInput> = z.object({
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  chef: z.lazy(() => InhabitantUpdateOneWithoutDinnerEventNestedInputSchema).optional(),
  cookingTeam: z.lazy(() => CookingTeamUpdateOneWithoutDinnersNestedInputSchema).optional(),
  tickets: z.lazy(() => OrderUpdateManyWithoutDinnerEventNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tickets: z.lazy(() => OrderUncheckedUpdateManyWithoutDinnerEventNestedInputSchema).optional()
}).strict();

export const DinnerEventUncheckedUpdateManyWithoutSeasonInputSchema: z.ZodType<Prisma.DinnerEventUncheckedUpdateManyWithoutSeasonInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  date: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  menuTitle: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  menuDescription: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  menuPictureUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  dinnerMode: z.union([ z.lazy(() => DinnerModeSchema),z.lazy(() => EnumDinnerModeFieldUpdateOperationsInputSchema) ]).optional(),
  chefId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cookingTeamId: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
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
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(),AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema,AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyTypeFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AllergyTypeFindFirstOrThrowArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereInputSchema.optional(),
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(),AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema,AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyTypeFindManyArgsSchema: z.ZodType<Prisma.AllergyTypeFindManyArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereInputSchema.optional(),
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(),AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyTypeScalarFieldEnumSchema,AllergyTypeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyTypeAggregateArgsSchema: z.ZodType<Prisma.AllergyTypeAggregateArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(),
  orderBy: z.union([ AllergyTypeOrderByWithRelationInputSchema.array(),AllergyTypeOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyTypeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AllergyTypeGroupByArgsSchema: z.ZodType<Prisma.AllergyTypeGroupByArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(),
  orderBy: z.union([ AllergyTypeOrderByWithAggregationInputSchema.array(),AllergyTypeOrderByWithAggregationInputSchema ]).optional(),
  by: AllergyTypeScalarFieldEnumSchema.array(),
  having: AllergyTypeScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AllergyTypeFindUniqueArgsSchema: z.ZodType<Prisma.AllergyTypeFindUniqueArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema,
}).strict() ;

export const AllergyTypeFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AllergyTypeFindUniqueOrThrowArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema,
}).strict() ;

export const AllergyFindFirstArgsSchema: z.ZodType<Prisma.AllergyFindFirstArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(),
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(),AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema,AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AllergyFindFirstOrThrowArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(),
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(),AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema,AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyFindManyArgsSchema: z.ZodType<Prisma.AllergyFindManyArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereInputSchema.optional(),
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(),AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AllergyScalarFieldEnumSchema,AllergyScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AllergyAggregateArgsSchema: z.ZodType<Prisma.AllergyAggregateArgs> = z.object({
  where: AllergyWhereInputSchema.optional(),
  orderBy: z.union([ AllergyOrderByWithRelationInputSchema.array(),AllergyOrderByWithRelationInputSchema ]).optional(),
  cursor: AllergyWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AllergyGroupByArgsSchema: z.ZodType<Prisma.AllergyGroupByArgs> = z.object({
  where: AllergyWhereInputSchema.optional(),
  orderBy: z.union([ AllergyOrderByWithAggregationInputSchema.array(),AllergyOrderByWithAggregationInputSchema ]).optional(),
  by: AllergyScalarFieldEnumSchema.array(),
  having: AllergyScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AllergyFindUniqueArgsSchema: z.ZodType<Prisma.AllergyFindUniqueArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema,
}).strict() ;

export const AllergyFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AllergyFindUniqueOrThrowArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema,
}).strict() ;

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithAggregationInputSchema.array(),UserOrderByWithAggregationInputSchema ]).optional(),
  by: UserScalarFieldEnumSchema.array(),
  having: UserScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const DinnerPreferenceFindFirstArgsSchema: z.ZodType<Prisma.DinnerPreferenceFindFirstArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereInputSchema.optional(),
  orderBy: z.union([ DinnerPreferenceOrderByWithRelationInputSchema.array(),DinnerPreferenceOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerPreferenceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerPreferenceScalarFieldEnumSchema,DinnerPreferenceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerPreferenceFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DinnerPreferenceFindFirstOrThrowArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereInputSchema.optional(),
  orderBy: z.union([ DinnerPreferenceOrderByWithRelationInputSchema.array(),DinnerPreferenceOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerPreferenceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerPreferenceScalarFieldEnumSchema,DinnerPreferenceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerPreferenceFindManyArgsSchema: z.ZodType<Prisma.DinnerPreferenceFindManyArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereInputSchema.optional(),
  orderBy: z.union([ DinnerPreferenceOrderByWithRelationInputSchema.array(),DinnerPreferenceOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerPreferenceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerPreferenceScalarFieldEnumSchema,DinnerPreferenceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerPreferenceAggregateArgsSchema: z.ZodType<Prisma.DinnerPreferenceAggregateArgs> = z.object({
  where: DinnerPreferenceWhereInputSchema.optional(),
  orderBy: z.union([ DinnerPreferenceOrderByWithRelationInputSchema.array(),DinnerPreferenceOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerPreferenceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DinnerPreferenceGroupByArgsSchema: z.ZodType<Prisma.DinnerPreferenceGroupByArgs> = z.object({
  where: DinnerPreferenceWhereInputSchema.optional(),
  orderBy: z.union([ DinnerPreferenceOrderByWithAggregationInputSchema.array(),DinnerPreferenceOrderByWithAggregationInputSchema ]).optional(),
  by: DinnerPreferenceScalarFieldEnumSchema.array(),
  having: DinnerPreferenceScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DinnerPreferenceFindUniqueArgsSchema: z.ZodType<Prisma.DinnerPreferenceFindUniqueArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereUniqueInputSchema,
}).strict() ;

export const DinnerPreferenceFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DinnerPreferenceFindUniqueOrThrowArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereUniqueInputSchema,
}).strict() ;

export const InhabitantFindFirstArgsSchema: z.ZodType<Prisma.InhabitantFindFirstArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(),
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(),InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema,InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InhabitantFindFirstOrThrowArgsSchema: z.ZodType<Prisma.InhabitantFindFirstOrThrowArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(),
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(),InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema,InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InhabitantFindManyArgsSchema: z.ZodType<Prisma.InhabitantFindManyArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereInputSchema.optional(),
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(),InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InhabitantScalarFieldEnumSchema,InhabitantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InhabitantAggregateArgsSchema: z.ZodType<Prisma.InhabitantAggregateArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(),
  orderBy: z.union([ InhabitantOrderByWithRelationInputSchema.array(),InhabitantOrderByWithRelationInputSchema ]).optional(),
  cursor: InhabitantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const InhabitantGroupByArgsSchema: z.ZodType<Prisma.InhabitantGroupByArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(),
  orderBy: z.union([ InhabitantOrderByWithAggregationInputSchema.array(),InhabitantOrderByWithAggregationInputSchema ]).optional(),
  by: InhabitantScalarFieldEnumSchema.array(),
  having: InhabitantScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const InhabitantFindUniqueArgsSchema: z.ZodType<Prisma.InhabitantFindUniqueArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema,
}).strict() ;

export const InhabitantFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.InhabitantFindUniqueOrThrowArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema,
}).strict() ;

export const HouseholdFindFirstArgsSchema: z.ZodType<Prisma.HouseholdFindFirstArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(),
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(),HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema,HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const HouseholdFindFirstOrThrowArgsSchema: z.ZodType<Prisma.HouseholdFindFirstOrThrowArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(),
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(),HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema,HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const HouseholdFindManyArgsSchema: z.ZodType<Prisma.HouseholdFindManyArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereInputSchema.optional(),
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(),HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ HouseholdScalarFieldEnumSchema,HouseholdScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const HouseholdAggregateArgsSchema: z.ZodType<Prisma.HouseholdAggregateArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(),
  orderBy: z.union([ HouseholdOrderByWithRelationInputSchema.array(),HouseholdOrderByWithRelationInputSchema ]).optional(),
  cursor: HouseholdWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const HouseholdGroupByArgsSchema: z.ZodType<Prisma.HouseholdGroupByArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(),
  orderBy: z.union([ HouseholdOrderByWithAggregationInputSchema.array(),HouseholdOrderByWithAggregationInputSchema ]).optional(),
  by: HouseholdScalarFieldEnumSchema.array(),
  having: HouseholdScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const HouseholdFindUniqueArgsSchema: z.ZodType<Prisma.HouseholdFindUniqueArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema,
}).strict() ;

export const HouseholdFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.HouseholdFindUniqueOrThrowArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema,
}).strict() ;

export const DinnerEventFindFirstArgsSchema: z.ZodType<Prisma.DinnerEventFindFirstArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(),
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(),DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema,DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerEventFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventFindFirstOrThrowArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(),
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(),DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema,DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerEventFindManyArgsSchema: z.ZodType<Prisma.DinnerEventFindManyArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereInputSchema.optional(),
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(),DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DinnerEventScalarFieldEnumSchema,DinnerEventScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DinnerEventAggregateArgsSchema: z.ZodType<Prisma.DinnerEventAggregateArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(),
  orderBy: z.union([ DinnerEventOrderByWithRelationInputSchema.array(),DinnerEventOrderByWithRelationInputSchema ]).optional(),
  cursor: DinnerEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DinnerEventGroupByArgsSchema: z.ZodType<Prisma.DinnerEventGroupByArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(),
  orderBy: z.union([ DinnerEventOrderByWithAggregationInputSchema.array(),DinnerEventOrderByWithAggregationInputSchema ]).optional(),
  by: DinnerEventScalarFieldEnumSchema.array(),
  having: DinnerEventScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DinnerEventFindUniqueArgsSchema: z.ZodType<Prisma.DinnerEventFindUniqueArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema,
}).strict() ;

export const DinnerEventFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DinnerEventFindUniqueOrThrowArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema,
}).strict() ;

export const OrderFindFirstArgsSchema: z.ZodType<Prisma.OrderFindFirstArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(),
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(),OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema,OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const OrderFindFirstOrThrowArgsSchema: z.ZodType<Prisma.OrderFindFirstOrThrowArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(),
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(),OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema,OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const OrderFindManyArgsSchema: z.ZodType<Prisma.OrderFindManyArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereInputSchema.optional(),
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(),OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrderScalarFieldEnumSchema,OrderScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const OrderAggregateArgsSchema: z.ZodType<Prisma.OrderAggregateArgs> = z.object({
  where: OrderWhereInputSchema.optional(),
  orderBy: z.union([ OrderOrderByWithRelationInputSchema.array(),OrderOrderByWithRelationInputSchema ]).optional(),
  cursor: OrderWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const OrderGroupByArgsSchema: z.ZodType<Prisma.OrderGroupByArgs> = z.object({
  where: OrderWhereInputSchema.optional(),
  orderBy: z.union([ OrderOrderByWithAggregationInputSchema.array(),OrderOrderByWithAggregationInputSchema ]).optional(),
  by: OrderScalarFieldEnumSchema.array(),
  having: OrderScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const OrderFindUniqueArgsSchema: z.ZodType<Prisma.OrderFindUniqueArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema,
}).strict() ;

export const OrderFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.OrderFindUniqueOrThrowArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema,
}).strict() ;

export const TransactionFindFirstArgsSchema: z.ZodType<Prisma.TransactionFindFirstArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(),
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(),TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema,TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TransactionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TransactionFindFirstOrThrowArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(),
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(),TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema,TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TransactionFindManyArgsSchema: z.ZodType<Prisma.TransactionFindManyArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereInputSchema.optional(),
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(),TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TransactionScalarFieldEnumSchema,TransactionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TransactionAggregateArgsSchema: z.ZodType<Prisma.TransactionAggregateArgs> = z.object({
  where: TransactionWhereInputSchema.optional(),
  orderBy: z.union([ TransactionOrderByWithRelationInputSchema.array(),TransactionOrderByWithRelationInputSchema ]).optional(),
  cursor: TransactionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TransactionGroupByArgsSchema: z.ZodType<Prisma.TransactionGroupByArgs> = z.object({
  where: TransactionWhereInputSchema.optional(),
  orderBy: z.union([ TransactionOrderByWithAggregationInputSchema.array(),TransactionOrderByWithAggregationInputSchema ]).optional(),
  by: TransactionScalarFieldEnumSchema.array(),
  having: TransactionScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TransactionFindUniqueArgsSchema: z.ZodType<Prisma.TransactionFindUniqueArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema,
}).strict() ;

export const TransactionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TransactionFindUniqueOrThrowArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema,
}).strict() ;

export const InvoiceFindFirstArgsSchema: z.ZodType<Prisma.InvoiceFindFirstArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(),
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(),InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema,InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InvoiceFindFirstOrThrowArgsSchema: z.ZodType<Prisma.InvoiceFindFirstOrThrowArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(),
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(),InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema,InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InvoiceFindManyArgsSchema: z.ZodType<Prisma.InvoiceFindManyArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereInputSchema.optional(),
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(),InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ InvoiceScalarFieldEnumSchema,InvoiceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const InvoiceAggregateArgsSchema: z.ZodType<Prisma.InvoiceAggregateArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(),
  orderBy: z.union([ InvoiceOrderByWithRelationInputSchema.array(),InvoiceOrderByWithRelationInputSchema ]).optional(),
  cursor: InvoiceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const InvoiceGroupByArgsSchema: z.ZodType<Prisma.InvoiceGroupByArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(),
  orderBy: z.union([ InvoiceOrderByWithAggregationInputSchema.array(),InvoiceOrderByWithAggregationInputSchema ]).optional(),
  by: InvoiceScalarFieldEnumSchema.array(),
  having: InvoiceScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const InvoiceFindUniqueArgsSchema: z.ZodType<Prisma.InvoiceFindUniqueArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema,
}).strict() ;

export const InvoiceFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.InvoiceFindUniqueOrThrowArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamFindFirstArgsSchema: z.ZodType<Prisma.CookingTeamFindFirstArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(),CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema,CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamFindFirstOrThrowArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(),CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema,CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamFindManyArgsSchema: z.ZodType<Prisma.CookingTeamFindManyArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(),CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamScalarFieldEnumSchema,CookingTeamScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamAggregateArgsSchema: z.ZodType<Prisma.CookingTeamAggregateArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamOrderByWithRelationInputSchema.array(),CookingTeamOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CookingTeamGroupByArgsSchema: z.ZodType<Prisma.CookingTeamGroupByArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamOrderByWithAggregationInputSchema.array(),CookingTeamOrderByWithAggregationInputSchema ]).optional(),
  by: CookingTeamScalarFieldEnumSchema.array(),
  having: CookingTeamScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CookingTeamFindUniqueArgsSchema: z.ZodType<Prisma.CookingTeamFindUniqueArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamFindUniqueOrThrowArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamAssignmentFindFirstArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindFirstArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(),CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema,CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamAssignmentFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindFirstOrThrowArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(),CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema,CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamAssignmentFindManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindManyArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(),CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CookingTeamAssignmentScalarFieldEnumSchema,CookingTeamAssignmentScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CookingTeamAssignmentAggregateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentAggregateArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamAssignmentOrderByWithRelationInputSchema.array(),CookingTeamAssignmentOrderByWithRelationInputSchema ]).optional(),
  cursor: CookingTeamAssignmentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CookingTeamAssignmentGroupByArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentGroupByArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  orderBy: z.union([ CookingTeamAssignmentOrderByWithAggregationInputSchema.array(),CookingTeamAssignmentOrderByWithAggregationInputSchema ]).optional(),
  by: CookingTeamAssignmentScalarFieldEnumSchema.array(),
  having: CookingTeamAssignmentScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CookingTeamAssignmentFindUniqueArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindUniqueArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamAssignmentFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentFindUniqueOrThrowArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema,
}).strict() ;

export const SeasonFindFirstArgsSchema: z.ZodType<Prisma.SeasonFindFirstArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(),
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(),SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema,SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SeasonFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SeasonFindFirstOrThrowArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(),
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(),SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema,SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SeasonFindManyArgsSchema: z.ZodType<Prisma.SeasonFindManyArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereInputSchema.optional(),
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(),SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SeasonScalarFieldEnumSchema,SeasonScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SeasonAggregateArgsSchema: z.ZodType<Prisma.SeasonAggregateArgs> = z.object({
  where: SeasonWhereInputSchema.optional(),
  orderBy: z.union([ SeasonOrderByWithRelationInputSchema.array(),SeasonOrderByWithRelationInputSchema ]).optional(),
  cursor: SeasonWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SeasonGroupByArgsSchema: z.ZodType<Prisma.SeasonGroupByArgs> = z.object({
  where: SeasonWhereInputSchema.optional(),
  orderBy: z.union([ SeasonOrderByWithAggregationInputSchema.array(),SeasonOrderByWithAggregationInputSchema ]).optional(),
  by: SeasonScalarFieldEnumSchema.array(),
  having: SeasonScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SeasonFindUniqueArgsSchema: z.ZodType<Prisma.SeasonFindUniqueArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema,
}).strict() ;

export const SeasonFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SeasonFindUniqueOrThrowArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema,
}).strict() ;

export const TicketPriceFindFirstArgsSchema: z.ZodType<Prisma.TicketPriceFindFirstArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(),
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(),TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema,TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TicketPriceFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TicketPriceFindFirstOrThrowArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(),
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(),TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema,TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TicketPriceFindManyArgsSchema: z.ZodType<Prisma.TicketPriceFindManyArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereInputSchema.optional(),
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(),TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TicketPriceScalarFieldEnumSchema,TicketPriceScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TicketPriceAggregateArgsSchema: z.ZodType<Prisma.TicketPriceAggregateArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(),
  orderBy: z.union([ TicketPriceOrderByWithRelationInputSchema.array(),TicketPriceOrderByWithRelationInputSchema ]).optional(),
  cursor: TicketPriceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TicketPriceGroupByArgsSchema: z.ZodType<Prisma.TicketPriceGroupByArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(),
  orderBy: z.union([ TicketPriceOrderByWithAggregationInputSchema.array(),TicketPriceOrderByWithAggregationInputSchema ]).optional(),
  by: TicketPriceScalarFieldEnumSchema.array(),
  having: TicketPriceScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TicketPriceFindUniqueArgsSchema: z.ZodType<Prisma.TicketPriceFindUniqueArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema,
}).strict() ;

export const TicketPriceFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TicketPriceFindUniqueOrThrowArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema,
}).strict() ;

export const AllergyTypeCreateArgsSchema: z.ZodType<Prisma.AllergyTypeCreateArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  data: z.union([ AllergyTypeCreateInputSchema,AllergyTypeUncheckedCreateInputSchema ]),
}).strict() ;

export const AllergyTypeUpsertArgsSchema: z.ZodType<Prisma.AllergyTypeUpsertArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema,
  create: z.union([ AllergyTypeCreateInputSchema,AllergyTypeUncheckedCreateInputSchema ]),
  update: z.union([ AllergyTypeUpdateInputSchema,AllergyTypeUncheckedUpdateInputSchema ]),
}).strict() ;

export const AllergyTypeCreateManyArgsSchema: z.ZodType<Prisma.AllergyTypeCreateManyArgs> = z.object({
  data: z.union([ AllergyTypeCreateManyInputSchema,AllergyTypeCreateManyInputSchema.array() ]),
}).strict() ;

export const AllergyTypeCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyTypeCreateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyTypeCreateManyInputSchema,AllergyTypeCreateManyInputSchema.array() ]),
}).strict() ;

export const AllergyTypeDeleteArgsSchema: z.ZodType<Prisma.AllergyTypeDeleteArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  where: AllergyTypeWhereUniqueInputSchema,
}).strict() ;

export const AllergyTypeUpdateArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateArgs> = z.object({
  select: AllergyTypeSelectSchema.optional(),
  include: AllergyTypeIncludeSchema.optional(),
  data: z.union([ AllergyTypeUpdateInputSchema,AllergyTypeUncheckedUpdateInputSchema ]),
  where: AllergyTypeWhereUniqueInputSchema,
}).strict() ;

export const AllergyTypeUpdateManyArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateManyArgs> = z.object({
  data: z.union([ AllergyTypeUpdateManyMutationInputSchema,AllergyTypeUncheckedUpdateManyInputSchema ]),
  where: AllergyTypeWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const AllergyTypeUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyTypeUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyTypeUpdateManyMutationInputSchema,AllergyTypeUncheckedUpdateManyInputSchema ]),
  where: AllergyTypeWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const AllergyTypeDeleteManyArgsSchema: z.ZodType<Prisma.AllergyTypeDeleteManyArgs> = z.object({
  where: AllergyTypeWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const AllergyCreateArgsSchema: z.ZodType<Prisma.AllergyCreateArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  data: z.union([ AllergyCreateInputSchema,AllergyUncheckedCreateInputSchema ]),
}).strict() ;

export const AllergyUpsertArgsSchema: z.ZodType<Prisma.AllergyUpsertArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema,
  create: z.union([ AllergyCreateInputSchema,AllergyUncheckedCreateInputSchema ]),
  update: z.union([ AllergyUpdateInputSchema,AllergyUncheckedUpdateInputSchema ]),
}).strict() ;

export const AllergyCreateManyArgsSchema: z.ZodType<Prisma.AllergyCreateManyArgs> = z.object({
  data: z.union([ AllergyCreateManyInputSchema,AllergyCreateManyInputSchema.array() ]),
}).strict() ;

export const AllergyCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyCreateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyCreateManyInputSchema,AllergyCreateManyInputSchema.array() ]),
}).strict() ;

export const AllergyDeleteArgsSchema: z.ZodType<Prisma.AllergyDeleteArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  where: AllergyWhereUniqueInputSchema,
}).strict() ;

export const AllergyUpdateArgsSchema: z.ZodType<Prisma.AllergyUpdateArgs> = z.object({
  select: AllergySelectSchema.optional(),
  include: AllergyIncludeSchema.optional(),
  data: z.union([ AllergyUpdateInputSchema,AllergyUncheckedUpdateInputSchema ]),
  where: AllergyWhereUniqueInputSchema,
}).strict() ;

export const AllergyUpdateManyArgsSchema: z.ZodType<Prisma.AllergyUpdateManyArgs> = z.object({
  data: z.union([ AllergyUpdateManyMutationInputSchema,AllergyUncheckedUpdateManyInputSchema ]),
  where: AllergyWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const AllergyUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AllergyUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AllergyUpdateManyMutationInputSchema,AllergyUncheckedUpdateManyInputSchema ]),
  where: AllergyWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const AllergyDeleteManyArgsSchema: z.ZodType<Prisma.AllergyDeleteManyArgs> = z.object({
  where: AllergyWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
}).strict() ;

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
  create: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
}).strict() ;

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
}).strict() ;

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
}).strict() ;

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema,UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema,UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerPreferenceCreateArgsSchema: z.ZodType<Prisma.DinnerPreferenceCreateArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  data: z.union([ DinnerPreferenceCreateInputSchema,DinnerPreferenceUncheckedCreateInputSchema ]),
}).strict() ;

export const DinnerPreferenceUpsertArgsSchema: z.ZodType<Prisma.DinnerPreferenceUpsertArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereUniqueInputSchema,
  create: z.union([ DinnerPreferenceCreateInputSchema,DinnerPreferenceUncheckedCreateInputSchema ]),
  update: z.union([ DinnerPreferenceUpdateInputSchema,DinnerPreferenceUncheckedUpdateInputSchema ]),
}).strict() ;

export const DinnerPreferenceCreateManyArgsSchema: z.ZodType<Prisma.DinnerPreferenceCreateManyArgs> = z.object({
  data: z.union([ DinnerPreferenceCreateManyInputSchema,DinnerPreferenceCreateManyInputSchema.array() ]),
}).strict() ;

export const DinnerPreferenceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerPreferenceCreateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerPreferenceCreateManyInputSchema,DinnerPreferenceCreateManyInputSchema.array() ]),
}).strict() ;

export const DinnerPreferenceDeleteArgsSchema: z.ZodType<Prisma.DinnerPreferenceDeleteArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  where: DinnerPreferenceWhereUniqueInputSchema,
}).strict() ;

export const DinnerPreferenceUpdateArgsSchema: z.ZodType<Prisma.DinnerPreferenceUpdateArgs> = z.object({
  select: DinnerPreferenceSelectSchema.optional(),
  include: DinnerPreferenceIncludeSchema.optional(),
  data: z.union([ DinnerPreferenceUpdateInputSchema,DinnerPreferenceUncheckedUpdateInputSchema ]),
  where: DinnerPreferenceWhereUniqueInputSchema,
}).strict() ;

export const DinnerPreferenceUpdateManyArgsSchema: z.ZodType<Prisma.DinnerPreferenceUpdateManyArgs> = z.object({
  data: z.union([ DinnerPreferenceUpdateManyMutationInputSchema,DinnerPreferenceUncheckedUpdateManyInputSchema ]),
  where: DinnerPreferenceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerPreferenceUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerPreferenceUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerPreferenceUpdateManyMutationInputSchema,DinnerPreferenceUncheckedUpdateManyInputSchema ]),
  where: DinnerPreferenceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerPreferenceDeleteManyArgsSchema: z.ZodType<Prisma.DinnerPreferenceDeleteManyArgs> = z.object({
  where: DinnerPreferenceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InhabitantCreateArgsSchema: z.ZodType<Prisma.InhabitantCreateArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  data: z.union([ InhabitantCreateInputSchema,InhabitantUncheckedCreateInputSchema ]),
}).strict() ;

export const InhabitantUpsertArgsSchema: z.ZodType<Prisma.InhabitantUpsertArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema,
  create: z.union([ InhabitantCreateInputSchema,InhabitantUncheckedCreateInputSchema ]),
  update: z.union([ InhabitantUpdateInputSchema,InhabitantUncheckedUpdateInputSchema ]),
}).strict() ;

export const InhabitantCreateManyArgsSchema: z.ZodType<Prisma.InhabitantCreateManyArgs> = z.object({
  data: z.union([ InhabitantCreateManyInputSchema,InhabitantCreateManyInputSchema.array() ]),
}).strict() ;

export const InhabitantCreateManyAndReturnArgsSchema: z.ZodType<Prisma.InhabitantCreateManyAndReturnArgs> = z.object({
  data: z.union([ InhabitantCreateManyInputSchema,InhabitantCreateManyInputSchema.array() ]),
}).strict() ;

export const InhabitantDeleteArgsSchema: z.ZodType<Prisma.InhabitantDeleteArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  where: InhabitantWhereUniqueInputSchema,
}).strict() ;

export const InhabitantUpdateArgsSchema: z.ZodType<Prisma.InhabitantUpdateArgs> = z.object({
  select: InhabitantSelectSchema.optional(),
  include: InhabitantIncludeSchema.optional(),
  data: z.union([ InhabitantUpdateInputSchema,InhabitantUncheckedUpdateInputSchema ]),
  where: InhabitantWhereUniqueInputSchema,
}).strict() ;

export const InhabitantUpdateManyArgsSchema: z.ZodType<Prisma.InhabitantUpdateManyArgs> = z.object({
  data: z.union([ InhabitantUpdateManyMutationInputSchema,InhabitantUncheckedUpdateManyInputSchema ]),
  where: InhabitantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InhabitantUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.InhabitantUpdateManyAndReturnArgs> = z.object({
  data: z.union([ InhabitantUpdateManyMutationInputSchema,InhabitantUncheckedUpdateManyInputSchema ]),
  where: InhabitantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InhabitantDeleteManyArgsSchema: z.ZodType<Prisma.InhabitantDeleteManyArgs> = z.object({
  where: InhabitantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const HouseholdCreateArgsSchema: z.ZodType<Prisma.HouseholdCreateArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  data: z.union([ HouseholdCreateInputSchema,HouseholdUncheckedCreateInputSchema ]),
}).strict() ;

export const HouseholdUpsertArgsSchema: z.ZodType<Prisma.HouseholdUpsertArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema,
  create: z.union([ HouseholdCreateInputSchema,HouseholdUncheckedCreateInputSchema ]),
  update: z.union([ HouseholdUpdateInputSchema,HouseholdUncheckedUpdateInputSchema ]),
}).strict() ;

export const HouseholdCreateManyArgsSchema: z.ZodType<Prisma.HouseholdCreateManyArgs> = z.object({
  data: z.union([ HouseholdCreateManyInputSchema,HouseholdCreateManyInputSchema.array() ]),
}).strict() ;

export const HouseholdCreateManyAndReturnArgsSchema: z.ZodType<Prisma.HouseholdCreateManyAndReturnArgs> = z.object({
  data: z.union([ HouseholdCreateManyInputSchema,HouseholdCreateManyInputSchema.array() ]),
}).strict() ;

export const HouseholdDeleteArgsSchema: z.ZodType<Prisma.HouseholdDeleteArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  where: HouseholdWhereUniqueInputSchema,
}).strict() ;

export const HouseholdUpdateArgsSchema: z.ZodType<Prisma.HouseholdUpdateArgs> = z.object({
  select: HouseholdSelectSchema.optional(),
  include: HouseholdIncludeSchema.optional(),
  data: z.union([ HouseholdUpdateInputSchema,HouseholdUncheckedUpdateInputSchema ]),
  where: HouseholdWhereUniqueInputSchema,
}).strict() ;

export const HouseholdUpdateManyArgsSchema: z.ZodType<Prisma.HouseholdUpdateManyArgs> = z.object({
  data: z.union([ HouseholdUpdateManyMutationInputSchema,HouseholdUncheckedUpdateManyInputSchema ]),
  where: HouseholdWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const HouseholdUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.HouseholdUpdateManyAndReturnArgs> = z.object({
  data: z.union([ HouseholdUpdateManyMutationInputSchema,HouseholdUncheckedUpdateManyInputSchema ]),
  where: HouseholdWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const HouseholdDeleteManyArgsSchema: z.ZodType<Prisma.HouseholdDeleteManyArgs> = z.object({
  where: HouseholdWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerEventCreateArgsSchema: z.ZodType<Prisma.DinnerEventCreateArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  data: z.union([ DinnerEventCreateInputSchema,DinnerEventUncheckedCreateInputSchema ]),
}).strict() ;

export const DinnerEventUpsertArgsSchema: z.ZodType<Prisma.DinnerEventUpsertArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema,
  create: z.union([ DinnerEventCreateInputSchema,DinnerEventUncheckedCreateInputSchema ]),
  update: z.union([ DinnerEventUpdateInputSchema,DinnerEventUncheckedUpdateInputSchema ]),
}).strict() ;

export const DinnerEventCreateManyArgsSchema: z.ZodType<Prisma.DinnerEventCreateManyArgs> = z.object({
  data: z.union([ DinnerEventCreateManyInputSchema,DinnerEventCreateManyInputSchema.array() ]),
}).strict() ;

export const DinnerEventCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventCreateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventCreateManyInputSchema,DinnerEventCreateManyInputSchema.array() ]),
}).strict() ;

export const DinnerEventDeleteArgsSchema: z.ZodType<Prisma.DinnerEventDeleteArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  where: DinnerEventWhereUniqueInputSchema,
}).strict() ;

export const DinnerEventUpdateArgsSchema: z.ZodType<Prisma.DinnerEventUpdateArgs> = z.object({
  select: DinnerEventSelectSchema.optional(),
  include: DinnerEventIncludeSchema.optional(),
  data: z.union([ DinnerEventUpdateInputSchema,DinnerEventUncheckedUpdateInputSchema ]),
  where: DinnerEventWhereUniqueInputSchema,
}).strict() ;

export const DinnerEventUpdateManyArgsSchema: z.ZodType<Prisma.DinnerEventUpdateManyArgs> = z.object({
  data: z.union([ DinnerEventUpdateManyMutationInputSchema,DinnerEventUncheckedUpdateManyInputSchema ]),
  where: DinnerEventWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerEventUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DinnerEventUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DinnerEventUpdateManyMutationInputSchema,DinnerEventUncheckedUpdateManyInputSchema ]),
  where: DinnerEventWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DinnerEventDeleteManyArgsSchema: z.ZodType<Prisma.DinnerEventDeleteManyArgs> = z.object({
  where: DinnerEventWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const OrderCreateArgsSchema: z.ZodType<Prisma.OrderCreateArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  data: z.union([ OrderCreateInputSchema,OrderUncheckedCreateInputSchema ]),
}).strict() ;

export const OrderUpsertArgsSchema: z.ZodType<Prisma.OrderUpsertArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema,
  create: z.union([ OrderCreateInputSchema,OrderUncheckedCreateInputSchema ]),
  update: z.union([ OrderUpdateInputSchema,OrderUncheckedUpdateInputSchema ]),
}).strict() ;

export const OrderCreateManyArgsSchema: z.ZodType<Prisma.OrderCreateManyArgs> = z.object({
  data: z.union([ OrderCreateManyInputSchema,OrderCreateManyInputSchema.array() ]),
}).strict() ;

export const OrderCreateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderCreateManyAndReturnArgs> = z.object({
  data: z.union([ OrderCreateManyInputSchema,OrderCreateManyInputSchema.array() ]),
}).strict() ;

export const OrderDeleteArgsSchema: z.ZodType<Prisma.OrderDeleteArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  where: OrderWhereUniqueInputSchema,
}).strict() ;

export const OrderUpdateArgsSchema: z.ZodType<Prisma.OrderUpdateArgs> = z.object({
  select: OrderSelectSchema.optional(),
  include: OrderIncludeSchema.optional(),
  data: z.union([ OrderUpdateInputSchema,OrderUncheckedUpdateInputSchema ]),
  where: OrderWhereUniqueInputSchema,
}).strict() ;

export const OrderUpdateManyArgsSchema: z.ZodType<Prisma.OrderUpdateManyArgs> = z.object({
  data: z.union([ OrderUpdateManyMutationInputSchema,OrderUncheckedUpdateManyInputSchema ]),
  where: OrderWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const OrderUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.OrderUpdateManyAndReturnArgs> = z.object({
  data: z.union([ OrderUpdateManyMutationInputSchema,OrderUncheckedUpdateManyInputSchema ]),
  where: OrderWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const OrderDeleteManyArgsSchema: z.ZodType<Prisma.OrderDeleteManyArgs> = z.object({
  where: OrderWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TransactionCreateArgsSchema: z.ZodType<Prisma.TransactionCreateArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  data: z.union([ TransactionCreateInputSchema,TransactionUncheckedCreateInputSchema ]),
}).strict() ;

export const TransactionUpsertArgsSchema: z.ZodType<Prisma.TransactionUpsertArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema,
  create: z.union([ TransactionCreateInputSchema,TransactionUncheckedCreateInputSchema ]),
  update: z.union([ TransactionUpdateInputSchema,TransactionUncheckedUpdateInputSchema ]),
}).strict() ;

export const TransactionCreateManyArgsSchema: z.ZodType<Prisma.TransactionCreateManyArgs> = z.object({
  data: z.union([ TransactionCreateManyInputSchema,TransactionCreateManyInputSchema.array() ]),
}).strict() ;

export const TransactionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TransactionCreateManyAndReturnArgs> = z.object({
  data: z.union([ TransactionCreateManyInputSchema,TransactionCreateManyInputSchema.array() ]),
}).strict() ;

export const TransactionDeleteArgsSchema: z.ZodType<Prisma.TransactionDeleteArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  where: TransactionWhereUniqueInputSchema,
}).strict() ;

export const TransactionUpdateArgsSchema: z.ZodType<Prisma.TransactionUpdateArgs> = z.object({
  select: TransactionSelectSchema.optional(),
  include: TransactionIncludeSchema.optional(),
  data: z.union([ TransactionUpdateInputSchema,TransactionUncheckedUpdateInputSchema ]),
  where: TransactionWhereUniqueInputSchema,
}).strict() ;

export const TransactionUpdateManyArgsSchema: z.ZodType<Prisma.TransactionUpdateManyArgs> = z.object({
  data: z.union([ TransactionUpdateManyMutationInputSchema,TransactionUncheckedUpdateManyInputSchema ]),
  where: TransactionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TransactionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TransactionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TransactionUpdateManyMutationInputSchema,TransactionUncheckedUpdateManyInputSchema ]),
  where: TransactionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TransactionDeleteManyArgsSchema: z.ZodType<Prisma.TransactionDeleteManyArgs> = z.object({
  where: TransactionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InvoiceCreateArgsSchema: z.ZodType<Prisma.InvoiceCreateArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  data: z.union([ InvoiceCreateInputSchema,InvoiceUncheckedCreateInputSchema ]),
}).strict() ;

export const InvoiceUpsertArgsSchema: z.ZodType<Prisma.InvoiceUpsertArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema,
  create: z.union([ InvoiceCreateInputSchema,InvoiceUncheckedCreateInputSchema ]),
  update: z.union([ InvoiceUpdateInputSchema,InvoiceUncheckedUpdateInputSchema ]),
}).strict() ;

export const InvoiceCreateManyArgsSchema: z.ZodType<Prisma.InvoiceCreateManyArgs> = z.object({
  data: z.union([ InvoiceCreateManyInputSchema,InvoiceCreateManyInputSchema.array() ]),
}).strict() ;

export const InvoiceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.InvoiceCreateManyAndReturnArgs> = z.object({
  data: z.union([ InvoiceCreateManyInputSchema,InvoiceCreateManyInputSchema.array() ]),
}).strict() ;

export const InvoiceDeleteArgsSchema: z.ZodType<Prisma.InvoiceDeleteArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  where: InvoiceWhereUniqueInputSchema,
}).strict() ;

export const InvoiceUpdateArgsSchema: z.ZodType<Prisma.InvoiceUpdateArgs> = z.object({
  select: InvoiceSelectSchema.optional(),
  include: InvoiceIncludeSchema.optional(),
  data: z.union([ InvoiceUpdateInputSchema,InvoiceUncheckedUpdateInputSchema ]),
  where: InvoiceWhereUniqueInputSchema,
}).strict() ;

export const InvoiceUpdateManyArgsSchema: z.ZodType<Prisma.InvoiceUpdateManyArgs> = z.object({
  data: z.union([ InvoiceUpdateManyMutationInputSchema,InvoiceUncheckedUpdateManyInputSchema ]),
  where: InvoiceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InvoiceUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.InvoiceUpdateManyAndReturnArgs> = z.object({
  data: z.union([ InvoiceUpdateManyMutationInputSchema,InvoiceUncheckedUpdateManyInputSchema ]),
  where: InvoiceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const InvoiceDeleteManyArgsSchema: z.ZodType<Prisma.InvoiceDeleteManyArgs> = z.object({
  where: InvoiceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamCreateArgsSchema: z.ZodType<Prisma.CookingTeamCreateArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  data: z.union([ CookingTeamCreateInputSchema,CookingTeamUncheckedCreateInputSchema ]),
}).strict() ;

export const CookingTeamUpsertArgsSchema: z.ZodType<Prisma.CookingTeamUpsertArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema,
  create: z.union([ CookingTeamCreateInputSchema,CookingTeamUncheckedCreateInputSchema ]),
  update: z.union([ CookingTeamUpdateInputSchema,CookingTeamUncheckedUpdateInputSchema ]),
}).strict() ;

export const CookingTeamCreateManyArgsSchema: z.ZodType<Prisma.CookingTeamCreateManyArgs> = z.object({
  data: z.union([ CookingTeamCreateManyInputSchema,CookingTeamCreateManyInputSchema.array() ]),
}).strict() ;

export const CookingTeamCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamCreateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamCreateManyInputSchema,CookingTeamCreateManyInputSchema.array() ]),
}).strict() ;

export const CookingTeamDeleteArgsSchema: z.ZodType<Prisma.CookingTeamDeleteArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  where: CookingTeamWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamUpdateArgsSchema: z.ZodType<Prisma.CookingTeamUpdateArgs> = z.object({
  select: CookingTeamSelectSchema.optional(),
  include: CookingTeamIncludeSchema.optional(),
  data: z.union([ CookingTeamUpdateInputSchema,CookingTeamUncheckedUpdateInputSchema ]),
  where: CookingTeamWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamUpdateManyArgsSchema: z.ZodType<Prisma.CookingTeamUpdateManyArgs> = z.object({
  data: z.union([ CookingTeamUpdateManyMutationInputSchema,CookingTeamUncheckedUpdateManyInputSchema ]),
  where: CookingTeamWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamUpdateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamUpdateManyMutationInputSchema,CookingTeamUncheckedUpdateManyInputSchema ]),
  where: CookingTeamWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamDeleteManyArgsSchema: z.ZodType<Prisma.CookingTeamDeleteManyArgs> = z.object({
  where: CookingTeamWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamAssignmentCreateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  data: z.union([ CookingTeamAssignmentCreateInputSchema,CookingTeamAssignmentUncheckedCreateInputSchema ]),
}).strict() ;

export const CookingTeamAssignmentUpsertArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpsertArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema,
  create: z.union([ CookingTeamAssignmentCreateInputSchema,CookingTeamAssignmentUncheckedCreateInputSchema ]),
  update: z.union([ CookingTeamAssignmentUpdateInputSchema,CookingTeamAssignmentUncheckedUpdateInputSchema ]),
}).strict() ;

export const CookingTeamAssignmentCreateManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyArgs> = z.object({
  data: z.union([ CookingTeamAssignmentCreateManyInputSchema,CookingTeamAssignmentCreateManyInputSchema.array() ]),
}).strict() ;

export const CookingTeamAssignmentCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentCreateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamAssignmentCreateManyInputSchema,CookingTeamAssignmentCreateManyInputSchema.array() ]),
}).strict() ;

export const CookingTeamAssignmentDeleteArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDeleteArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  where: CookingTeamAssignmentWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamAssignmentUpdateArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateArgs> = z.object({
  select: CookingTeamAssignmentSelectSchema.optional(),
  include: CookingTeamAssignmentIncludeSchema.optional(),
  data: z.union([ CookingTeamAssignmentUpdateInputSchema,CookingTeamAssignmentUncheckedUpdateInputSchema ]),
  where: CookingTeamAssignmentWhereUniqueInputSchema,
}).strict() ;

export const CookingTeamAssignmentUpdateManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyArgs> = z.object({
  data: z.union([ CookingTeamAssignmentUpdateManyMutationInputSchema,CookingTeamAssignmentUncheckedUpdateManyInputSchema ]),
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamAssignmentUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentUpdateManyAndReturnArgs> = z.object({
  data: z.union([ CookingTeamAssignmentUpdateManyMutationInputSchema,CookingTeamAssignmentUncheckedUpdateManyInputSchema ]),
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CookingTeamAssignmentDeleteManyArgsSchema: z.ZodType<Prisma.CookingTeamAssignmentDeleteManyArgs> = z.object({
  where: CookingTeamAssignmentWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const SeasonCreateArgsSchema: z.ZodType<Prisma.SeasonCreateArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  data: z.union([ SeasonCreateInputSchema,SeasonUncheckedCreateInputSchema ]),
}).strict() ;

export const SeasonUpsertArgsSchema: z.ZodType<Prisma.SeasonUpsertArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema,
  create: z.union([ SeasonCreateInputSchema,SeasonUncheckedCreateInputSchema ]),
  update: z.union([ SeasonUpdateInputSchema,SeasonUncheckedUpdateInputSchema ]),
}).strict() ;

export const SeasonCreateManyArgsSchema: z.ZodType<Prisma.SeasonCreateManyArgs> = z.object({
  data: z.union([ SeasonCreateManyInputSchema,SeasonCreateManyInputSchema.array() ]),
}).strict() ;

export const SeasonCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SeasonCreateManyAndReturnArgs> = z.object({
  data: z.union([ SeasonCreateManyInputSchema,SeasonCreateManyInputSchema.array() ]),
}).strict() ;

export const SeasonDeleteArgsSchema: z.ZodType<Prisma.SeasonDeleteArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  where: SeasonWhereUniqueInputSchema,
}).strict() ;

export const SeasonUpdateArgsSchema: z.ZodType<Prisma.SeasonUpdateArgs> = z.object({
  select: SeasonSelectSchema.optional(),
  include: SeasonIncludeSchema.optional(),
  data: z.union([ SeasonUpdateInputSchema,SeasonUncheckedUpdateInputSchema ]),
  where: SeasonWhereUniqueInputSchema,
}).strict() ;

export const SeasonUpdateManyArgsSchema: z.ZodType<Prisma.SeasonUpdateManyArgs> = z.object({
  data: z.union([ SeasonUpdateManyMutationInputSchema,SeasonUncheckedUpdateManyInputSchema ]),
  where: SeasonWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const SeasonUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.SeasonUpdateManyAndReturnArgs> = z.object({
  data: z.union([ SeasonUpdateManyMutationInputSchema,SeasonUncheckedUpdateManyInputSchema ]),
  where: SeasonWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const SeasonDeleteManyArgsSchema: z.ZodType<Prisma.SeasonDeleteManyArgs> = z.object({
  where: SeasonWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TicketPriceCreateArgsSchema: z.ZodType<Prisma.TicketPriceCreateArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  data: z.union([ TicketPriceCreateInputSchema,TicketPriceUncheckedCreateInputSchema ]),
}).strict() ;

export const TicketPriceUpsertArgsSchema: z.ZodType<Prisma.TicketPriceUpsertArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema,
  create: z.union([ TicketPriceCreateInputSchema,TicketPriceUncheckedCreateInputSchema ]),
  update: z.union([ TicketPriceUpdateInputSchema,TicketPriceUncheckedUpdateInputSchema ]),
}).strict() ;

export const TicketPriceCreateManyArgsSchema: z.ZodType<Prisma.TicketPriceCreateManyArgs> = z.object({
  data: z.union([ TicketPriceCreateManyInputSchema,TicketPriceCreateManyInputSchema.array() ]),
}).strict() ;

export const TicketPriceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TicketPriceCreateManyAndReturnArgs> = z.object({
  data: z.union([ TicketPriceCreateManyInputSchema,TicketPriceCreateManyInputSchema.array() ]),
}).strict() ;

export const TicketPriceDeleteArgsSchema: z.ZodType<Prisma.TicketPriceDeleteArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  where: TicketPriceWhereUniqueInputSchema,
}).strict() ;

export const TicketPriceUpdateArgsSchema: z.ZodType<Prisma.TicketPriceUpdateArgs> = z.object({
  select: TicketPriceSelectSchema.optional(),
  include: TicketPriceIncludeSchema.optional(),
  data: z.union([ TicketPriceUpdateInputSchema,TicketPriceUncheckedUpdateInputSchema ]),
  where: TicketPriceWhereUniqueInputSchema,
}).strict() ;

export const TicketPriceUpdateManyArgsSchema: z.ZodType<Prisma.TicketPriceUpdateManyArgs> = z.object({
  data: z.union([ TicketPriceUpdateManyMutationInputSchema,TicketPriceUncheckedUpdateManyInputSchema ]),
  where: TicketPriceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TicketPriceUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TicketPriceUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TicketPriceUpdateManyMutationInputSchema,TicketPriceUncheckedUpdateManyInputSchema ]),
  where: TicketPriceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TicketPriceDeleteManyArgsSchema: z.ZodType<Prisma.TicketPriceDeleteManyArgs> = z.object({
  where: TicketPriceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;