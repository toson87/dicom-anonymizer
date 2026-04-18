import type { AgeBin, AnonymizationConfig } from '../../types/anonymization'
import type { DataSet } from './parser'
import type { ElementDiff } from './serializer'
import { makeEmptyValue, makeStringValue } from './serializer'
import { lookupTag } from './tag-dictionary'
import { formatMask } from './pseudonym'
import { UIDRemapper } from './uid-generator'
import { generateFakeName } from './name-generator'

export interface AnonymizeResult {
  diff: ElementDiff
  newSOPInstanceUID: string | null
}

export interface AnonymizeContext {
  /** Pre-computed pseudonym lookup keyed by `${tag}|${originalValue}` */
  pseudonyms?: Map<string, string>
  /** Pre-computed per-patient date offsets keyed by PatientID */
  perPatientDateOffsets?: Map<string, number>
  /** Patient sequence numbers keyed by PatientID (first-seen order) */
  patientNumbers?: Map<string, number>
}

function isPrivateTag(tag: string): boolean {
  const group = parseInt(tag.slice(0, 4), 16)
  return (group & 1) === 1 && group !== 0x0001 && group !== 0xffff
}

export function shiftDateString(raw: string, days: number): string {
  if (raw.length < 8) return raw
  const y = parseInt(raw.slice(0, 4), 10)
  const m = parseInt(raw.slice(4, 6), 10)
  const d = parseInt(raw.slice(6, 8), 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return raw
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function binAgeString(raw: string, bin: AgeBin): string {
  if (bin.unit === 'off') return raw
  // DICOM AS format: nnn[DWMY] e.g. "047Y"
  const m = /^(\d{1,3})([DWMY])$/i.exec(raw.trim())
  if (!m) return raw
  const n = parseInt(m[1], 10)
  if (isNaN(n)) return raw
  const origUnit = m[2].toUpperCase()

  if (bin.unit === 'Y') {
    let years: number
    if (origUnit === 'Y') years = n
    else if (origUnit === 'M') years = n / 12
    else if (origUnit === 'W') years = n / 52
    else years = n / 365
    const binned = Math.round(years / bin.step) * bin.step
    return `${String(binned).padStart(3, '0')}Y`
  } else {
    // bin.unit === 'M'
    let months: number
    if (origUnit === 'Y') months = n * 12
    else if (origUnit === 'M') months = n
    else if (origUnit === 'W') months = n / 4.33
    else months = n / 30.44
    const binned = Math.round(months / bin.step) * bin.step
    if (binned >= 24) return `${String(Math.round(binned / 12)).padStart(3, '0')}Y`
    return `${String(binned).padStart(3, '0')}M`
  }
}

function resolvePatientName(
  config: AnonymizationConfig,
  ctx: AnonymizeContext,
  patientID: string,
  originalValue: string,
): string {
  switch (config.patientNameMode) {
    case 'fake':
      return generateFakeName(originalValue, config.pseudonymSalt)
    case 'template': {
      const n = ctx.patientNumbers?.get(patientID) ?? 1
      return config.patientNameTemplate.replace('{n}', String(n))
    }
    default:
      return config.patientNameDummy
  }
}

export function anonymizeDataSet(
  dataSet: DataSet,
  config: AnonymizationConfig,
  uidRemapper: UIDRemapper,
  ctx: AnonymizeContext = {},
): AnonymizeResult {
  const diff: ElementDiff = new Map()
  let newSOPInstanceUID: string | null = null

  // Resolve the effective date shift for this file
  const patientID = dataSet.string('x00100020')?.trim() ?? ''
  const effectiveDateShift = (() => {
    if (!config.dateShiftPerPatient) return config.dateShiftDays
    const perPatient = ctx.perPatientDateOffsets?.get(patientID)
    return perPatient ?? config.dateShiftDays
  })()

  for (const parserKey of Object.keys(dataSet.elements)) {
    const tag = parserKey.slice(1).toUpperCase()

    if (tag.startsWith('0002')) continue

    if (isPrivateTag(tag) && config.removePrivateTags) {
      diff.set(tag, { kind: 'delete' })
      continue
    }

    const rule = config.rules.get(tag)
    if (!rule || !rule.enabled) {
      // Age binning applies even when no explicit rule changes the tag
      if (tag === '00101010' && config.ageBin.unit !== 'off') {
        const raw = dataSet.string(parserKey)
        if (raw) {
          const binned = binAgeString(raw.trim(), config.ageBin)
          diff.set(tag, { kind: 'write', vr: 'AS', value: makeStringValue(binned) })
        }
      }
      continue
    }

    const info = lookupTag(tag)
    const vr = dataSet.elements[parserKey].vr ?? info.vr

    switch (rule.action) {
      case 'K': {
        // Age binning override when user kept PatientAge
        if (tag === '00101010' && config.ageBin.unit !== 'off') {
          const raw = dataSet.string(parserKey)
          if (raw) {
            const binned = binAgeString(raw.trim(), config.ageBin)
            diff.set(tag, { kind: 'write', vr: 'AS', value: makeStringValue(binned) })
          }
        }
        break
      }

      case 'X':
        diff.set(tag, { kind: 'delete' })
        break

      case 'Z':
        diff.set(tag, { kind: 'write', vr, value: makeEmptyValue() })
        break

      case 'D': {
        let dummy = rule.dummyValue
        if (!dummy) {
          if (tag === '00100010') {
            dummy = resolvePatientName(config, ctx, patientID, dataSet.string(parserKey) ?? '')
          } else if (tag === '00100020') {
            dummy = config.patientIDDummy
          } else {
            dummy = 'ANONYMIZED'
          }
        }
        diff.set(tag, { kind: 'write', vr, value: makeStringValue(dummy) })
        break
      }

      case 'U': {
        if (config.retainUIDs) break
        const original = dataSet.string(parserKey)
        if (!original) break
        const remapped = uidRemapper.remap(original.trim())
        diff.set(tag, { kind: 'write', vr: 'UI', value: makeStringValue(remapped) })
        if (tag === '00080018') newSOPInstanceUID = remapped
        break
      }

      case 'S': {
        if (effectiveDateShift === 0) break
        const original = dataSet.string(parserKey)
        if (!original) break
        if (vr === 'DA') {
          const shifted = shiftDateString(original.trim(), effectiveDateShift)
          diff.set(tag, { kind: 'write', vr: 'DA', value: makeStringValue(shifted) })
        }
        break
      }

      case 'M': {
        const original = dataSet.string(parserKey)
        if (!original) break
        const masked = formatMask(original)
        diff.set(tag, { kind: 'write', vr, value: makeStringValue(masked) })
        break
      }

      case 'P': {
        const original = dataSet.string(parserKey)
        if (!original) break
        const key = `${tag}|${original.trim()}`
        const pseudo = ctx.pseudonyms?.get(key)
        if (!pseudo) break
        diff.set(tag, { kind: 'write', vr, value: makeStringValue(pseudo) })
        if (tag === '00080018') newSOPInstanceUID = pseudo
        break
      }
    }
  }

  if (!newSOPInstanceUID) {
    const original = dataSet.string('x00080018')
    if (original) newSOPInstanceUID = original.trim()
  }

  return { diff, newSOPInstanceUID }
}

export interface UIDCollectResult {
  studyUIDs: Set<string>
  seriesUIDs: Set<string>
  sopUIDs: Set<string>
  frameOfReferenceUIDs: Set<string>
}

export function collectUIDs(dataSet: DataSet): UIDCollectResult {
  const result: UIDCollectResult = {
    studyUIDs: new Set(),
    seriesUIDs: new Set(),
    sopUIDs: new Set(),
    frameOfReferenceUIDs: new Set(),
  }
  const studyUID = dataSet.string('x0020000d')
  const seriesUID = dataSet.string('x0020000e')
  const sopUID = dataSet.string('x00080018')
  const forUID = dataSet.string('x00200052')
  if (studyUID) result.studyUIDs.add(studyUID.trim())
  if (seriesUID) result.seriesUIDs.add(seriesUID.trim())
  if (sopUID) result.sopUIDs.add(sopUID.trim())
  if (forUID) result.frameOfReferenceUIDs.add(forUID.trim())
  return result
}

/** Collect all (tag, original-value) pairs that need a pseudonym, across the entire dataset. */
export function collectPseudonymInputs(
  dataSet: DataSet,
  config: AnonymizationConfig,
): Array<{ tag: string; value: string }> {
  const out: Array<{ tag: string; value: string }> = []
  for (const parserKey of Object.keys(dataSet.elements)) {
    const tag = parserKey.slice(1).toUpperCase()
    const rule = config.rules.get(tag)
    if (!rule || !rule.enabled || rule.action !== 'P') continue
    const val = dataSet.string(parserKey)
    if (val) out.push({ tag, value: val.trim() })
  }
  return out
}

/** Collect unique PatientIDs for per-patient date offsets. */
export function collectPatientIDs(dataSet: DataSet): string | null {
  const pid = dataSet.string('x00100020')
  return pid ? pid.trim() : null
}
