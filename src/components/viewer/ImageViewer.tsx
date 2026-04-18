import type { DicomFile, DicomSeries } from '../../types/dicom'
import type { ViewportState } from '../../types/imaging'
import { SliceScrubber } from './SliceScrubber'
import { ViewerCanvas } from './ViewerCanvas'
import { ViewerToolbar } from './ViewerToolbar'

interface ImageViewerProps {
  instance: DicomFile | null
  series: DicomSeries | null
  activeIndex: number
  onActiveIndexChange: (i: number) => void
  viewport: ViewportState
  onViewportChange: (patch: Partial<ViewportState>) => void
  onResetWindowLevel: (wc: number, ww: number) => void
  onFullReset: () => void
}

export function ImageViewer({
  instance,
  series,
  activeIndex,
  onActiveIndexChange,
  viewport,
  onViewportChange,
  onResetWindowLevel,
  onFullReset,
}: ImageViewerProps) {
  if (!instance || !series) {
    return (
      <div
        style={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          background: '#000',
          color: '#484f58',
          fontSize: 15,
        }}
      >
        Select a series from the workspace to view.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <ViewerToolbar viewport={viewport} onViewportChange={onViewportChange} onReset={onFullReset} />
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        <ViewerCanvas
          instance={instance}
          viewport={viewport}
          onViewportChange={onViewportChange}
          onResetWindowLevel={onResetWindowLevel}
        />
        <Overlay instance={instance} series={series} />
      </div>
      <SliceScrubber
        total={series.instances.length}
        index={activeIndex}
        onChange={onActiveIndexChange}
      />
    </div>
  )
}

function Overlay({ instance, series }: { instance: DicomFile; series: DicomSeries }) {
  const textStyle: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 15,
    color: '#c9d1d9',
    textShadow: '0 0 4px #000, 0 0 2px #000',
    lineHeight: 1.5,
  }
  return (
    <>
      <div style={{ position: 'absolute', top: 10, left: 14, ...textStyle, pointerEvents: 'none' }}>
        <div>{series.modality || 'UNK'} · Series {series.seriesNumber || '?'}</div>
        <div style={{ color: '#8b949e' }}>{series.seriesDescription}</div>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 14, ...textStyle, textAlign: 'right', pointerEvents: 'none' }}>
        <div>{instance.columns} × {instance.rows}</div>
        <div style={{ color: '#8b949e' }}>Bits: {instance.bitsAllocated} · PR: {instance.pixelRepresentation ? 'S' : 'U'}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 14, ...textStyle, color: '#8b949e', pointerEvents: 'none' }}>
        Drag: pan · Ctrl+drag: W/L · Wheel: zoom · DblClick: reset
      </div>
    </>
  )
}
