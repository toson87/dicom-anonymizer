import { useState } from 'react'
import type {
  AgeBin,
  AnonymizationConfig,
  AnonymizationPreset,
  PatientNameMode,
  TagAction,
} from '../../types/anonymization'
import { PRESET_DESCRIPTIONS, PRESET_LABELS } from '../../constants/anonymization-presets'
import type { AnonymizationSummary, StudyZipResult } from '../../workers/anonymize.worker'

type ExportPhase =
  | { phase: 'idle' }
  | { phase: 'anonymizing'; processed: number; total: number; currentFile: string }
  | { phase: 'ready'; zipBuffer: ArrayBuffer; filename: string; summary: AnonymizationSummary; anonymized: number; failed: number }
  | { phase: 'ready-batch'; results: StudyZipResult[]; anonymized: number; failed: number }

interface AnonPanelProps {
  config: AnonymizationConfig
  affectedTagCount: number
  totalInstances: number
  onPresetChange: (preset: AnonymizationPreset) => void
  onRemovePrivateTagsChange: (v: boolean) => void
  onDateShiftDaysChange: (days: number) => void
  onRandomizeDateShift: () => void
  onDateShiftPerPatientChange: (v: boolean) => void
  onPseudonymSaltChange: (salt: string) => void
  onAgeBinChange: (bin: AgeBin) => void
  onReproducibleUIDsChange: (v: boolean) => void
  onPatientNameModeChange: (mode: PatientNameMode) => void
  onPatientNameTemplateChange: (tpl: string) => void
  batchMode: boolean
  onBatchModeChange: (v: boolean) => void
  exportPhase: ExportPhase
  onAnonymize: () => void
  onDownload: () => void
  onDownloadAll: () => void
  onDownloadOne: (result: StudyZipResult) => void
  onResetExport: () => void
}

const PRESETS: AnonymizationPreset[] = ['minimal', 'standard', 'ml', 'public', 'custom']

