import { useCallback, useMemo, useState } from 'react'
import type {
  AgeBin,
  AnonymizationConfig,
  AnonymizationPreset,
  PatientNameMode,
  TagAction,
  TagRule,
} from '../types/anonymization'
import { buildPreset } from '../constants/anonymization-presets'

function randomDateShiftDays(): number {
  const sign = Math.random() < 0.5 ? -1 : 1
  const magnitude = 30 + Math.floor(Math.random() * 336)
  return sign * magnitude
}

function randomSalt(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function useAnonymizationConfig() {
  const [initialDateShiftDays] = useState<number>(() => randomDateShiftDays())
  const [initialSalt] = useState<string>(() => randomSalt())
  const [config, setConfig] = useState<AnonymizationConfig>(() =>
    buildPreset('standard', { dateShiftDays: initialDateShiftDays, pseudonymSalt: initialSalt }),
  )

  const selectPreset = useCallback(
    (preset: AnonymizationPreset) => {
      setConfig(prev =>
        buildPreset(preset, {
          dateShiftDays: prev.dateShiftDays || initialDateShiftDays,
          pseudonymSalt: prev.pseudonymSalt || initialSalt,
        }),
      )
    },
    [initialDateShiftDays, initialSalt],
  )

  const updateRule = useCallback((tag: string, patch: Partial<TagRule>) => {
    setConfig(prev => {
      const rules = new Map(prev.rules)
      const existing = rules.get(tag) ?? { tag, action: 'K' as TagAction, enabled: true }
      rules.set(tag, { ...existing, ...patch })
      return { ...prev, preset: 'custom', rules }
    })
  }, [])

  const setRemovePrivateTags = useCallback((value: boolean) => {
    setConfig(prev => ({ ...prev, removePrivateTags: value, preset: 'custom' }))
  }, [])

  const setDateShiftDays = useCallback((days: number) => {
    setConfig(prev => ({ ...prev, dateShiftDays: days, preset: 'custom' }))
  }, [])

  const setDateShiftPerPatient = useCallback((v: boolean) => {
    setConfig(prev => ({ ...prev, dateShiftPerPatient: v, preset: 'custom' }))
  }, [])

  const randomizeDateShift = useCallback(() => {
    setConfig(prev => ({ ...prev, dateShiftDays: randomDateShiftDays(), preset: 'custom' }))
  }, [])

  const setPseudonymSalt = useCallback((salt: string) => {
    setConfig(prev => ({ ...prev, pseudonymSalt: salt, preset: 'custom' }))
  }, [])

  const setAgeBin = useCallback((bin: AgeBin) => {
    setConfig(prev => ({ ...prev, ageBin: bin, preset: 'custom' }))
  }, [])

  const setReproducibleUIDs = useCallback((v: boolean) => {
    setConfig(prev => ({ ...prev, reproducibleUIDs: v, preset: 'custom' }))
  }, [])

  const setPatientNameMode = useCallback((mode: PatientNameMode) => {
    setConfig(prev => ({ ...prev, patientNameMode: mode, preset: 'custom' }))
  }, [])

  const setPatientNameTemplate = useCallback((tpl: string) => {
    setConfig(prev => ({ ...prev, patientNameTemplate: tpl, preset: 'custom' }))
  }, [])

  const affectedTagCount = useMemo(() => {
    let c = 0
    for (const rule of config.rules.values()) {
      if (rule.enabled && rule.action !== 'K') c += 1
    }
    return c
  }, [config.rules])

  return {
    config,
    selectPreset,
    updateRule,
    setRemovePrivateTags,
    setDateShiftDays,
    setDateShiftPerPatient,
    randomizeDateShift,
    setPseudonymSalt,
    setAgeBin,
    setReproducibleUIDs,
    setPatientNameMode,
    setPatientNameTemplate,
    affectedTagCount,
  }
}
