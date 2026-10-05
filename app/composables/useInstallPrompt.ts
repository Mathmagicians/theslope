/**
 * Pure UI composable for install guidance (ADR-017): client-only, never imported from server/.
 * The face follows the browser's capability, never the device type (C3 in
 * docs/features/feature-proposal-mobile-native-feel.md).
 */

export type InstallFace = 'none' | 'button' | 'share-instructions' | 'menu-instructions'

export type InstallCapabilities = {
    /** The app already runs installed (display-mode standalone, or iOS home-screen launch) */
    isStandalone: boolean
    /** Chromium offered an install prompt (`beforeinstallprompt` captured) */
    canPrompt: boolean
    /** A share-sheet browser tab (iOS): `navigator.standalone` exists and is false */
    hasIosStandaloneFlag: boolean
    /** A touch-first device (coarse pointer, no hover) with no better signal: the browser menu installs */
    isTouchFirst: boolean
    /** The user chose Ikke nu on this device */
    dismissed: boolean
}

/** Chromium-only event, absent from lib.dom */
export type BeforeInstallPromptEvent = Event & {prompt: () => Promise<unknown>}

/** useState keys the client plugin `installPrompt.client.ts` writes at app start */
export const INSTALL_PROMPT_STATE = {
    event: 'install-prompt-event',
    installed: 'install-prompt-installed'
} as const

/** The media queries the card reads on mount */
export const INSTALL_MEDIA_QUERIES = {
    standalone: '(display-mode: standalone)',
    touchFirst: '(pointer: coarse) and (hover: none)'
} as const

/** Safari-only property, absent from lib.dom */
type SafariNavigator = Navigator & {standalone?: boolean}

export const INSTALL_DISMISSED_COOKIE = 'theslope-install-dismissed'
const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90

export const decideInstallFace = ({isStandalone, canPrompt, hasIosStandaloneFlag, isTouchFirst, dismissed}: InstallCapabilities): InstallFace => {
    if (isStandalone || dismissed) return 'none'
    if (canPrompt) return 'button'
    if (hasIosStandaloneFlag) return 'share-instructions'
    if (isTouchFirst) return 'menu-instructions'
    return 'none'
}

export const useInstallPrompt = () => {
    const dismissed = useCookie<boolean>(INSTALL_DISMISSED_COOKIE, {default: () => false, maxAge: NINETY_DAYS_SECONDS})

    // The browser facts are read on mount; SSR and the first client render show nothing
    const isStandalone = ref(false)
    const hasIosStandaloneFlag = ref(false)
    const isTouchFirst = ref(false)
    // Captured from app start by plugins/installPrompt.client.ts
    const deferredPrompt = useState<BeforeInstallPromptEvent | null>(INSTALL_PROMPT_STATE.event, () => null)
    const installed = useState<boolean>(INSTALL_PROMPT_STATE.installed, () => false)

    onMounted(() => {
        const nav = window.navigator as SafariNavigator
        isStandalone.value = window.matchMedia(INSTALL_MEDIA_QUERIES.standalone).matches || nav.standalone === true
        hasIosStandaloneFlag.value = 'standalone' in nav && nav.standalone === false
        isTouchFirst.value = window.matchMedia(INSTALL_MEDIA_QUERIES.touchFirst).matches
    })

    const face = computed<InstallFace>(() => installed.value
        ? 'none'
        : decideInstallFace({
            isStandalone: isStandalone.value,
            canPrompt: deferredPrompt.value !== null,
            hasIosStandaloneFlag: hasIosStandaloneFlag.value,
            isTouchFirst: isTouchFirst.value,
            dismissed: dismissed.value
        }))

    const promptInstall = async () => {
        await deferredPrompt.value?.prompt()
        // prompt() works once per captured event
        deferredPrompt.value = null
    }

    const dismiss = () => {
        dismissed.value = true
    }

    return {face, promptInstall, dismiss}
}