export function AnonPanel({
  config,
  affectedTagCount,
  totalInstances,
  onPresetChange,
  onRemovePrivateTagsChange,
  onDateShiftDaysChange,
  onRandomizeDateShift,
  onDateShiftPerPatientChange,
  onPseudonymSaltChange,
  onAgeBinChange,
  onReproducibleUIDsChange,
  onPatientNameModeChange,
  onPatientNameTemplateChange,
  batchMode,
  onBatchModeChange,
  exportPhase,
  onAnonymize,
  onDownload,
  onDownloadAll,
  onDownloadOne,
  onResetExport,
}: AnonPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const isIdle = exportPhase.phase === 'idle'
  const isAnonymizing = exportPhase.phase === 'anonymizing'
  const isReady = exportPhase.phase === 'ready'

  return (
    <div
      style={{
        borderTop: '1px solid #30363d',
        background: '#0d1117',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Anonymization
        </div>
        <div className="mono" style={{ fontSize: 16, color: '#8b949e' }}>
          {affectedTagCount} rules active
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            style={{
              padding: '8px 4px',
              fontSize: 15,
              fontWeight: config.preset === p ? 500 : 400,
              background: config.preset === p ? '#1f6feb' : '#161b22',
              color: config.preset === p ? '#fff' : '#c9d1d9',
              border: `1px solid ${config.preset === p ? '#1f6feb' : '#30363d'}`,
              borderRadius: 4,
              textAlign: 'center',
              lineHeight: 1.2,
              cursor: 'pointer',
            }}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 15, color: '#8b949e', margin: 0, lineHeight: 1.5 }}>
        {PRESET_DESCRIPTIONS[config.preset]}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#c9d1d9', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.removePrivateTags}
            onChange={e => onRemovePrivateTagsChange(e.target.checked)}
          />
          Remove private tags (odd groups)
        </label>
        {isIdle && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#c9d1d9', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={batchMode}
              onChange={e => onBatchModeChange(e.target.checked)}
            />
            Per-study ZIPs (one ZIP per study)
          </label>
        )}
      </div>

      {(isIdle || isAnonymizing) && (
        <AdvancedSection
          open={advancedOpen}
          onToggle={() => setAdvancedOpen(v => !v)}
          config={config}
          onDateShiftDaysChange={onDateShiftDaysChange}
          onRandomizeDateShift={onRandomizeDateShift}
          onDateShiftPerPatientChange={onDateShiftPerPatientChange}
          onPseudonymSaltChange={onPseudonymSaltChange}
          onAgeBinChange={onAgeBinChange}
          onReproducibleUIDsChange={onReproducibleUIDsChange}
          onPatientNameModeChange={onPatientNameModeChange}
          onPatientNameTemplateChange={onPatientNameTemplateChange}
        />
      )}

      {/* Step 1: Anonymize button */}
      {isIdle && (
        <button
          onClick={onAnonymize}
          disabled={totalInstances === 0}
          style={{
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: 500,
            background: totalInstances > 0 ? '#238636' : '#21262d',
            color: totalInstances > 0 ? '#fff' : '#8b949e',
            border: `1px solid ${totalInstances > 0 ? '#2ea043' : '#30363d'}`,
            borderRadius: 4,
            cursor: totalInstances > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Anonymize
          <span className="mono" style={{ fontSize: 16, opacity: 0.8 }}>
            ({totalInstances} files)
          </span>
        </button>
      )}

      {/* Progress inline */}
      {isAnonymizing && (
        <div style={{ border: '1px solid #30363d', borderRadius: 4, padding: '10px 12px', background: '#010409' }}>
          <div style={{ fontSize: 15, color: '#c9d1d9', marginBottom: 6 }}>
            Anonymizing… {exportPhase.processed} / {exportPhase.total}
          </div>
          <div style={{ background: '#21262d', borderRadius: 3, height: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#1f6feb',
                width: `${exportPhase.total > 0 ? (exportPhase.processed / exportPhase.total) * 100 : 0}%`,
                transition: 'width 120ms',
              }}
            />
          </div>
          {exportPhase.currentFile && (
            <div className="mono" style={{ fontSize: 16, color: '#8b949e', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exportPhase.currentFile}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Summary + Download */}
      {isReady && (
        <AnonymizationResultPanel
          summary={exportPhase.summary}
          anonymized={exportPhase.anonymized}
          failed={exportPhase.failed}
          onDownload={onDownload}
          onReset={onResetExport}
        />
      )}

      {exportPhase.phase === 'ready-batch' && (
        <BatchResultPanel
          results={exportPhase.results}
          anonymized={exportPhase.anonymized}
          failed={exportPhase.failed}
          onDownloadOne={onDownloadOne}
          onDownloadAll={onDownloadAll}
          onReset={onResetExport}
        />
      )}
    </div>
  )
}

const ACTION_LABELS: Partial<Record<TagAction, string>> = {
  X: 'removed', Z: 'cleared', D: 'replaced', U: 'UID remapped',
  S: 'date-shifted', M: 'masked', P: 'pseudonymised',
}

function AnonymizationResultPanel({
  summary, anonymized, failed, onDownload, onReset,
}: {
  summary: AnonymizationSummary
  anonymized: number
  failed: number
  onDownload: () => void
  onReset: () => void
}) {
  const [sampleOpen, setSampleOpen] = useState(false)
  const counts = summary.tagActionCounts
  const pills = (Object.entries(counts) as [TagAction, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <div style={{ border: '1px solid #30363d', borderRadius: 4, background: '#010409', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, color: '#3fb950', fontWeight: 500 }}>
          {anonymized} file{anonymized !== 1 ? 's' : ''} anonymized{failed > 0 ? ` · ${failed} failed` : ''}
        </span>
        <button
          onClick={onReset}
          style={{ fontSize: 16, color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
        >
          Re-anonymize
        </button>
      </div>

      {/* Tag action counts */}
      <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {pills.map(([action, n]) => (
          <span
            key={action}
            className="mono"
            style={{
              fontSize: 16,
              padding: '2px 6px',
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 10,
              color: '#c9d1d9',
            }}
          >
            {n} {ACTION_LABELS[action] ?? action}
          </span>
        ))}
      </div>

      {/* Collapsible sample changes */}
      {summary.sampleChanges.length > 0 && (
        <div style={{ borderTop: '1px solid #21262d' }}>
          <button
            onClick={() => setSampleOpen(v => !v)}
            style={{
              width: '100%',
              padding: '6px 12px',
              background: 'transparent',
              color: '#8b949e',
              border: 'none',
              textAlign: 'left',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 16, display: 'inline-block', transform: sampleOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>▶</span>
            Sample changes ({summary.sampleChanges.length})
          </button>
          {sampleOpen && (
            <div style={{ padding: '0 12px 8px' }}>
              {summary.sampleChanges.map((c, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 16, color: '#8b949e' }}>{c.keyword}: </span>
                  <span className="mono" style={{ fontSize: 16, color: '#ff8a80' }}>{c.original || '—'}</span>
                  <span style={{ fontSize: 16, color: '#8b949e' }}> → </span>
                  <span className="mono" style={{ fontSize: 16, color: '#3fb950' }}>{c.anonymized || '(empty)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Download button */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #21262d' }}>
        <button
          onClick={onDownload}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: 500,
            background: '#1f6feb',
            color: '#fff',
            border: '1px solid #388bfd',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points="7 10 12 15 17 10" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
          </svg>
          Download ZIP
        </button>
      </div>
    </div>
  )
}

interface AdvancedSectionProps {
  open: boolean
  onToggle: () => void
  config: AnonymizationConfig
  onDateShiftDaysChange: (days: number) => void
  onRandomizeDateShift: () => void
  onDateShiftPerPatientChange: (v: boolean) => void
  onPseudonymSaltChange: (salt: string) => void
  onAgeBinChange: (bin: AgeBin) => void
  onReproducibleUIDsChange: (v: boolean) => void
  onPatientNameModeChange: (mode: PatientNameMode) => void
  onPatientNameTemplateChange: (tpl: string) => void
}

function AdvancedSection({
  open,
  onToggle,
  config,
  onDateShiftDaysChange,
  onRandomizeDateShift,
  onDateShiftPerPatientChange,
  onPseudonymSaltChange,
  onAgeBinChange,
  onReproducibleUIDsChange,
  onPatientNameModeChange,
  onPatientNameTemplateChange,
}: AdvancedSectionProps) {
  return (
    <div
      style={{
        border: '1px solid #30363d',
        borderRadius: 4,
        background: '#010409',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
          color: '#c9d1d9',
          border: 'none',
          textAlign: 'left',
          fontSize: 15,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontSize: 15,
            color: '#8b949e',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms',
            display: 'inline-block',
          }}
        >
          ▶
        </span>
        Advanced
      </button>

      {open && (
        <div style={{ padding: '4px 10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Date shift */}
          <div>
            <div style={{ fontSize: 16, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Date shift
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                value={config.dateShiftDays}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  onDateShiftDaysChange(isNaN(v) ? 0 : Math.max(-9999, Math.min(9999, v)))
                }}
                className="mono"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '4px 8px',
                  fontSize: 15,
                  background: '#161b22',
                  color: '#c9d1d9',
                  border: '1px solid #30363d',
                  borderRadius: 3,
                  outline: 'none',
                }}
              />
              <span className="mono" style={{ fontSize: 16, color: '#8b949e' }}>days</span>
              <button
                type="button"
                onClick={onRandomizeDateShift}
                title="Randomize ±30..±365"
                style={{
                  padding: '4px 8px',
                  fontSize: 16,
                  background: '#21262d',
                  color: '#c9d1d9',
                  border: '1px solid #30363d',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                🎲
              </button>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: 15,
                color: '#c9d1d9',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={config.dateShiftPerPatient}
                onChange={e => onDateShiftPerPatientChange(e.target.checked)}
              />
              Shift per-patient (derive offset from PatientID + salt)
            </label>
          </div>

          {/* Pseudonym salt */}
          <div>
            <div style={{ fontSize: 16, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Pseudonym salt
            </div>
            <input
              type="text"
              value={config.pseudonymSalt}
              onChange={e => onPseudonymSaltChange(e.target.value)}
              placeholder="random salt"
              className="mono"
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 15,
                background: '#161b22',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: 3,
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 16, color: '#8b949e', marginTop: 4, lineHeight: 1.4 }}>
              Used by action <span className="mono">P</span> to deterministically hash values.
              Same salt + same source → same pseudonym across sessions.
            </div>
          </div>

          {/* Age binning */}
          <div>
            <div style={{ fontSize: 16, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Age binning
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {[
                { unit: 'off' as const, step: 1, label: 'Off' },
                { unit: 'M' as const, step: 1, label: '1M' },
                { unit: 'M' as const, step: 3, label: '3M' },
                { unit: 'M' as const, step: 6, label: '6M' },
                { unit: 'Y' as const, step: 1, label: '1Y' },
                { unit: 'Y' as const, step: 5, label: '5Y' },
                { unit: 'Y' as const, step: 10, label: '10Y' },
              ].map(opt => (
                <button
                  key={`${opt.unit}-${opt.step}`}
                  onClick={() => onAgeBinChange({ unit: opt.unit, step: opt.step })}
                  style={{
                    padding: '4px 8px',
                    fontSize: 16,
                    background: config.ageBin.unit === opt.unit && config.ageBin.step === opt.step ? '#1f6feb' : '#161b22',
                    color: config.ageBin.unit === opt.unit && config.ageBin.step === opt.step ? '#fff' : '#c9d1d9',
                    border: `1px solid ${config.ageBin.unit === opt.unit && config.ageBin.step === opt.step ? '#1f6feb' : '#30363d'}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 16, color: '#8b949e', lineHeight: 1.4 }}>
              Rounds PatientAge: Off=keep as-is, M/Y=bin to nearest N months/years (converted as needed).
            </div>
          </div>

          {/* Patient name format */}
          <div>
            <div style={{ fontSize: 16, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Patient name format
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {(['dummy', 'template', 'fake'] as const).map(mode => (
                <label
                  key={mode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 15,
                    color: '#c9d1d9',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="patient-name-mode"
                    checked={config.patientNameMode === mode}
                    onChange={() => onPatientNameModeChange(mode)}
                  />
                  {mode === 'dummy' ? 'Dummy' : mode === 'template' ? 'Template' : 'Fake name'}
                </label>
              ))}
            </div>
            {config.patientNameMode === 'template' && (
              <input
                type="text"
                value={config.patientNameTemplate}
                onChange={e => onPatientNameTemplateChange(e.target.value)}
                placeholder="ANON^{n}"
                className="mono"
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 15,
                  background: '#161b22',
                  color: '#c9d1d9',
                  border: '1px solid #30363d',
                  borderRadius: 3,
                  outline: 'none',
                  marginBottom: 4,
                }}
              />
            )}
            <div style={{ fontSize: 16, color: '#8b949e' }}>
              {config.patientNameMode === 'dummy' && 'Fixed dummy name for all patients.'}
              {config.patientNameMode === 'template' && 'Use {n} as placeholder for patient sequence number (1, 2, 3...).'}
              {config.patientNameMode === 'fake' && 'Generate realistic-looking names (consistent for same patient).'}
            </div>
          </div>

          {/* Reproducible UIDs */}
          {!config.retainUIDs && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#c9d1d9', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.reproducibleUIDs}
                  onChange={e => onReproducibleUIDsChange(e.target.checked)}
                />
                Reproducible UIDs (hash-based, consistent across sessions)
              </label>
              <div style={{ fontSize: 16, color: '#8b949e', marginTop: 4, lineHeight: 1.4 }}>
                When enabled, the same input files always produce the same anonymized UIDs (deterministic).
                When disabled, UIDs are randomized per session.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BatchResultPanel({
  results, anonymized, failed, onDownloadOne, onDownloadAll, onReset,
}: {
  results: StudyZipResult[]
  anonymized: number
  failed: number
  onDownloadOne: (r: StudyZipResult) => void
  onDownloadAll: () => void
  onReset: () => void
}) {
  return (
    <div style={{ border: '1px solid #30363d', borderRadius: 4, background: '#010409', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, color: '#3fb950', fontWeight: 500 }}>
          {results.length} stud{results.length !== 1 ? 'ies' : 'y'} · {anonymized} file{anonymized !== 1 ? 's' : ''} anonymized
          {failed > 0 ? ` · ${failed} failed` : ''}
        </span>
        <button onClick={onReset} style={{ fontSize: 16, color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
          Re-anonymize
        </button>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {results.map(r => (
          <div key={r.studyKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #21262d' }}>
            <div>
              <div className="mono" style={{ fontSize: 15, color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{r.studyKey}</div>
              <div className="mono" style={{ fontSize: 16, color: '#8b949e' }}>
                {r.anonymized} file{r.anonymized !== 1 ? 's' : ''}{r.failed > 0 ? ` · ${r.failed} failed` : ''}
              </div>
            </div>
            <button
              onClick={() => onDownloadOne(r)}
              style={{ fontSize: 15, padding: '4px 10px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}
            >
              Download
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #21262d' }}>
        <button
          onClick={onDownloadAll}
          style={{ width: '100%', padding: '10px 16px', fontSize: 15, fontWeight: 500, background: '#1f6feb', color: '#fff', border: '1px solid #388bfd', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points="7 10 12 15 17 10" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
          </svg>
          Download all ({results.length})
        </button>
      </div>
    </div>
  )
}
