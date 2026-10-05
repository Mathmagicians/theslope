import {describe, it, expect} from 'vitest'
import {decideInstallFace, type InstallCapabilities, type InstallFace} from '~/composables/useInstallPrompt'

const NOTHING: InstallCapabilities = {isStandalone: false, canPrompt: false, hasIosStandaloneFlag: false, isTouchFirst: false, dismissed: false}

describe('decideInstallFace', () => {
    describe.each<[string, Partial<InstallCapabilities>, InstallFace]>([
        ['standalone wins over every offer', {isStandalone: true, canPrompt: true, hasIosStandaloneFlag: true, isTouchFirst: true}, 'none'],
        ['standalone alone', {isStandalone: true}, 'none'],
        ['dismissed wins over the prompt', {dismissed: true, canPrompt: true}, 'none'],
        ['dismissed wins over the iOS flag', {dismissed: true, hasIosStandaloneFlag: true}, 'none'],
        ['dismissed wins over touch-first', {dismissed: true, isTouchFirst: true}, 'none'],
        ['a captured prompt', {canPrompt: true}, 'button'],
        ['a captured prompt wins over the iOS flag', {canPrompt: true, hasIosStandaloneFlag: true}, 'button'],
        ['a captured prompt wins over touch-first', {canPrompt: true, isTouchFirst: true}, 'button'],
        ['the iOS browser flag', {hasIosStandaloneFlag: true}, 'share-instructions'],
        ['the iOS browser flag wins over touch-first', {hasIosStandaloneFlag: true, isTouchFirst: true}, 'share-instructions'],
        ['touch-first alone', {isTouchFirst: true}, 'menu-instructions'],
        ['no capability', {}, 'none']
    ])('%s', (_, capabilities, face) => {
        it(`shows ${face}`, () => {
            expect(decideInstallFace({...NOTHING, ...capabilities})).toBe(face)
        })
    })
})
