import {encode, type QrCodeGenerateOptions} from 'uqr'

type QrPath = {
    /** Width and height of the module grid, border included - the SVG viewBox */
    size: number
    /** Every dark module as a 1x1 rect, in module units */
    d: string
}

/**
 * Encode a QR code to ONE SVG path, in module units rather than pixels, so the caller
 * picks the rendered size through the viewBox without re-encoding. Same rect shape as
 * uqr's own renderSVG.
 */
export const encodeQrPath = (
    value: string,
    {ecc = 'M', border = 1}: Pick<QrCodeGenerateOptions, 'ecc' | 'border'> = {}
): QrPath => {
    const {size, data} = encode(value, {ecc, border})

    return {
        size,
        d: data
            .flatMap((row, y) => row.flatMap((isDark, x) => isDark ? [`M${x},${y}h1v1h-1z`] : []))
            .join('')
    }
}
