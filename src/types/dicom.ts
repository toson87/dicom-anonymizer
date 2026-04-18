import type { DataSet } from '../lib/dicom/parser'

export interface DicomFile {
  file: File
  dataSet: DataSet
  rawBuffer: ArrayBuffer
  sopInstanceUID: string
  seriesInstanceUID: string
  studyInstanceUID: string
  instanceNumber: number
  rows: number
  columns: number
  bitsAllocated: number
  bitsStored: number
  highBit: number
  pixelRepresentation: number
  transferSyntaxUID: string
  windowCenter: number | null
  windowWidth: number | null
  rescaleSlope: number
  rescaleIntercept: number
  photometricInterpretation: string
  thumbnailDataURL: string | null
}

export interface DicomSeries {
  seriesInstanceUID: string
  seriesNumber: number
  seriesDescription: string
  modality: string
  instances: DicomFile[]
}

export interface DicomStudy {
  studyInstanceUID: string
  studyDate: string
  studyDescription: string
  patientName: string
  patientID: string
  series: Map<string, DicomSeries>
}

export interface WorkspaceState {
  studies: Map<string, DicomStudy>
  selectedStudyUID: string | null
  selectedSeriesUID: string | null
  activeInstanceIndex: number
}
