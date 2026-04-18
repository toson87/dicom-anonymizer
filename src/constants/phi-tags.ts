import type { TagAction } from '../types/anonymization'

export type PHICategory = 'identity' | 'date' | 'uid' | 'institution' | 'device' | 'description'

export interface PHITagDefinition {
  tag: string
  keyword: string
  vr: string
  defaultAction: TagAction
  category: PHICategory
  ps315Profile: boolean
}

export const PHI_TAGS: PHITagDefinition[] = [
  // Patient identity
  { tag: '00100010', keyword: 'PatientName',               vr: 'PN', defaultAction: 'Z', category: 'identity',     ps315Profile: true },
  { tag: '00100020', keyword: 'PatientID',                 vr: 'LO', defaultAction: 'Z', category: 'identity',     ps315Profile: true },
  { tag: '00100021', keyword: 'IssuerOfPatientID',         vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00100030', keyword: 'PatientBirthDate',          vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00100032', keyword: 'PatientBirthTime',          vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00100040', keyword: 'PatientSex',                vr: 'CS', defaultAction: 'K', category: 'identity',     ps315Profile: true },
  { tag: '00101000', keyword: 'OtherPatientIDs',           vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00101001', keyword: 'OtherPatientNames',         vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00101005', keyword: 'PatientBirthName',          vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00101010', keyword: 'PatientAge',                vr: 'AS', defaultAction: 'K', category: 'identity',     ps315Profile: true },
  { tag: '00101020', keyword: 'PatientSize',               vr: 'DS', defaultAction: 'K', category: 'identity',     ps315Profile: true },
  { tag: '00101030', keyword: 'PatientWeight',             vr: 'DS', defaultAction: 'K', category: 'identity',     ps315Profile: true },
  { tag: '00101040', keyword: 'PatientAddress',            vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00101060', keyword: 'PatientMotherBirthName',    vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00102154', keyword: 'PatientTelephoneNumbers',   vr: 'SH', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00102160', keyword: 'EthnicGroup',               vr: 'SH', defaultAction: 'K', category: 'identity',     ps315Profile: true },
  { tag: '00104000', keyword: 'PatientComments',           vr: 'LT', defaultAction: 'X', category: 'description',  ps315Profile: true },
  // Study dates
  { tag: '00080020', keyword: 'StudyDate',                 vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080021', keyword: 'SeriesDate',                vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080022', keyword: 'AcquisitionDate',           vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080023', keyword: 'ContentDate',               vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080025', keyword: 'CurveDate',                 vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: false },
  { tag: '00080030', keyword: 'StudyTime',                 vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080031', keyword: 'SeriesTime',                vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080032', keyword: 'AcquisitionTime',           vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080033', keyword: 'ContentTime',               vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080201', keyword: 'TimezoneOffsetFromUTC',     vr: 'SH', defaultAction: 'X', category: 'date',         ps315Profile: true },
  // Study identifiers
  { tag: '00080050', keyword: 'AccessionNumber',           vr: 'SH', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00200010', keyword: 'StudyID',                   vr: 'SH', defaultAction: 'Z', category: 'identity',     ps315Profile: true },
  // UIDs
  { tag: '00080014', keyword: 'InstanceCreatorUID',        vr: 'UI', defaultAction: 'U', category: 'uid',          ps315Profile: true },
  { tag: '00080018', keyword: 'SOPInstanceUID',            vr: 'UI', defaultAction: 'U', category: 'uid',          ps315Profile: true },
  { tag: '0020000D', keyword: 'StudyInstanceUID',          vr: 'UI', defaultAction: 'U', category: 'uid',          ps315Profile: true },
  { tag: '0020000E', keyword: 'SeriesInstanceUID',         vr: 'UI', defaultAction: 'U', category: 'uid',          ps315Profile: true },
  { tag: '00200052', keyword: 'FrameOfReferenceUID',       vr: 'UI', defaultAction: 'U', category: 'uid',          ps315Profile: true },
  { tag: '00200200', keyword: 'SynchronizationFrameOfReferenceUID', vr: 'UI', defaultAction: 'U', category: 'uid', ps315Profile: true },
  // Institution
  { tag: '00080080', keyword: 'InstitutionName',           vr: 'LO', defaultAction: 'X', category: 'institution',  ps315Profile: true },
  { tag: '00080081', keyword: 'InstitutionAddress',        vr: 'ST', defaultAction: 'X', category: 'institution',  ps315Profile: true },
  { tag: '00080082', keyword: 'InstitutionCodeSequence',   vr: 'SQ', defaultAction: 'X', category: 'institution',  ps315Profile: true },
  { tag: '00081040', keyword: 'InstitutionalDepartmentName', vr: 'LO', defaultAction: 'X', category: 'institution', ps315Profile: true },
  // Physicians / personnel
  { tag: '00080090', keyword: 'ReferringPhysicianName',    vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00080092', keyword: 'ReferringPhysicianAddress', vr: 'ST', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00080094', keyword: 'ReferringPhysicianTelephoneNumbers', vr: 'SH', defaultAction: 'X', category: 'identity', ps315Profile: true },
  { tag: '00081048', keyword: 'PhysiciansOfRecord',        vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00081050', keyword: 'PerformingPhysicianName',   vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00081070', keyword: 'OperatorsName',             vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  // Descriptions
  { tag: '00081030', keyword: 'StudyDescription',          vr: 'LO', defaultAction: 'X', category: 'description',  ps315Profile: true },
  { tag: '0008103E', keyword: 'SeriesDescription',         vr: 'LO', defaultAction: 'X', category: 'description',  ps315Profile: true },
  { tag: '00181030', keyword: 'ProtocolName',              vr: 'LO', defaultAction: 'X', category: 'description',  ps315Profile: true },
  { tag: '00400254', keyword: 'PerformedProcedureStepDescription', vr: 'LO', defaultAction: 'X', category: 'description', ps315Profile: true },
  { tag: '00401400', keyword: 'RequestedProcedureComments', vr: 'LT', defaultAction: 'X', category: 'description', ps315Profile: true },
  { tag: '00400280', keyword: 'CommentsOnThePerformedProcedureStep', vr: 'ST', defaultAction: 'X', category: 'description', ps315Profile: true },
  { tag: '00700084', keyword: 'ContentCreatorName',        vr: 'PN', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  // Device
  { tag: '00181000', keyword: 'DeviceSerialNumber',        vr: 'LO', defaultAction: 'X', category: 'device',       ps315Profile: true },
  { tag: '00181002', keyword: 'DeviceUID',                 vr: 'UI', defaultAction: 'U', category: 'device',       ps315Profile: true },
  { tag: '00181010', keyword: 'SecondaryCaptureDeviceID',  vr: 'LO', defaultAction: 'X', category: 'device',       ps315Profile: true },
  { tag: '00181030', keyword: 'ProtocolName',              vr: 'LO', defaultAction: 'X', category: 'description',  ps315Profile: true },
  { tag: '00400009', keyword: 'ScheduledProcedureStepID', vr: 'SH', defaultAction: 'X', category: 'identity',      ps315Profile: true },
  { tag: '00400244', keyword: 'PerformedProcedureStepStartDate', vr: 'DA', defaultAction: 'X', category: 'date',   ps315Profile: true },
  { tag: '00400245', keyword: 'PerformedProcedureStepStartTime', vr: 'TM', defaultAction: 'X', category: 'date',   ps315Profile: true },
  { tag: '00401004', keyword: 'PatientTransportArrangements', vr: 'LO', defaultAction: 'X', category: 'identity',  ps315Profile: true },
  { tag: '00321000', keyword: 'ScheduledStudyStartDate',   vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00321001', keyword: 'ScheduledStudyStartTime',   vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00321060', keyword: 'RequestedProcedureDescription', vr: 'LO', defaultAction: 'X', category: 'description', ps315Profile: true },
  { tag: '00400007', keyword: 'ScheduledProcedureStepDescription', vr: 'LO', defaultAction: 'X', category: 'description', ps315Profile: true },
  { tag: '00080012', keyword: 'InstanceCreationDate',      vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00080013', keyword: 'InstanceCreationTime',      vr: 'TM', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00404034', keyword: 'ScheduledHumanPerformersSequence', vr: 'SQ', defaultAction: 'X', category: 'identity', ps315Profile: true },
  { tag: '00102000', keyword: 'MedicalAlerts',             vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00102110', keyword: 'Allergies',                 vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00380010', keyword: 'AdmissionID',               vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00380020', keyword: 'AdmittingDate',             vr: 'DA', defaultAction: 'X', category: 'date',         ps315Profile: true },
  { tag: '00380300', keyword: 'CurrentPatientLocation',    vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00380500', keyword: 'PatientState',              vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
  { tag: '00101090', keyword: 'MedicalRecordLocator',      vr: 'LO', defaultAction: 'X', category: 'identity',     ps315Profile: true },
]

export const PHI_TAG_MAP = new Map(PHI_TAGS.map(t => [t.tag, t]))
export const PHI_TAG_SET = new Set(PHI_TAGS.map(t => t.tag))
