// Off-main-thread pipeline: parse → anonymize → serialize → zip.
// Build-time note: imported from App.tsx via
//   new Worker(new URL('./workers/anonymize.worker.ts', import.meta.url), { type: 'module' })

import dicomParser from 'dicom-parser'
import JSZip from 'jszip'
import type { AnonymizationConfig, TagAction } from '../types/anonymization'
import {
  anonymizeDataSet,
  collectPatientIDs,
  collectPseudonymInputs,
  collectUIDs,
} from '../lib/dicom/anonymizer'
import { pseudonymize } from '../lib/dicom/pseudonym'
import { serializeDicom } from '../lib/dicom/serializer'
import { UIDRemapper } from '../lib/dicom/uid-generator'
import { lookupTag } from '../lib/dicom/tag-dictionary'

export interface AnonymizeFileInput {
  name: string
  buffer: ArrayBuffer
  /** Optional subfolder within the ZIP */
  path?: string
}

export interface AnonymizationSummary {
  filesProcessed: number
  tagActionCounts: Partial<Record<TagAction, number>>
  sampleChanges: Array<{
    tag: string
    keyword: string
    action: TagAction
    original: string
    anonymized: string
  }>
}

export interface StudyZipResult {
  studyKey: string
  filename: string
  zipBuffer: ArrayBuffer
  anonymized: number
  failed: number
}

export type WorkerRequest =
  | {
      type: 'anonymize'
      files: AnonymizeFileInput[]
      config: AnonymizationConfig
      uidRemap?: Record<string, string>
      batchMode?: boolean
    }

export type WorkerResponse =
  | { type: 'progress'; processed: number; total: number; currentFile: string }
  | { type: 'complete'; zipBuffer: ArrayBuffer; anonymized: number; failed: number; summary: AnonymizationSummary }
  | { type: 'complete-batch'; results: StudyZipResult[]; anonymized: number; failed: number }
  | { type: 'error'; error: string }

