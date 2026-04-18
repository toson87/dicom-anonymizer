import { useState } from 'react'
import type { DicomStudy, DicomSeries } from '../../types/dicom'
import { SeriesThumbnail } from './SeriesThumbnail'

interface StudyBrowserProps {
  studies: Map<string, DicomStudy>
  selectedStudyUID: string | null
  selectedSeriesUID: string | null
  selectedStudyUIDs: Set<string>
  onSelect: (studyUID: string, seriesUID: string) => void
  onToggleStudy: (uid: string) => void
  onAddFiles: () => void
  onClear: () => void
}

export function StudyBrowser({
  studies,
  selectedStudyUID,
  selectedSeriesUID,
  selectedStudyUIDs,
  onSelect,
  onToggleStudy,
  onAddFiles,
  onClear,
}: StudyBrowserProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (uid: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })

  const studyList = Array.from(studies.values())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      <header
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 15, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Workspace
          </div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            {studyList.length} {studyList.length === 1 ? 'study' : 'studies'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onAddFiles}
            title="Add more files"
            style={{
              padding: '5px 10px',
              fontSize: 15,
              background: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: 4,
            }}
          >
            + Add
          </button>
          <button
            onClick={onClear}
            title="Clear workspace"
            style={{
              padding: '5px 10px',
              fontSize: 15,
              background: 'transparent',
              color: '#8b949e',
              border: '1px solid #30363d',
              borderRadius: 4,
            }}
          >
            Clear
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {studyList.map(study => {
          const isCollapsed = collapsed.has(study.studyInstanceUID)
          const seriesArr = Array.from(study.series.values())
          return (
            <div key={study.studyInstanceUID} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #21262d' }}>
                <input
                  type="checkbox"
                  checked={selectedStudyUIDs.size === 0 || selectedStudyUIDs.has(study.studyInstanceUID)}
                  onChange={() => onToggleStudy(study.studyInstanceUID)}
                  onClick={e => e.stopPropagation()}
                  style={{ margin: '0 0 0 14px', cursor: 'pointer', accentColor: '#1f6feb', flexShrink: 0 }}
                />
                <button
                  onClick={() => toggle(study.studyInstanceUID)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '8px 14px',
                    background: 'transparent',
                    color: '#c9d1d9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16, color: '#8b949e', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 120ms' }}>
                    ▼
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {study.patientName || '(unnamed patient)'}
                    </div>
                    <div className="mono" style={{ fontSize: 16, color: '#8b949e' }}>
                      {study.studyDate || '—'} · {study.studyDescription || '—'}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 16, color: '#8b949e', background: '#21262d', padding: '2px 6px', borderRadius: 3 }}>
                    {seriesArr.length}
                  </span>
                </button>
              </div>
              {!isCollapsed &&
                seriesArr.map(series => (
                  <SeriesRow
                    key={series.seriesInstanceUID}
                    studyUID={study.studyInstanceUID}
                    series={series}
                    active={selectedStudyUID === study.studyInstanceUID && selectedSeriesUID === series.seriesInstanceUID}
                    onSelect={onSelect}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SeriesRowProps {
  studyUID: string
  series: DicomSeries
  active: boolean
  onSelect: (studyUID: string, seriesUID: string) => void
}

function SeriesRow({ studyUID, series, active, onSelect }: SeriesRowProps) {
  const firstThumb = series.instances[0]?.thumbnailDataURL ?? null
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 14px 8px 28px',
        background: active ? 'rgba(31,111,235,0.12)' : 'transparent',
        borderLeft: active ? '2px solid #1f6feb' : '2px solid transparent',
        cursor: 'pointer',
      }}
      onClick={() => onSelect(studyUID, series.seriesInstanceUID)}
    >
      <SeriesThumbnail src={firstThumb} modality={series.modality} active={active} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {series.seriesDescription || `Series ${series.seriesNumber || '?'}`}
        </div>
        <div className="mono" style={{ fontSize: 16, color: '#8b949e', marginTop: 3 }}>
          #{series.seriesNumber} · {series.instances.length} img
        </div>
      </div>
    </div>
  )
}
