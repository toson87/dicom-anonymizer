import { useEffect, useRef, useState } from 'react'
import type { DicomFile } from '../../types/dicom'
import type { ViewportState } from '../../types/imaging'
import { extractPixelData, computeAutoWindow, UnsupportedPixelDataError } from '../../lib/imaging/pixel-decoder'
import { applyWindowLevel } from '../../lib/imaging/windowing'

interface ViewerCanvasProps {
  instance: DicomFile
  viewport: ViewportState
  onViewportChange: (patch: Partial<ViewportState>) => void
  onResetWindowLevel: (wc: number, ww: number) => void
}

export function ViewerCanvas({ instance, viewport, onViewportChange, onResetWindowLevel }: ViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dragRef = useRef<{ mode: 'pan' | 'wl' | null; startX: number; startY: number } | null>(null)

  // Render pixel data to offscreen canvas when instance or W/L changes
  useEffect(() => {
    try {
      setError(null)
      const pixels = extractPixelData(instance)
      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement('canvas')
      }
      const off = offscreenRef.current
      off.width = pixels.columns
      off.height = pixels.rows

      const rgba = applyWindowLevel(pixels, {
        windowCenter: viewport.windowCenter,
        windowWidth: viewport.windowWidth,
        invert: viewport.invert,
      })
      const ctx = off.getContext('2d')!
      const image = new ImageData(pixels.columns, pixels.rows)
      image.data.set(rgba)
      ctx.putImageData(image, 0, 0)

      drawMain()
    } catch (err) {
      setError(err instanceof UnsupportedPixelDataError ? err.message : `Render failed: ${(err as Error).message}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, viewport.windowCenter, viewport.windowWidth, viewport.invert])

  // Redraw main canvas on viewport change
  useEffect(() => {
    drawMain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport])

  // Auto-fit W/L on first load if not set
  useEffect(() => {
    if (!instance) return
    const wc = instance.windowCenter
    const ww = instance.windowWidth
    if (wc != null && ww != null) {
      onResetWindowLevel(wc, ww)
    } else {
      try {
        const pixels = extractPixelData(instance)
        const auto = computeAutoWindow(pixels)
        onResetWindowLevel(auto.center, auto.width)
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.sopInstanceUID])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => drawMain())
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function drawMain() {
    const canvas = canvasRef.current
    const container = containerRef.current
    const off = offscreenRef.current
    if (!canvas || !container || !off) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const baseScale = Math.min(rect.width / off.width, rect.height / off.height) * 0.95
    const scale = baseScale * viewport.zoom * dpr
    const cx = canvas.width / 2 + viewport.panX * dpr
    const cy = canvas.height / 2 + viewport.panY * dpr

    ctx.translate(cx, cy)
    ctx.rotate((viewport.rotation * Math.PI) / 180)
    ctx.scale(viewport.flipH ? -scale : scale, viewport.flipV ? -scale : scale)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(off, -off.width / 2, -off.height / 2)
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const isRight = e.button === 2 || e.ctrlKey
    dragRef.current = {
      mode: isRight ? 'wl' : 'pan',
      startX: e.clientX,
      startY: e.clientY,
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current || !dragRef.current.mode) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    dragRef.current.startX = e.clientX
    dragRef.current.startY = e.clientY

    if (dragRef.current.mode === 'pan') {
      onViewportChange({ panX: viewport.panX + dx, panY: viewport.panY + dy })
    } else {
      const scaleFactor = Math.max(1, viewport.windowWidth / 256)
      onViewportChange({
        windowWidth: Math.max(1, viewport.windowWidth + dx * scaleFactor),
        windowCenter: viewport.windowCenter + dy * scaleFactor,
      })
    }
  }

  function handleMouseUp() {
    dragRef.current = null
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    onViewportChange({ zoom: Math.max(0.1, Math.min(20, viewport.zoom * factor)) })
  }

  function handleDoubleClick() {
    const wc = instance.windowCenter
    const ww = instance.windowWidth
    if (wc != null && ww != null) {
      onViewportChange({ panX: 0, panY: 0, zoom: 1, windowCenter: wc, windowWidth: ww })
    } else {
      onViewportChange({ panX: 0, panY: 0, zoom: 1 })
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden', cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#f0883e',
            textAlign: 'center',
            padding: 40,
          }}
        >
          <div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Cannot render this image</div>
            <div className="mono" style={{ fontSize: 15, color: '#8b949e' }}>{error}</div>
            <div style={{ fontSize: 15, color: '#8b949e', marginTop: 8 }}>
              Anonymization and export still work.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
