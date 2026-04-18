import type { PixelData } from '../../types/imaging'

export interface WindowingOptions {
  windowCenter: number
  windowWidth: number
  invert: boolean
}

export function applyWindowLevel(
  pixelData: PixelData,
  opts: WindowingOptions,
): Uint8ClampedArray {
  const { buffer, rows, columns, rescaleSlope, rescaleIntercept, photometricInterpretation } = pixelData
  const output = new Uint8ClampedArray(rows * columns * 4)
  const low = opts.windowCenter - opts.windowWidth / 2
  const widthInv = 255 / Math.max(1, opts.windowWidth)

  const invert = opts.invert !== (photometricInterpretation === 'MONOCHROME1')

  for (let i = 0; i < buffer.length; i++) {
    const hu = buffer[i] * rescaleSlope + rescaleIntercept
    let gray = Math.round((hu - low) * widthInv)
    if (gray < 0) gray = 0
    else if (gray > 255) gray = 255
    if (invert) gray = 255 - gray
    const j = i * 4
    output[j] = gray
    output[j + 1] = gray
    output[j + 2] = gray
    output[j + 3] = 255
  }
  return output
}
