export interface ErrorWithStatusCode {
    statusCode?: number
    message?: string
    cause?: Error
}
