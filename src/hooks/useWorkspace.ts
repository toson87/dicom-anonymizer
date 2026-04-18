import { useCallback, useMemo, useRef, useState } from 'react'
import type { DicomFile, DicomStudy, WorkspaceState } from '../types/dicom'
import { addFileToWorkspace, parseDicomFile } from '../lib/dicom/parser'
import { generateThumbnail } from '../lib/imaging/thumbnail'

export interface LoadProgress {
  total: number
  processed: number
  failed: number
  currentFile: string
}

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    studies: new Map(),
    selectedStudyUID: null,
    selectedSeriesUID: null,
    activeInstanceIndex: 0,
  })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<LoadProgress>({
    total: 0,
    processed: 0,
    failed: 0,
    currentFile: '',
  })
  const [errors, setErrors] = useState<string[]>([])

  // Dedup across multiple drops
  const seenFiles = useRef<Set<string>>(new Set())

  const addFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setProgress({ total: files.length, processed: 0, failed: 0, currentFile: '' })
    const newErrors: string[] = []

    const accepted: DicomFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const key = `${file.name}:${file.size}:${file.lastModified}`
      setProgress(p => ({ ...p, processed: i, currentFile: file.name }))

      if (seenFiles.current.has(key)) continue
      seenFiles.current.add(key)

      const outcome = await parseDicomFile(file)
      if (outcome.file) {
        accepted.push(outcome.file)
      } else if (outcome.error && !(outcome.error.message === 'Missing required UIDs')) {
        // Silently skip non-DICOM files (parse failure) but record UID-less DICOMs
        if (!/dicM|first 4 bytes|DICM/i.test(outcome.error.message)) {
          newErrors.push(`${file.name}: ${outcome.error.message}`)
        }
      }

      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
    }

    if (accepted.length > 0) {
      setState(prev => {
        let studies = prev.studies
        for (const df of accepted) studies = addFileToWorkspace(studies, df)
        // Auto-select first study/series if none selected
        let selectedStudyUID = prev.selectedStudyUID
        let selectedSeriesUID = prev.selectedSeriesUID
        if (!selectedStudyUID) {
          const firstStudy = studies.values().next().value as DicomStudy | undefined
          if (firstStudy) {
            selectedStudyUID = firstStudy.studyInstanceUID
            const firstSeries = firstStudy.series.values().next().value
            if (firstSeries) selectedSeriesUID = firstSeries.seriesInstanceUID
          }
        }
        return {
          studies,
          selectedStudyUID,
          selectedSeriesUID,
          activeInstanceIndex: 0,
        }
      })

      // Generate thumbnails for series whose first instance lacks one
      queueMicrotask(async () => {
        for (const df of accepted) {
          if (df.thumbnailDataURL) continue
          const url = await generateThumbnail(df)
          if (url) {
            df.thumbnailDataURL = url
            // Trigger re-render
            setState(prev => ({ ...prev }))
          }
        }
      })
    }

    setProgress(p => ({ ...p, processed: files.length }))
    setErrors(prev => [...prev, ...newErrors])
    setLoading(false)
  }, [])

  const selectSeries = useCallback((studyUID: string, seriesUID: string) => {
    setState(prev => ({
      ...prev,
      selectedStudyUID: studyUID,
      selectedSeriesUID: seriesUID,
      activeInstanceIndex: 0,
    }))
  }, [])

  const setActiveInstance = useCallback((index: number) => {
    setState(prev => ({ ...prev, activeInstanceIndex: index }))
  }, [])

  const clearAll = useCallback(() => {
    seenFiles.current.clear()
    setState({
      studies: new Map(),
      selectedStudyUID: null,
      selectedSeriesUID: null,
      activeInstanceIndex: 0,
    })
    setErrors([])
  }, [])

  const activeInstance = useMemo((): DicomFile | null => {
    if (!state.selectedStudyUID || !state.selectedSeriesUID) return null
    const study = state.studies.get(state.selectedStudyUID)
    if (!study) return null
    const series = study.series.get(state.selectedSeriesUID)
    if (!series || series.instances.length === 0) return null
    const idx = Math.min(state.activeInstanceIndex, series.instances.length - 1)
    return series.instances[idx]
  }, [state])

  const activeSeries = useMemo(() => {
    if (!state.selectedStudyUID || !state.selectedSeriesUID) return null
    return state.studies.get(state.selectedStudyUID)?.series.get(state.selectedSeriesUID) ?? null
  }, [state])

  const totalInstances = useMemo(() => {
    let count = 0
    for (const study of state.studies.values()) {
      for (const series of study.series.values()) {
        count += series.instances.length
      }
    }
    return count
  }, [state.studies])

  return {
    state,
    loading,
    progress,
    errors,
    activeInstance,
    activeSeries,
    totalInstances,
    addFiles,
    selectSeries,
    setActiveInstance,
    clearAll,
  }
}
