import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { TopBar } from './components/layout/TopBar'
import { DropZone } from './components/dropzone/DropZone'
import { StudyBrowser } from './components/browser/StudyBrowser'
import { ImageViewer } from './components/viewer/ImageViewer'
import { TagInspector } from './components/inspector/TagInspector'
import { AnonPanel } from './components/anonymization/AnonPanel'
import { ProgressModal } from './components/ui/ProgressModal'
import { useDropzone } from './hooks/useDropzone'
import { useWorkspace } from './hooks/useWorkspace'
import { useViewport } from './hooks/useViewport'
import { useAnonymizationConfig } from './hooks/useAnonymizationConfig'
import { defaultExportFilename, downloadBlob } from './lib/zip/exporter'
import type { WorkerResponse, AnonymizeFileInput, AnonymizationSummary, StudyZipResult } from './workers/anonymize.worker'

type ExportPhase =
  | { phase: 'idle' }
  | { phase: 'anonymizing'; processed: number; total: number; currentFile: string }
  | { phase: 'ready'; zipBuffer: ArrayBuffer; filename: string; summary: AnonymizationSummary; anonymized: number; failed: number }
  | { phase: 'ready-batch'; results: StudyZipResult[]; anonymized: number; failed: number }

function serializeConfigForWorker(config: ReturnType<typeof useAnonymizationConfig>['config']) {
  return { ...config, rules: Array.from(config.rules.entries()) }
}

