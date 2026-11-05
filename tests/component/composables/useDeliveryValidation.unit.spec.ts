import {describe, expect, it} from 'vitest'
import {deliveredVersions, useDeliveryValidation, type Delivery, type DesiredDelivery} from '~/composables/useDeliveryValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

const {DeliveryKindSchema, DeliveredVersionsSchema, deliveryReferencePrefix, coveringDeliveries, shouldSend} = useDeliveryValidation()
const {ARCHIVE, EMAIL, SMS} = DeliveryKindSchema.enum
const {Kind} = NotificationFactory

describe('deliveredVersions', () => {
    it.each([
        ['no rows', [], {[ARCHIVE]: 0, [EMAIL]: 0, [SMS]: 0}],
        ['several versions and a re-send', [{kind: ARCHIVE, version: 1}, {kind: EMAIL, version: 1}, {kind: ARCHIVE, version: 2}, {kind: EMAIL, version: 2}, {kind: EMAIL, version: 2}], {[ARCHIVE]: 2, [EMAIL]: 2, [SMS]: 0}]
    ] as const)('reduces %s to the highest version per kind', (_name, rows, expected) => {
        expect(deliveredVersions(rows.map(row => NotificationFactory.defaultDelivery(row)))).toEqual(expected)
    })
})

describe('DeliveredVersionsSchema', () => {
    it('tracks a delivered version for every kind', () => {
        expect(Object.keys(DeliveredVersionsSchema.shape)).toEqual(DeliveryKindSchema.options)
    })
})

// A Delivery row's reference leads with the notification, the channel and the user, whatever the user's address
describe('deliveryReferencePrefix', () => {
    it.each([
        {notification: Kind.WAITLIST_JOINED, channel: EMAIL, userId: 7},
        {notification: Kind.TICKET_SOLD, channel: SMS, userId: 12}
    ])('GIVEN $notification on $channel to user $userId THEN the prefix names the three, the user by its id', ({notification, channel, userId}) => {
        expect(deliveryReferencePrefix(notification, channel, userId)).toBe(`${notification}:${channel}:user-${userId}/`)
    })
})

