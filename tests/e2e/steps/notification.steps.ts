import {expect, type BrowserContext} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {When, Then, fromScene, contextOfActor, personOf, periodOf, REQUEST, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useDeliveryValidation, type Delivery, type SenderEvent} from '~/composables/useDeliveryValidation'
import type {NotificationKind} from '~/config/notificationTemplates'

const {pollUntil} = testHelpers
const {DeliverySubjectSchema, DeliveryKindSchema, NotificationKindSchema, SenderEventSchema, deliveryReferencePrefix, coveringDeliveries} = useDeliveryValidation()
const {DINNER_EVENT, ORDER, TICKET_WAITLIST, BILLING_PERIOD} = DeliverySubjectSchema.enum
const {ARCHIVE, EMAIL} = DeliveryKindSchema.enum
const Notification = NotificationKindSchema.enum

/** The subjects whose delivery records a THEN reads, by their words in a feature */
const SUBJECT = {DINNER: 'the dinner', PERIOD: 'the period'} as const
type Subject = typeof SUBJECT[keyof typeof SUBJECT]

/** The accountant's mail of a period's first version and of each later one */
const ACCOUNTANT_MAILS = [Notification.BILLING_PERIOD_CLOSED, Notification.BILLING_PERIOD_UPDATED]

defineParameterType({name: 'subject', regexp: Object.values(SUBJECT)})
defineParameterType({name: 'notification', regexp: [...NotificationKindSchema.options]})
defineParameterType({name: 'senderEvent', regexp: [...SenderEventSchema.options]})

/**
 * The delivery records of the scenario dinner's subjects: the dinner, its orders and its places on the waiting list, the
 * places a sale removed included. Read in the signed-in actor's context: every member reads them
 */
const dinnerRecords = async (admin: BrowserContext, scene: Scene): Promise<Delivery[]> => {
    const {event} = fromScene(scene, 'dinner')
    const [orders, entries] = await Promise.all([OrderFactory.getAllOrdersForEvents(admin, event.id), WaitlistFactory.entries(admin, [event.id])])
    return SenderFactory.getDeliveriesOfSubjects(fromScene(scene, 'context'), {
        [DINNER_EVENT]: [event.id],
        [ORDER]: orders.map(order => order.id),
        [TICKET_WAITLIST]: [...new Set([...scene.places, ...entries.map(entry => entry.id)])]
    })
}

/** The scenario's billing period and its current version: the earlier versions' records are earlier scenarios' runs */
const currentPeriodOf = async (admin: BrowserContext, scene: Scene): Promise<{periodId: number, version: number}> => {
    const periodId = await periodOf(admin, scene)
    const {version} = await BillingFactory.getBillingPeriodById(admin, periodId)
    return {periodId, version}
}

const periodRecords = async (admin: BrowserContext, scene: Scene): Promise<Delivery[]> => {
    const {periodId, version} = await currentPeriodOf(admin, scene)
    return (await SenderFactory.getDeliveries(fromScene(scene, 'context'), BILLING_PERIOD, [periodId])).filter(row => row.version === version)
}

const recordsOf = (admin: BrowserContext, scene: Scene, subject: Subject): Promise<Delivery[]> => {
    switch (subject) {
        case SUBJECT.DINNER:
            return dinnerRecords(admin, scene)
        case SUBJECT.PERIOD:
            return periodRecords(admin, scene)
    }
}

/**
 * The records once `count` of the selected ones are in: a notification is sent after its action. A count of 0 reads
 * at once, as nothing signals that no notification follows
 */
const recordsWhen = async (read: () => Promise<Delivery[]>, select: (rows: Delivery[]) => Delivery[], count: number): Promise<string[]> =>
    select(await pollUntil(read, rows => select(rows).length >= count)).map(row => row.reference)

/** The user who hears about the actor's person: its own user, else its household's first user */
const closestUserIdOf = async (admin: BrowserContext, scene: Scene, actor: Actor): Promise<number> => {
    const userId = await HouseholdFactory.closestUserIdOf(admin, personOf(scene, actor))
    if (userId === null) throw new Error(`${actor} has no closest user: nobody in the household has a login`)
    return userId
}

Then('{int} delivery record(s) is/are in the database for {subject}', async ({adminContext: admin, scene}, count: number, subject: Subject) => {
    const references = await recordsWhen(() => recordsOf(admin, scene, subject), rows => rows, count)
    expect(references, `${count} delivery records for ${subject}`).toHaveLength(count)
})

Then('{int} CSV archive(s) is/are uploaded for {subject}', async ({adminContext: admin, scene}, count: number, subject: Subject) => {
    const references = await recordsWhen(() => recordsOf(admin, scene, subject), rows => rows.filter(row => row.kind === ARCHIVE), count)
    expect(references, `${count} CSV archives for ${subject}`).toHaveLength(count)
})

Then('{int} {notification} email(s) is/are sent to the closest user of {actor}', async ({adminContext: admin, scene}, count: number, notification: NotificationKind, actor: Actor) => {
    const userId = await closestUserIdOf(admin, scene, actor)
    const prefix = deliveryReferencePrefix(notification, EMAIL, userId)
    const references = await recordsWhen(() => dinnerRecords(admin, scene), rows => rows.filter(row => row.kind === EMAIL && row.reference.startsWith(prefix)), count)
    expect(references, `${count} ${notification} emails to user ${userId}, the closest user of ${actor}`).toHaveLength(count)
})

Then('{int} {senderEvent} email(s) is/are sent to the accountant', async ({adminContext: admin, scene}, count: number, senderEvent: SenderEvent) => {
    switch (senderEvent) {
        case SenderEventSchema.enum.MONTHLY_BILLING: {
            const {periodId, version} = await currentPeriodOf(admin, scene)
            // The accountant is a configured mailbox: the delivery step's own predicate tells its rows from a user's
            const toAccountant = (rows: Delivery[]) => ACCOUNTANT_MAILS.flatMap(notification =>
                coveringDeliveries(rows, {subjectType: BILLING_PERIOD, subjectId: periodId, version, notification, userId: null}, EMAIL))
            const references = await recordsWhen(() => periodRecords(admin, scene), toAccountant, count)
            expect(references, `${count} ${senderEvent} emails to the accountant`).toHaveLength(count)
            break
        }
        case SenderEventSchema.enum.BOOKING_STATUS:
        case SenderEventSchema.enum.CHEF_DEADLINES:
            throw new Error(`${senderEvent} emails the inhabitants' users, not the accountant`)
    }
})

When('{actor} runs the delivery dry run of the booking notifications', async ({scene}, actor: Actor) => {
    const dryRun = await SenderFactory.getDeliveryDryRun(contextOfActor(scene, actor), SenderEventSchema.enum.BOOKING_STATUS)
    if (!dryRun) throw new Error('The delivery dry run answered nothing')
    scene.dryRun = dryRun
})

Then('the delivery dry run counts {int} {notification} email(s) to send to the closest user of {actor}', async ({adminContext: admin, scene}, count: number, notification: NotificationKind, actor: Actor) => {
    const userId = await closestUserIdOf(admin, scene, actor)
    const user = fromScene(scene, 'dryRun').users.find(entry => entry.userId === userId)
    expect(user?.toSend[notification] ?? 0, `the dry run counts ${count} ${notification} emails to user ${userId}`).toBe(count)
})

When('the delivery records of the unknown subject are read', async ({scene}) => {
    const {status} = await SenderFactory.getDeliveriesByQueryRaw(fromScene(scene, 'context'), {subjectType: 'NOT_A_SUBJECT', subjectIds: ['1']})
    scene.answer = {request: REQUEST.READ, status}
})