export default function App() {
  const workspace = useWorkspace()
  const viewport = useViewport()
  const anon = useAnonymizationConfig()

  const { isDragging, inputRef, handleInputChange, openFolderPicker } = useDropzone({
    onFiles: files => {
      void workspace.addFiles(files)
    },
  })

  const [exportPhase, setExportPhase] = useState<ExportPhase>({ phase: 'idle' })
  const [selectedStudyUIDs, setSelectedStudyUIDs] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const handleResetWindowLevel = useCallback((wc: number, ww: number) => {
    viewport.setWindowLevel(wc, ww)
  }, [viewport])

  const handleFullReset = useCallback(() => {
    viewport.reset(
      workspace.activeInstance?.windowCenter ?? undefined,
      workspace.activeInstance?.windowWidth ?? undefined,
    )
  }, [viewport, workspace.activeInstance])

  const handleToggleStudy = useCallback((uid: string) => {
    setSelectedStudyUIDs(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }, [])

  const handleDownloadAll = useCallback(() => {
    if (exportPhase.phase !== 'ready-batch') return
    for (const result of exportPhase.results) downloadBlob(result.zipBuffer, result.filename)
  }, [exportPhase])

  const handleDownloadOne = useCallback((result: StudyZipResult) => {
    downloadBlob(result.zipBuffer, result.filename)
  }, [])

  const handleClear = useCallback(() => {
    workspace.clearAll()
    setSelectedStudyUIDs(new Set())
  }, [workspace])

  const totalInstancesToProcess = useMemo(() => {
    const studiesToCount = selectedStudyUIDs.size === 0
      ? Array.from(workspace.state.studies.values())
      : Array.from(workspace.state.studies.values()).filter(s => selectedStudyUIDs.has(s.studyInstanceUID))
    let count = 0
    for (const study of studiesToCount)
      for (const series of study.series.values())
        count += series.instances.length
    return count
  }, [workspace.state.studies, selectedStudyUIDs])

  const handleAnonymize = useCallback(async () => {
    if (workspace.totalInstances === 0) return

    const studiesToProcess = Array.from(workspace.state.studies.values()).filter(study =>
      selectedStudyUIDs.size === 0 || selectedStudyUIDs.has(study.studyInstanceUID)
    )

    const files: AnonymizeFileInput[] = []
    for (const study of studiesToProcess) {
      for (const series of study.series.values()) {
        for (const inst of series.instances) {
          files.push({
            name: inst.file.name || `${inst.sopInstanceUID}.dcm`,
            buffer: inst.rawBuffer,
            path: `${safe(study.patientName || 'patient')}_${safe(study.studyInstanceUID).slice(-8)}/${safe(series.seriesDescription || 'series_' + series.seriesNumber)}`,
          })
        }
      }
    }

    setExportPhase({ phase: 'anonymizing', processed: 0, total: files.length, currentFile: '' })

    const worker = new Worker(new URL('./workers/anonymize.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const filename = defaultExportFilename()

    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      const m = e.data
      if (m.type === 'progress') {
        setExportPhase({ phase: 'anonymizing', processed: m.processed, total: m.total, currentFile: m.currentFile })
      } else if (m.type === 'complete-batch') {
        setExportPhase({ phase: 'ready-batch', results: m.results, anonymized: m.anonymized, failed: m.failed })
        worker.terminate()
        workerRef.current = null
      } else if (m.type === 'complete') {
        setExportPhase({ phase: 'ready', zipBuffer: m.zipBuffer, filename, summary: m.summary, anonymized: m.anonymized, failed: m.failed })
        worker.terminate()
        workerRef.current = null
      } else if (m.type === 'error') {
        alert(`Anonymization failed: ${m.error}`)
        setExportPhase({ phase: 'idle' })
        worker.terminate()
        workerRef.current = null
      }
    })

    worker.addEventListener('error', e => {
      alert(`Worker error: ${e.message}`)
      setExportPhase({ phase: 'idle' })
      worker.terminate()
      workerRef.current = null
    })

    // Clone buffers so UI-held originals remain valid after transfer
    const clones = files.map(f => ({ ...f, buffer: f.buffer.slice(0) }))
    worker.postMessage(
      {
        type: 'anonymize',
        files: clones,
        config: serializeConfigForWorker(anon.config),
        batchMode,
      },
      clones.map(f => f.buffer),
    )
  }, [workspace, anon.config, selectedStudyUIDs, batchMode])

  const handleDownload = useCallback(() => {
    if (exportPhase.phase !== 'ready') return
    downloadBlob(exportPhase.zipBuffer, exportPhase.filename)
  }, [exportPhase])

  const handleResetExport = useCallback(() => {
    setExportPhase({ phase: 'idle' })
  }, [])

  const hasFiles = workspace.state.studies.size > 0

  const header = useMemo(
    () => <TopBar studyCount={workspace.state.studies.size} instanceCount={workspace.totalInstances} />,
    [workspace.state.studies.size, workspace.totalInstances],
  )

  return (
    <>
      <AppShell
        header={header}
        left={
          hasFiles ? (
            <StudyBrowser
              studies={workspace.state.studies}
              selectedStudyUID={workspace.state.selectedStudyUID}
              selectedSeriesUID={workspace.state.selectedSeriesUID}
              selectedStudyUIDs={selectedStudyUIDs}
              onSelect={workspace.selectSeries}
              onToggleStudy={handleToggleStudy}
              onAddFiles={openFolderPicker}
              onClear={handleClear}
            />
          ) : (
            <EmptySidebar onBrowse={openFolderPicker} />
          )
        }
        center={
          <ImageViewer
            instance={workspace.activeInstance}
            series={workspace.activeSeries}
            activeIndex={workspace.state.activeInstanceIndex}
            onActiveIndexChange={workspace.setActiveInstance}
            viewport={viewport.viewport}
            onViewportChange={patch => viewport.setViewport(v => ({ ...v, ...patch }))}
            onResetWindowLevel={handleResetWindowLevel}
            onFullReset={handleFullReset}
          />
        }
        right={
          <TagInspector
            instance={workspace.activeInstance}
            config={anon.config}
            onUpdateRule={anon.updateRule}
          />
        }
        rightFooter={
          <AnonPanel
            config={anon.config}
            affectedTagCount={anon.affectedTagCount}
            totalInstances={totalInstancesToProcess}
            onPresetChange={anon.selectPreset}
            onRemovePrivateTagsChange={anon.setRemovePrivateTags}
            onDateShiftDaysChange={anon.setDateShiftDays}
            onRandomizeDateShift={anon.randomizeDateShift}
            onDateShiftPerPatientChange={anon.setDateShiftPerPatient}
            onPseudonymSaltChange={anon.setPseudonymSalt}
            onAgeBinChange={anon.setAgeBin}
            onReproducibleUIDsChange={anon.setReproducibleUIDs}
            onPatientNameModeChange={anon.setPatientNameMode}
            onPatientNameTemplateChange={anon.setPatientNameTemplate}
            batchMode={batchMode}
            onBatchModeChange={setBatchMode}
            exportPhase={exportPhase}
            onAnonymize={handleAnonymize}
            onDownload={handleDownload}
            onDownloadAll={handleDownloadAll}
            onDownloadOne={handleDownloadOne}
            onResetExport={handleResetExport}
          />
        }
      />
      {!hasFiles && (
        <DropZone
          isDragging={isDragging}
          inputRef={inputRef}
          onInputChange={handleInputChange}
          onBrowseClick={openFolderPicker}
          fullscreen
        />
      )}
      {hasFiles && isDragging && (
        <DropZone
          isDragging
          inputRef={inputRef}
          onInputChange={handleInputChange}
          onBrowseClick={openFolderPicker}
          fullscreen
        />
      )}
      <ProgressModal
        open={workspace.loading}
        title="Loading DICOM files"
        message={workspace.progress.currentFile}
        processed={workspace.progress.processed}
        total={workspace.progress.total}
      />
    </>
  )
}

function EmptySidebar({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div style={{ padding: 16, color: '#8b949e', fontSize: 16, height: '100%', background: '#0d1117' }}>
      <div style={{ fontSize: 15, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Workspace
      </div>
      <p style={{ margin: '0 0 12px', lineHeight: 1.5 }}>
        No files loaded. Drop a DICOM folder anywhere on this window, or choose one below.
      </p>
      <button
        onClick={onBrowse}
        style={{
          padding: '8px 12px',
          fontSize: 16,
          background: '#1f6feb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        Select folder…
      </button>
    </div>
  )
}

function safe(s: string): string {
  return (s || 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60)
}
