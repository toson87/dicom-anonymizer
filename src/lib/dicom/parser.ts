import dicomParser from 'dicom-parser'
import type { DicomFile, DicomStudy, DicomSeries } from '../../types/dicom'
import { toParserTag } from './tag-dictionary'

export type DataSet = ReturnType<typeof dicomParser.parseDicom>

export class ParseError extends Error {}

export interface ParseOutcome {
  file: DicomFile | null
  error: Error | null
  fileName: string
}

export async function parseDicomFile(file: File): Promise<ParseOutcome> {
  try {
    const buffer = await file.arrayBuffer()
    const byteArray = new Uint8Array(buffer)
    const dataSet = dicomParser.parseDicom(byteArray)

    const sopInstanceUID = dataSet.string(toParserTag('00080018')) ?? ''
    const seriesInstanceUID = dataSet.string(toParserTag('0020000E')) ?? ''
    const studyInstanceUID = dataSet.string(toParserTag('0020000D')) ?? ''

    if (!sopInstanceUID || !seriesInstanceUID || !studyInstanceUID) {
      return { file: null, error: new ParseError('Missing required UIDs'), fileName: file.name }
    }

    const instanceNumber = parseInt(dataSet.string(toParserTag('00200013')) ?? '0', 10) || 0
    const rows = dataSet.uint16(toParserTag('00280010')) ?? 0
    const columns = dataSet.uint16(toParserTag('00280011')) ?? 0
    const bitsAllocated = dataSet.uint16(toParserTag('00280100')) ?? 8
    const bitsStored = dataSet.uint16(toParserTag('00280101')) ?? 8
    const highBit = dataSet.uint16(toParserTag('00280102')) ?? 7
    const pixelRepresentation = dataSet.uint16(toParserTag('00280103')) ?? 0
    const photometricInterpretation = (dataSet.string(toParserTag('00280004')) ?? 'MONOCHROME2').trim()

    const wcStr = dataSet.string(toParserTag('00281050'))
    const wwStr = dataSet.string(toParserTag('00281051'))
    const windowCenter = wcStr ? parseFloat(wcStr.split('\\')[0]) : null
    const windowWidth = wwStr ? parseFloat(wwStr.split('\\')[0]) : null

    const rsStr = dataSet.string(toParserTag('00281053'))
    const riStr = dataSet.string(toParserTag('00281052'))
    const rescaleSlope = rsStr ? parseFloat(rsStr) : 1
    const rescaleIntercept = riStr ? parseFloat(riStr) : 0

    const transferSyntaxUID = dataSet.string(toParserTag('00020010')) ?? '1.2.840.10008.1.2'

    const dicomFile: DicomFile = {
      file,
      dataSet,
      rawBuffer: buffer,
      sopInstanceUID,
      seriesInstanceUID,
      studyInstanceUID,
      instanceNumber,
      rows,
      columns,
      bitsAllocated,
      bitsStored,
      highBit,
      pixelRepresentation,
      transferSyntaxUID,
      windowCenter,
      windowWidth,
      rescaleSlope,
      rescaleIntercept,
      photometricInterpretation,
      thumbnailDataURL: null,
    }

    return { file: dicomFile, error: null, fileName: file.name }
  } catch (err) {
    return {
      file: null,
      error: err instanceof Error ? err : new Error(String(err)),
      fileName: file.name,
    }
  }
}

export function addFileToWorkspace(
  studies: Map<string, DicomStudy>,
  df: DicomFile,
): Map<string, DicomStudy> {
  const next = new Map(studies)
  let study = next.get(df.studyInstanceUID)
  if (!study) {
    const patientName = df.dataSet.string(toParserTag('00100010')) ?? '(no name)'
    const patientID = df.dataSet.string(toParserTag('00100020')) ?? ''
    const studyDate = df.dataSet.string(toParserTag('00080020')) ?? ''
    const studyDescription = df.dataSet.string(toParserTag('00081030')) ?? ''
    study = {
      studyInstanceUID: df.studyInstanceUID,
      studyDate,
      studyDescription,
      patientName,
      patientID,
      series: new Map(),
    }
    next.set(df.studyInstanceUID, study)
  }

  let series = study.series.get(df.seriesInstanceUID)
  if (!series) {
    const seriesNumber = parseInt(df.dataSet.string(toParserTag('00200011')) ?? '0', 10) || 0
    const seriesDescription = df.dataSet.string(toParserTag('0008103E')) ?? ''
    const modality = df.dataSet.string(toParserTag('00080060')) ?? ''
    series = {
      seriesInstanceUID: df.seriesInstanceUID,
      seriesNumber,
      seriesDescription,
      modality,
      instances: [],
    } as DicomSeries
    study.series.set(df.seriesInstanceUID, series)
  }

  if (!series.instances.some(i => i.sopInstanceUID === df.sopInstanceUID)) {
    series.instances.push(df)
    series.instances.sort((a, b) => a.instanceNumber - b.instanceNumber)
  }
  return next
}
