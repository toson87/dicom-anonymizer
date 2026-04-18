import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function downloadBlob(data: ArrayBuffer | Blob, filename: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/zip' })
  saveAs(blob, filename)
}

export function defaultExportFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `dicom-anonymized-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.zip`
}

// Re-export JSZip for workers that need it alongside
export { JSZip }
