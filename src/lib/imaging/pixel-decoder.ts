import type { DicomFile } from '../../types/dicom'
import type { PixelData } from '../../types/imaging'
import { UNCOMPRESSED_TRANSFER_SYNTAXES } from '../../constants/transfer-syntaxes'

export class UnsupportedPixelDataError extends Error {}

export function extractPixelData(df: DicomFile): PixelData {
  if (!UNCOMPRESSED_TRANSFER_SYNTAXES.has(df.transferSyntaxUID)) {
    throw new UnsupportedPixelDataError(
      `Transfer syntax ${df.transferSyntaxUID} is compressed and not supported for rendering in this build. Anonymization still works.`,
    )
  }

  const pixelEl = df.dataSet.elements['x7fe00010']
  if (!pixelEl) {
    throw new UnsupportedPixelDataError('No pixel data element present')
  }

  const numPixels = df.rows * df.columns
  const byteArray = df.dataSet.byteArray
  const offset = byteArray.byteOffset + pixelEl.dataOffset

  let buffer: Uint8Array | Uint16Array | Int16Array
  if (df.bitsAllocated <= 8) {
    buffer = new Uint8Array(byteArray.buffer, offset, numPixels)
  } else if (df.pixelRepresentation === 1) {
    buffer = new Int16Array(byteArray.buffer, offset, numPixels)
  } else {
    buffer = new Uint16Array(byteArray.buffer, offset, numPixels)
  }

  return {
    buffer,
    rows: df.rows,
    columns: df.columns,
    bitsAllocated: df.bitsAllocated,
    bitsStored: df.bitsStored,
    highBit: df.highBit,
    pixelRepresentation: df.pixelRepresentation,
    rescaleSlope: df.rescaleSlope,
    rescaleIntercept: df.rescaleIntercept,
    photometricInterpretation: df.photometricInterpretation,
  }
}

export function computeAutoWindow(pixelData: PixelData): { center: number; width: number } {
  const buf = pixelData.buffer
  const slope = pixelData.rescaleSlope
  const intercept = pixelData.rescaleIntercept

  // Sample for speed on large images
  const step = Math.max(1, Math.floor(buf.length / 10000))
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < buf.length; i += step) {
    const v = buf[i] * slope + intercept
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!isFinite(min) || !isFinite(max) || min === max) {
    return { center: 128, width: 256 }
  }
  return { center: (min + max) / 2, width: Math.max(1, max - min) }
}
