import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {composeEmail, siteUrl} from '~~/server/utils/sender/compose'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {formatDate} from '~/utils/date'

const LOG = '📮 > SENDER > [EVENT waitlist]'

export interface WaitlistDinnerContext {
    dinnerEventId: number
    date: Date
    menuTitle: string
}

// The mail names the dinner by its date and menu
const dinnerLabel = ({date, menuTitle}: WaitlistDinnerContext): string => `${formatDate(date)} · ${menuTitle}`

export const emitWaitlistJoined = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, position: number
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_JOINED', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) return notSent('WAITLIST_JOINED', 'unaddressed', `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_JOINED',
        to,
        values: {name, dinner: dinnerLabel(dinner), position: String(position)},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistTicketAssigned = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_TICKET_ASSIGNED', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) return notSent('WAITLIST_TICKET_ASSIGNED', 'unaddressed', `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_TICKET_ASSIGNED',
        to,
        values: {name, dinner: dinnerLabel(dinner), ticket},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistBuildup = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, entries: number, portions: number
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_BUILDUP', channel.missing, `${dinner.dinnerEventId}`)
    const {queue, config} = channel
    if (!to) {
        console.warn(`${LOG} the chef of dinner ${dinner.dinnerEventId} has no address — buildup mail not sent`)
        return notSent('WAITLIST_BUILDUP', 'unaddressed', `${dinner.dinnerEventId}`)
    }
    return emit(queue, composeEmail(config, {
        kind: 'WAITLIST_BUILDUP',
        to,
        values: {
            name,
            dinner: dinnerLabel(dinner),
            entries: String(entries),
            portions: portions.toLocaleString('da-DK'),
            dinnerUrl: siteUrl(config, '/chef')
        },
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistTicketSold = (
    channel: EmailChannel, to: string, dinner: WaitlistDinnerContext
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_TICKET_SOLD', channel.missing, `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_TICKET_SOLD',
        to,
        values: {dinner: dinnerLabel(dinner)},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}