// A recorded row covers a desired delivery of the same subject, version, notification, channel and user, a mailbox's
// row a delivery to a mailbox; a delivery is sent when nothing covers it, and an admin's re-send sends it whatever covers it
describe('coveringDeliveries and shouldSend', () => {
    const {TICKET_WAITLIST, ORDER} = useDeliveryValidation().DeliverySubjectSchema.enum
    const desired = NotificationFactory.defaultDesiredDelivery({subjectType: TICKET_WAITLIST, userId: 6})
    // What a recorded row has of its own, beside the desired delivery's key
    type RowKey = Partial<DesiredDelivery> & {kind?: Delivery['kind']}

    it.each<{recorded: string, rows: RowKey[], delivery?: Partial<DesiredDelivery>, adminOverride: boolean, covered: number, send: boolean}>([
        {recorded: 'no row', rows: [], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of the same key', rows: [{}], adminOverride: false, covered: 1, send: false},
        {recorded: 'two rows of the same key', rows: [{}, {}], adminOverride: false, covered: 2, send: false},
        {recorded: 'a row of another user whose address masks alike', rows: [{userId: 7}], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of another version', rows: [{version: desired.version + 1}], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of another notification', rows: [{notification: Kind.TICKET_SOLD}], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of another channel', rows: [{kind: SMS}], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of another subject', rows: [{subjectType: ORDER}], adminOverride: false, covered: 0, send: true},
        {recorded: 'a row of the same key, re-sent by an admin', rows: [{}], adminOverride: true, covered: 1, send: true},
        {recorded: 'a user\'s row of the same subject, version and notification, the delivery to a mailbox', rows: [{}], delivery: {userId: null}, adminOverride: false, covered: 0, send: true},
        {recorded: 'a mailbox\'s row of the same subject, version and notification, the delivery to the mailbox', rows: [{userId: null}], delivery: {userId: null}, adminOverride: false, covered: 1, send: false}
    ])('GIVEN $recorded WHEN asked THEN $covered rows cover the delivery and it is sent: $send', ({rows, delivery, adminOverride, covered, send}) => {
        const recorded = rows.map(({kind, ...key}) => NotificationFactory.recordedDelivery({...desired, ...key}, kind))
        const asked = {...desired, ...delivery}

        expect(coveringDeliveries(recorded, asked, EMAIL)).toEqual(recorded.slice(0, covered))
        expect(shouldSend(coveringDeliveries(recorded, asked, EMAIL).length, adminOverride)).toBe(send)
    })
})

// A recorded row delivered the notification its reference leads with, on whichever channel and to whomever it went
describe('isDeliveryOf', () => {
    const {isDeliveryOf} = useDeliveryValidation()
    const buildup = NotificationFactory.defaultDesiredDelivery({notification: Kind.WAITLIST_BUILDUP})

    it.each([
        {recorded: 'a user\'s row of the notification', row: () => NotificationFactory.recordedDelivery(buildup), of: true},
        {recorded: 'a mailbox\'s row of the notification', row: () => NotificationFactory.recordedDelivery({...buildup, userId: null}), of: true},
        {recorded: 'a row of the notification on another channel', row: () => NotificationFactory.recordedDelivery(buildup, SMS), of: true},
        {recorded: 'a row of another notification on the same subject', row: () => NotificationFactory.recordedDelivery({...buildup, notification: Kind.CHEF_DINNER_DEADLINES}), of: false}
    ])('GIVEN $recorded WHEN asked THEN it is a delivery of the notification: $of', ({row, of}) => {
        expect(isDeliveryOf(Kind.WAITLIST_BUILDUP)(row())).toBe(of)
    })
})

// The delivery read's query (GET /api/admin/sender/delivery): the recorded deliveries of one subject type and its
// subjects' ids, one or repeated; or the dry run of the booking status sender event's desired deliveries. Each names
// its read
describe('DeliveryQuerySchema', () => {
    const {DeliveryQuerySchema, DeliverySubjectSchema, SenderEventSchema, DeliveryReadSchema} = useDeliveryValidation()
    const {BILLING_PERIOD} = DeliverySubjectSchema.enum
    const SenderEvent = SenderEventSchema.enum
    const Read = DeliveryReadSchema.enum

    // A refused query parses to null
    it.each([
        {query: 'one id', given: {subjectType: BILLING_PERIOD, subjectIds: '7'}, parsed: {read: Read.RECORDED, subjectType: BILLING_PERIOD, subjectIds: [7]}},
        {query: 'repeated ids', given: {subjectType: BILLING_PERIOD, subjectIds: ['7', '8']}, parsed: {read: Read.RECORDED, subjectType: BILLING_PERIOD, subjectIds: [7, 8]}},
        {query: 'the booking status sender event', given: {dryRun: SenderEvent.BOOKING_STATUS}, parsed: {read: Read.DRY_RUN, senderEvent: SenderEvent.BOOKING_STATUS}},
        {query: 'the monthly billing sender event', given: {dryRun: SenderEvent.MONTHLY_BILLING}, parsed: null},
        {query: 'the chef deadlines sender event', given: {dryRun: SenderEvent.CHEF_DEADLINES}, parsed: null},
        {query: 'an unknown sender event', given: {dryRun: 'NOT_A_SENDER_EVENT'}, parsed: null},
        {query: 'an unknown subject type', given: {subjectType: 'NOT_A_SUBJECT', subjectIds: '7'}, parsed: null},
        {query: 'an id that is no number', given: {subjectType: BILLING_PERIOD, subjectIds: 'abc'}, parsed: null},
        {query: 'nothing', given: {}, parsed: null}
    ])('GIVEN a query of $query WHEN parsed THEN it names its read, or is refused', ({given, parsed}) => {
        const result = DeliveryQuerySchema.safeParse(given)

        expect(result.success ? result.data : null).toEqual(parsed)
    })
})
