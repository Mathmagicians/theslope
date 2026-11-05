import {describe, expect, it} from 'vitest'
import {errorMessage} from '~~/workers/common/error'

describe('errorMessage', () => {
    it.each([
        {thrown: 'an error', error: new Error('D1 down'), message: 'D1 down'},
        {thrown: 'a value that is no error', error: 'D1 down', message: 'D1 down'}
    ])('GIVEN $thrown thrown WHEN its message is read THEN it reads $message', ({error, message}) => {
        expect(errorMessage(error)).toBe(message)
    })
})
