import { z } from 'zod';
import type { Prisma } from '../client/client';

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

export const UserScalarFieldEnumSchema = z.enum(['id','email','phone','passwordHash','systemRoles','notificationChannels','appearance','createdAt','updatedAt']);

export const SettingScalarFieldEnumSchema = z.enum(['key','value','updatedAt','updatedByUserId']);

export const InhabitantScalarFieldEnumSchema = z.enum(['id','heynaboId','userId','householdId','pictureUrl','name','lastName','birthDate','dinnerPreferences']);

export const HouseholdScalarFieldEnumSchema = z.enum(['id','heynaboId','pbsId','movedInDate','moveOutDate','name','address']);

export const DinnerEventScalarFieldEnumSchema = z.enum(['id','date','menuTitle','menuDescription','menuPictureUrl','state','totalCost','heynaboEventId','chefId','cookingTeamId','createdAt','updatedAt','seasonId']);

export const OrderScalarFieldEnumSchema = z.enum(['id','dinnerEventId','inhabitantId','bookedByUserId','ticketPriceId','priceAtBooking','dinnerMode','state','isGuestTicket','releasedAt','closedAt','createdAt','updatedAt']);

export const TransactionScalarFieldEnumSchema = z.enum(['id','orderId','orderSnapshot','userSnapshot','amount','userEmailHandle','createdAt','invoiceId']);

export const InvoiceScalarFieldEnumSchema = z.enum(['id','cutoffDate','paymentDate','billingPeriod','amount','createdAt','householdId','billingPeriodSummaryId','pbsId','address']);

export const BillingPeriodSummaryScalarFieldEnumSchema = z.enum(['id','billingPeriod','shareToken','totalAmount','householdCount','ticketCount','cutoffDate','paymentDate','createdAt','version']);

export const DeliveryScalarFieldEnumSchema = z.enum(['id','subjectType','subjectId','version','kind','reference','jobRunId','deliveredAt']);

export const CookingTeamScalarFieldEnumSchema = z.enum(['id','seasonId','name','affinity']);

export const CookingTeamAssignmentScalarFieldEnumSchema = z.enum(['id','cookingTeamId','inhabitantId','role','allocationPercentage','affinity','createdAt','updatedAt']);

export const SeasonScalarFieldEnumSchema = z.enum(['id','shortName','seasonDates','isActive','cookingDays','holidays','ticketIsCancellableDaysBefore','diningModeIsEditableMinutesBefore','consecutiveCookingDays']);

export const TicketPriceScalarFieldEnumSchema = z.enum(['id','seasonId','ticketType','price','description','maximumAgeLimit']);

export const OrderHistoryScalarFieldEnumSchema = z.enum(['id','orderId','action','performedByUserId','auditData','timestamp','inhabitantId','dinnerEventId','seasonId']);

export const JobRunScalarFieldEnumSchema = z.enum(['id','jobType','status','startedAt','completedAt','durationMs','resultSummary','errorMessage','triggeredBy']);

export const DinnerDutyTemplateScalarFieldEnumSchema = z.enum(['id','cookingTeamId','role','minutesFromDinnerStart','durationMinutes','taskDescription','createdAt','updatedAt']);

export const JokerSlotScalarFieldEnumSchema = z.enum(['id','cookingTeamId','role','allocationPercentage','affinity','startDate','endDate','note','createdAt','updatedAt']);

export const DinnerDutyScalarFieldEnumSchema = z.enum(['id','dinnerEventId','inhabitantId','origin','role','minutesFromDinnerStart','durationMinutes','taskDescription','createdAt','updatedAt']);

export const DutyHistoryScalarFieldEnumSchema = z.enum(['id','dinnerDutyId','action','performedByUserId','auditData','timestamp','swapGroupId','inhabitantId','dinnerEventId','seasonId']);

export const TicketWaitlistScalarFieldEnumSchema = z.enum(['id','dinnerEventId','inhabitantId','isGuestTicket','order','createdAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullsOrderSchema = z.enum(['first','last']);

export const SystemRoleSchema = z.enum(['ADMIN','ALLERGYMANAGER']);

export type SystemRoleType = `${z.infer<typeof SystemRoleSchema>}`

export const NotificationChannelSchema = z.enum(['EMAIL','SMS']);

export type NotificationChannelType = `${z.infer<typeof NotificationChannelSchema>}`

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

export const DeliverySubjectSchema = z.enum(['BILLING_PERIOD']);

export type DeliverySubjectType = `${z.infer<typeof DeliverySubjectSchema>}`

export const DeliveryKindSchema = z.enum(['ARCHIVE','EMAIL','SMS']);

export type DeliveryKindType = `${z.infer<typeof DeliveryKindSchema>}`

export const DutyAuditActionSchema = z.enum(['DUTY_ASSIGNED','DUTY_UNASSIGNED','DUTY_SWAPPED','DUTY_UPDATED','ROSTER_SIGNED_OFF']);

export type DutyAuditActionType = `${z.infer<typeof DutyAuditActionSchema>}`

export const DutyOriginSchema = z.enum(['TEAM','JOKER','VOLUNTEER','SWAP']);

export type DutyOriginType = `${z.infer<typeof DutyOriginSchema>}`

