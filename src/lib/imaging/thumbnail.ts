import type { DicomFile } from '../../types/dicom'
import { extractPixelData, computeAutoWindow, UnsupportedPixelDataError } from './pixel-decoder'
import { applyWindowLevel } from './windowing'

const THUMB_SIZE = 96

export async function generateThumbnail(df: DicomFile): Promise<string | null> {
  try {
    const pixels = extractPixelData(df)
    const wc = df.windowCenter ?? computeAutoWindow(pixels).center
    const ww = df.windowWidth ?? computeAutoWindow(pixels).width
    const rgba = applyWindowLevel(pixels, {
      windowCenter: wc,
      windowWidth: ww,
      invert: false,
    })

    const src = new OffscreenCanvas(pixels.columns, pixels.rows)
    const srcCtx = src.getContext('2d')!
    const imageData = srcCtx.createImageData(pixels.columns, pixels.rows)
    imageData.data.set(rgba)
    srcCtx.putImageData(imageData, 0, 0)

    const dst = new OffscreenCanvas(THUMB_SIZE, THUMB_SIZE)
    const dstCtx = dst.getContext('2d')!
    const scale = Math.min(THUMB_SIZE / pixels.columns, THUMB_SIZE / pixels.rows)
    const w = pixels.columns * scale
    const h = pixels.rows * scale
    dstCtx.fillStyle = '#000'
    dstCtx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE)
    dstCtx.drawImage(src, (THUMB_SIZE - w) / 2, (THUMB_SIZE - h) / 2, w, h)
    const blob = await dst.convertToBlob({ type: 'image/png' })
    return await blobToDataURL(blob)
  } catch (err) {
    if (!(err instanceof UnsupportedPixelDataError)) {
      console.warn('thumbnail generation failed:', err)
    }
    return null
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
