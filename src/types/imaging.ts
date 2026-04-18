export interface ViewportState {
  windowCenter: number
  windowWidth: number
  zoom: number
  panX: number
  panY: number
  rotation: number
  flipH: boolean
  flipV: boolean
  invert: boolean
}

export interface PixelData {
  buffer: Uint8Array | Uint16Array | Int16Array
  rows: number
  columns: number
  bitsAllocated: number
  bitsStored: number
  highBit: number
  pixelRepresentation: number
  rescaleSlope: number
  rescaleIntercept: number
  photometricInterpretation: string
}
