
type TabNavigationConfig = {
    tabs: string[]  //  tab name to be matched from the url, /basepath/:tab, param has to be named [tab]
    basePath: string
    additionalParams?: string[] // like /basepath/:param1/:tab
}

/** Composable for managing tab navigation via URL parameters.
 * Enables url params like /basePath/:tab or /nested/:param1/:tab2 to control active tab in a component.
 * Values in the tabs object define valid tab keys and their components, that the tab selector will use.
 * Default tab is the first tab in the tabs array.
 * @param config
 */
export function useTabNavigation(config: TabNavigationConfig) {

    const {
        tabs,
        basePath,
        additionalParams = []
    } = config

    if (tabs.length === 0) throw new Error('useTabNavigation requires at least one tab to be defined in the tabs object')
    const defaultTabValue:string = tabs[0]

    const isValidTab = (tab?: string): boolean => !!tab &&  tabs.includes(tab.toLowerCase())

    const route = useRoute()

    const getSafeTab = (tab?: string): string => tab && isValidTab(tab) ? tab.toLowerCase() : defaultTabValue

    // constructs an url /basepath/param_0/../param_n/tab
    const constructUrlForTab = (tab: string, routeParams: Record<string, string | string[] | undefined> = {}) => {
        const paramSegments = additionalParams.map(paramName => {
            const paramValue = routeParams[paramName]
            // Handle both string and array params (arrays take first value)
            const value = Array.isArray(paramValue) ? paramValue[0] : paramValue
            return value ? `/${value}` : ''
        }).join('')
        return `${basePath}${paramSegments}/${tab}`
    }

    const updateRouteParamFromTab = async (tab: string) => {
        if (route.params.tab === tab) return
        const url = constructUrlForTab(tab, route.params)
        await navigateTo({
            path: url,
            query: route.query
        }, {replace: true})
        console.info(`🔗 > Navigated to tab ${url} for tab ${tab}`)
    }

    const activeTab = computed({
        get() {
            const tabParam = route.params.tab as string | undefined
            return getSafeTab(tabParam)
        },
        async set(tabKey: string) {
            await updateRouteParamFromTab(tabKey)
        }
    })

    // signal - should url be fixed
    const shouldSyncActiveTab = computed(() => {
        const tabParam = route.params.tab as string | undefined
        const safeTab = getSafeTab(tabParam)
        return tabParam !== safeTab
    })

    // autosync when signal is true, ie route param is out of sync, or invalid, then  set to safe tab (it normalizes invalids)
    watchPostEffect(() => {
        if (shouldSyncActiveTab.value) activeTab.value = getSafeTab(route.params.tab as string | undefined)
    })


    return {
        activeTab,
        isValidTab,
        shouldSyncActiveTab,
        constructUrlForTab  // Exposed for testing
    }
}
