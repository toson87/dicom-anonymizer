import { useCallback, useState } from 'react'
import type { ViewportState } from '../types/imaging'

const DEFAULT_VIEWPORT: ViewportState = {
  windowCenter: 128,
  windowWidth: 256,
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  invert: false,
}

export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT)

  const reset = useCallback((wc?: number, ww?: number) => {
    setViewport({
      ...DEFAULT_VIEWPORT,
      windowCenter: wc ?? DEFAULT_VIEWPORT.windowCenter,
      windowWidth: ww ?? DEFAULT_VIEWPORT.windowWidth,
    })
  }, [])

  const setWindowLevel = useCallback((wc: number, ww: number) => {
    setViewport(v => ({ ...v, windowCenter: wc, windowWidth: Math.max(1, ww) }))
  }, [])

  const adjustPan = useCallback((dx: number, dy: number) => {
    setViewport(v => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }))
  }, [])

  const adjustZoom = useCallback((factor: number) => {
    setViewport(v => ({ ...v, zoom: Math.max(0.1, Math.min(20, v.zoom * factor)) }))
  }, [])

  const toggleInvert = useCallback(() => {
    setViewport(v => ({ ...v, invert: !v.invert }))
  }, [])

  return {
    viewport,
    setViewport,
    reset,
    setWindowLevel,
    adjustPan,
    adjustZoom,
    toggleInvert,
  }
}
