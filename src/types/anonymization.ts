export type TagAction = 'X' | 'Z' | 'D' | 'U' | 'K' | 'S' | 'M' | 'P'
// X=remove, Z=zero/empty, D=dummy value, U=remap UID, K=keep,
// S=date-shift, M=format-preserving mask, P=hash pseudonym

export interface TagRule {
  tag: string
  action: TagAction
  dummyValue?: string
  enabled: boolean
}

export type AnonymizationPreset = 'minimal' | 'standard' | 'ml' | 'public' | 'custom'

export type AgeBinUnit = 'off' | 'M' | 'Y'

export interface AgeBin {
  unit: AgeBinUnit
  step: number
}

export type PatientNameMode = 'dummy' | 'template' | 'fake'

export interface AnonymizationConfig {
  preset: AnonymizationPreset
  rules: Map<string, TagRule>
  removePrivateTags: boolean
  retainUIDs: boolean
  dateShiftDays: number
  dateShiftPerPatient: boolean
  pseudonymSalt: string
  ageBin: AgeBin
  patientNameDummy: string
  patientIDDummy: string
  reproducibleUIDs: boolean
  patientNameMode: PatientNameMode
  patientNameTemplate: string
}
