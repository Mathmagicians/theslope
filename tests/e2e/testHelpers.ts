import {authFiles} from './config'
const { adminFile } = authFiles

const salt = (base: string, testSalt: string = Date.now().toString()):string => `${base}-${testSalt}`
const headers = {'Content-Type': 'application/json'}
const validatedBrowserContext = async (browser:Browser) => {
    return await browser.newContext({
        storageState: adminFile
    })
}

const testHelpers = {
    salt,
    headers,
    validatedBrowserContext
}

export default testHelpers
