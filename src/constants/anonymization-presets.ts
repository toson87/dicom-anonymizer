import type { AgeBin, AnonymizationConfig, AnonymizationPreset, TagRule } from '../types/anonymization'
import { PHI_TAGS } from './phi-tags'

function buildRulesFromPHI(overrides: Partial<Record<string, Partial<TagRule>>> = {}): Map<string, TagRule> {
  const rules = new Map<string, TagRule>()
  for (const def of PHI_TAGS) {
    const override = overrides[def.tag] ?? {}
    rules.set(def.tag, {
      tag: def.tag,
      action: override.action ?? def.defaultAction,
      dummyValue: override.dummyValue,
      enabled: override.enabled ?? true,
    })
  }
  return rules
}

export interface PresetOptions {
  dateShiftDays?: number
  pseudonymSalt?: string
}

const COMMON_DEFAULTS = {
  dateShiftPerPatient: false,
  ageBin: { unit: 'off', step: 1 } as AgeBin,
  patientNameDummy: 'ANON^PATIENT',
  patientIDDummy: 'ANON001',
  reproducibleUIDs: false,
  patientNameMode: 'dummy' as const,
  patientNameTemplate: 'ANON^{n}',
}

export function buildPreset(preset: AnonymizationPreset, opts: PresetOptions = {}): AnonymizationConfig {
  const dateShiftDays = opts.dateShiftDays ?? 0
  const pseudonymSalt = opts.pseudonymSalt ?? ''
  switch (preset) {
    case 'minimal':
      return {
        preset,
        removePrivateTags: false,
        retainUIDs: true,
        dateShiftDays: 0,
        dateShiftPerPatient: COMMON_DEFAULTS.dateShiftPerPatient,
        pseudonymSalt,
        ageBin: COMMON_DEFAULTS.ageBin,
        patientNameDummy: COMMON_DEFAULTS.patientNameDummy,
        patientIDDummy: COMMON_DEFAULTS.patientIDDummy,
        reproducibleUIDs: COMMON_DEFAULTS.reproducibleUIDs,
        patientNameMode: COMMON_DEFAULTS.patientNameMode,
        patientNameTemplate: COMMON_DEFAULTS.patientNameTemplate,
        rules: buildRulesFromPHI({
          '00100010': { action: 'D' },
          '00100020': { action: 'D' },
          '00100030': { action: 'K' },
          '00100040': { action: 'K' },
          '00101010': { action: 'K' },
          '00101020': { action: 'K' },
          '00101030': { action: 'K' },
          '00102160': { action: 'K' },
          '00080020': { action: 'K' },
          '00080021': { action: 'K' },
          '00080022': { action: 'K' },
          '00080023': { action: 'K' },
          '00080030': { action: 'K' },
          '00080031': { action: 'K' },
          '00080032': { action: 'K' },
          '00080033': { action: 'K' },
          '00081030': { action: 'K' },
          '0008103E': { action: 'K' },
          '00181030': { action: 'K' },
          '00200010': { action: 'K' },
          '0020000D': { action: 'K' },
          '0020000E': { action: 'K' },
          '00080018': { action: 'K' },
          '00200052': { action: 'K' },
          '00200200': { action: 'K' },
        }),
      }

    case 'standard':
      return {
        preset,
        removePrivateTags: true,
        retainUIDs: false,
        dateShiftDays: 0,
        dateShiftPerPatient: COMMON_DEFAULTS.dateShiftPerPatient,
        pseudonymSalt,
        ageBin: COMMON_DEFAULTS.ageBin,
        patientNameDummy: COMMON_DEFAULTS.patientNameDummy,
        patientIDDummy: COMMON_DEFAULTS.patientIDDummy,
        reproducibleUIDs: COMMON_DEFAULTS.reproducibleUIDs,
        patientNameMode: COMMON_DEFAULTS.patientNameMode,
        patientNameTemplate: COMMON_DEFAULTS.patientNameTemplate,
        rules: buildRulesFromPHI(),
      }

    case 'ml':
      return {
        preset,
        removePrivateTags: true,
        retainUIDs: false,
        dateShiftDays,
        dateShiftPerPatient: COMMON_DEFAULTS.dateShiftPerPatient,
        pseudonymSalt,
        ageBin: COMMON_DEFAULTS.ageBin,
        patientNameDummy: COMMON_DEFAULTS.patientNameDummy,
        patientIDDummy: COMMON_DEFAULTS.patientIDDummy,
        reproducibleUIDs: COMMON_DEFAULTS.reproducibleUIDs,
        patientNameMode: COMMON_DEFAULTS.patientNameMode,
        patientNameTemplate: COMMON_DEFAULTS.patientNameTemplate,
        rules: buildRulesFromPHI({
          // Keep demographic/clinical utility tags
          '00100040': { action: 'K' },  // PatientSex
          '00101010': { action: 'K' },  // PatientAge
          '00101020': { action: 'K' },  // PatientSize
          '00101030': { action: 'K' },  // PatientWeight
          '00102160': { action: 'K' },  // EthnicGroup
          // Shift dates instead of removing
          '00080020': { action: 'S' },  // StudyDate
          '00080021': { action: 'S' },  // SeriesDate
          '00080022': { action: 'S' },  // AcquisitionDate
          '00080023': { action: 'S' },  // ContentDate
          '00080030': { action: 'X' },  // StudyTime (remove exact times)
          '00080031': { action: 'X' },
          '00080032': { action: 'X' },
          '00080033': { action: 'X' },
          // Keep series/study description for ML labeling
          '00081030': { action: 'K' },
          '0008103E': { action: 'K' },
          '00181030': { action: 'K' },
        }),
      }

    case 'public':
      return {
        preset,
        removePrivateTags: true,
        retainUIDs: false,
        dateShiftDays: 0,
        dateShiftPerPatient: COMMON_DEFAULTS.dateShiftPerPatient,
        pseudonymSalt,
        ageBin: COMMON_DEFAULTS.ageBin,
        patientNameDummy: COMMON_DEFAULTS.patientNameDummy,
        patientIDDummy: COMMON_DEFAULTS.patientIDDummy,
        reproducibleUIDs: COMMON_DEFAULTS.reproducibleUIDs,
        patientNameMode: COMMON_DEFAULTS.patientNameMode,
        patientNameTemplate: COMMON_DEFAULTS.patientNameTemplate,
        rules: (() => {
          const rules = buildRulesFromPHI()
          const extra = ['00081030', '0008103E', '00181030', '00400254', '00321060', '00400007']
          for (const tag of extra) {
            const existing = rules.get(tag)
            if (existing) rules.set(tag, { ...existing, action: 'X' })
          }
          return rules
        })(),
      }

    case 'custom':
      return { ...buildPreset('standard', opts), preset: 'custom' }
  }
}

export const PRESET_LABELS: Record<AnonymizationPreset, string> = {
  minimal: 'Minimal',
  standard: 'Standard (PS 3.15)',
  ml: 'ML / Research',
  public: 'Public Release',
  custom: 'Custom',
}

export const PRESET_DESCRIPTIONS: Record<AnonymizationPreset, string> = {
  minimal: 'Names and IDs replaced. Dates, UIDs, and descriptions kept. For internal sharing.',
  standard: 'Full DICOM PS 3.15 Annex E profile. All PHI removed, UIDs remapped, private tags removed.',
  ml: 'Optimised for training datasets. Retains sex, age, weight, acquisition parameters. Dates shifted by a random offset to preserve temporal relationships.',
  public: 'Maximum anonymization for public release. Removes all descriptions, protocol names, and dates in addition to PS 3.15.',
  custom: 'Start from Standard and customise individual tag actions.',
}
