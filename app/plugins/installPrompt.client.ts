/**
 * Captures Chromium's install offer from app start: `beforeinstallprompt` fires around page load,
 * before the dashboard's install card mounts. useInstallPrompt reads the captured state.
 */
export default defineNuxtPlugin(() => {
    const deferredPrompt = useState<BeforeInstallPromptEvent | null>(INSTALL_PROMPT_STATE.event, () => null)
    const installed = useState<boolean>(INSTALL_PROMPT_STATE.installed, () => false)

    window.addEventListener('beforeinstallprompt', event => {
        // The event is not cancelled: the browser's own install bar shows alongside the card
        // markRaw: a reactive proxy breaks the native prompt() call (illegal invocation)
        deferredPrompt.value = markRaw(event as BeforeInstallPromptEvent)
    })

    window.addEventListener('appinstalled', () => {
        installed.value = true
        deferredPrompt.value = null
    })
})