// Reconstruct Map from serialized rules (structured clone preserves Map, but safeguard for JSON edge)
function reconstructConfig(raw: AnonymizationConfig): AnonymizationConfig {
  if (raw.rules instanceof Map) return raw
  const rules = new Map<string, any>()
  const rulesAny = raw.rules as unknown as Record<string, any> | Array<[string, any]>
  if (Array.isArray(rulesAny)) {
    for (const [k, v] of rulesAny) rules.set(k, v)
  } else if (rulesAny && typeof rulesAny === 'object') {
    for (const [k, v] of Object.entries(rulesAny)) rules.set(k, v)
  }
  return { ...raw, rules }
}

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.type !== 'anonymize') return

  try {
    const config = reconstructConfig(msg.config)
    const remapper = new UIDRemapper({
      reproducible: config.reproducibleUIDs,
      salt: config.pseudonymSalt,
    })
    if (msg.uidRemap) remapper.import(msg.uidRemap)

    const zip = msg.batchMode ? null : new JSZip()
    const studyBuckets = msg.batchMode
      ? new Map<string, Array<{ zipPath: string; data: Uint8Array }>>()
      : null
    const studyFailed = msg.batchMode ? new Map<string, number>() : null
    const total = msg.files.length
    let processed = 0
    let failed = 0

    // Pass 1: collect all UIDs + pseudonym inputs + patient IDs
    const pseudonymKeys = new Set<string>()          // tag|value
    const pseudonymInputs: Array<{ tag: string; value: string }> = []
    const patientIDs = new Set<string>()
    for (const f of msg.files) {
      try {
        const ds = dicomParser.parseDicom(new Uint8Array(f.buffer))
        const uids = collectUIDs(ds)
        for (const uid of uids.studyUIDs) remapper.remap(uid)
        for (const uid of uids.seriesUIDs) remapper.remap(uid)
        for (const uid of uids.sopUIDs) remapper.remap(uid)
        for (const uid of uids.frameOfReferenceUIDs) remapper.remap(uid)

        for (const input of collectPseudonymInputs(ds, config)) {
          const k = `${input.tag}|${input.value}`
          if (!pseudonymKeys.has(k)) {
            pseudonymKeys.add(k)
            pseudonymInputs.push(input)
          }
        }

        const pid = collectPatientIDs(ds)
        if (pid) patientIDs.add(pid)
      } catch {
        // skipped; will fail in pass 2 if truly broken
      }
    }

    // Pass 1.5: compute pseudonyms (SHA-256 is async)
    const pseudonyms = new Map<string, string>()
    if (pseudonymInputs.length > 0) {
      const results = await Promise.all(
        pseudonymInputs.map(i => pseudonymize(i.value, config.pseudonymSalt || '')),
      )
      for (let i = 0; i < pseudonymInputs.length; i++) {
        const { tag, value } = pseudonymInputs[i]
        pseudonyms.set(`${tag}|${value}`, results[i])
      }
    }

    // Pass 1.6: compute per-patient date offsets
    const perPatientDateOffsets = new Map<string, number>()
    if (config.dateShiftPerPatient) {
      const patientIDsArr = Array.from(patientIDs)
      const pseudoForPIDs = await Promise.all(
        patientIDsArr.map(pid => pseudonymize(pid, (config.pseudonymSalt || '') + '|date')),
      )
      for (let i = 0; i < patientIDsArr.length; i++) {
        const hex = pseudoForPIDs[i]
        const raw = parseInt(hex.slice(0, 8), 16)
        const offset = (raw % 730) - 365 // ±365 days
        perPatientDateOffsets.set(patientIDsArr[i], offset)
      }
    }

    // Pass 1.7: assign patient sequence numbers (insertion order)
    const patientNumbers = new Map<string, number>()
    let n = 0
    for (const pid of patientIDs) {
      patientNumbers.set(pid, ++n)
    }

    // Pass 2: anonymize + serialize + add to zip
    const summary: AnonymizationSummary = { filesProcessed: 0, tagActionCounts: {}, sampleChanges: [] }
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let sampleFileIndex = 0

    for (const f of msg.files) {
      const response: WorkerResponse = {
        type: 'progress',
        processed,
        total,
        currentFile: f.name,
      }
      ;(self as unknown as Worker).postMessage(response)

      try {
        const byteArray = new Uint8Array(f.buffer)
        const ds = dicomParser.parseDicom(byteArray)
        const { diff, newSOPInstanceUID } = anonymizeDataSet(ds, config, remapper, {
          pseudonyms,
          perPatientDateOffsets,
          patientNumbers,
        })

        // Accumulate summary stats
        const isFirstFile = sampleFileIndex === 0
        for (const [tag, entry] of diff) {
          const rule = config.rules.get(tag)
          const action: TagAction = rule?.action ?? (entry.kind === 'delete' ? 'X' : 'Z')
          summary.tagActionCounts[action] = (summary.tagActionCounts[action] ?? 0) + 1

          if (isFirstFile && summary.sampleChanges.length < 10 && entry.kind !== 'delete') {
            const parserKey = 'x' + tag.toLowerCase()
            const original = ds.string(parserKey) ?? ''
            const anonymized = decoder.decode(entry.value).replace(/\0/g, '').trim()
            if (original !== anonymized) {
              summary.sampleChanges.push({
                tag,
                keyword: lookupTag(tag).keyword,
                action,
                original: original.length > 40 ? original.slice(0, 40) + '…' : original,
                anonymized: anonymized.length > 40 ? anonymized.slice(0, 40) + '…' : anonymized,
              })
            }
          }
        }
        if (isFirstFile) sampleFileIndex++
        summary.filesProcessed++

        const output = serializeDicom({ dataSet: ds, diff, newSOPInstanceUID: newSOPInstanceUID ?? undefined })
        const outName = renameIfNeeded(f.name, newSOPInstanceUID ?? undefined)
        const pathPrefix = f.path ? f.path.replace(/\/+$/, '') + '/' : ''
        if (studyBuckets) {
          const studyKey = f.path?.split('/')[0] ?? 'unknown'
          let bucket = studyBuckets.get(studyKey)
          if (!bucket) { bucket = []; studyBuckets.set(studyKey, bucket) }
          bucket.push({ zipPath: pathPrefix + outName, data: output })
        } else {
          zip!.file(pathPrefix + outName, output, { binary: true })
        }
      } catch (err) {
        console.warn('anonymize failed for', f.name, err)
        failed += 1
        if (studyFailed) {
          const studyKey = f.path?.split('/')[0] ?? 'unknown'
          studyFailed.set(studyKey, (studyFailed.get(studyKey) ?? 0) + 1)
        }
      }
      processed += 1
    }

    if (studyBuckets) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const results: StudyZipResult[] = []
      for (const [studyKey, files] of studyBuckets) {
        const studyZip = new JSZip()
        for (const { zipPath, data } of files) studyZip.file(zipPath, data, { binary: true })
        const buf = await studyZip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        const studyFailedCount = studyFailed?.get(studyKey) ?? 0
        results.push({ studyKey, filename: `${studyKey}-${dateStr}.zip`, zipBuffer: buf, anonymized: files.length, failed: studyFailedCount })
      }
      const batchResponse: WorkerResponse = { type: 'complete-batch', results, anonymized: processed - failed, failed }
      ;(self as unknown as Worker).postMessage(batchResponse, results.map(r => r.zipBuffer))
      return
    }

    const zipBuffer = await zip!.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    const response: WorkerResponse = {
      type: 'complete',
      zipBuffer,
      anonymized: processed - failed,
      failed,
      summary,
    }
    ;(self as unknown as Worker).postMessage(response, [zipBuffer])
  } catch (err) {
    const response: WorkerResponse = {
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as unknown as Worker).postMessage(response)
  }
})

function renameIfNeeded(original: string, newSOPUID?: string): string {
  if (!newSOPUID) return original
  // Preserve folder-like names but replace the base filename when it looked like a UID
  const base = original.split('/').pop() ?? original
  if (/^[0-9.]+(\.dcm)?$/.test(base)) {
    return newSOPUID + '.dcm'
  }
  return base.toLowerCase().endsWith('.dcm') ? base : base + '.dcm'
}
