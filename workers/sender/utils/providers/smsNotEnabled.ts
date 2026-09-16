/**
 * The SMS port with no gateway behind it yet.
 *
 * Contract, masking and tests for SMS are in place now; the GatewayAPI adapter replaces
 * this stub in a later package. Failing terminally means such a message is acked with a
 * warning and acknowledged on the first attempt.
 */
import {TerminalError} from '~/utils/delivery'
import type {SmsProvider} from '~/utils/providers/types'

export const SMS_NOT_ENABLED = 'SMS_NOT_ENABLED'

export const smsNotEnabledProvider: SmsProvider = {
    send: () => Promise.reject(new TerminalError(SMS_NOT_ENABLED, 'SMS channel not enabled in this release'))
}
