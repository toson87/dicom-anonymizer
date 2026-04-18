// Writes a DICOM Part 10 file from scratch (Explicit VR Little Endian output).
// dicom-parser is read-only; we read element offsets/lengths from the input
// DataSet, merge an anonymization diff, and emit valid binary.

import type { DataSet } from './parser'
import { lookupTag } from './tag-dictionary'

export type ElementDiffEntry =
  | { kind: 'delete' }
  | { kind: 'write'; vr: string; value: Uint8Array }

export type ElementDiff = Map<string, ElementDiffEntry>

// VRs that use the long 32-bit length encoding in Explicit VR LE
const LONG_VRS = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT'])

const TRANSFER_SYNTAX_EXPLICIT_VR_LE = '1.2.840.10008.1.2.1'
const IMPLEMENTATION_CLASS_UID = '1.2.826.0.1.3680043.9.7429.1'
const IMPLEMENTATION_VERSION_NAME = 'DICOM-ANON-1.0'

class Writer {
  private chunks: Uint8Array[] = []
  private _length = 0

  bytes(arr: Uint8Array): void {
    this.chunks.push(arr)
    this._length += arr.byteLength
  }

  uint16LE(v: number): void {
    const b = new Uint8Array(2)
    new DataView(b.buffer).setUint16(0, v, true)
    this.bytes(b)
  }

  uint32LE(v: number): void {
    const b = new Uint8Array(4)
    new DataView(b.buffer).setUint32(0, v, true)
    this.bytes(b)
  }

  ascii(s: string): void {
    const out = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
    this.bytes(out)
  }

  get length(): number {
    return this._length
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this._length)
    let offset = 0
    for (const chunk of this.chunks) {
      out.set(chunk, offset)
      offset += chunk.byteLength
    }
    return out
  }
}

function padValue(vr: string, value: Uint8Array): Uint8Array {
  if (value.byteLength % 2 === 0) return value
  const padded = new Uint8Array(value.byteLength + 1)
  padded.set(value, 0)
  // UI and binary VRs pad with null; string VRs pad with space
  const nullPad = vr === 'UI' || LONG_VRS.has(vr)
  padded[value.byteLength] = nullPad ? 0x00 : 0x20
  return padded
}

function writeElement(w: Writer, tag: string, vr: string, value: Uint8Array): void {
  const group = parseInt(tag.slice(0, 4), 16)
  const element = parseInt(tag.slice(4, 8), 16)
  const padded = padValue(vr, value)
  w.uint16LE(group)
  w.uint16LE(element)
  // VR as 2 ASCII bytes
  w.ascii(vr.length === 2 ? vr : 'UN')
  if (LONG_VRS.has(vr)) {
    w.uint16LE(0)                 // 2 reserved bytes
    w.uint32LE(padded.byteLength) // 4-byte length
  } else {
    w.uint16LE(padded.byteLength) // 2-byte length
  }
  w.bytes(padded)
}

function encodeString(s: string): Uint8Array {
  // DICOM default character set is ISO-IR 6 (ASCII). For wider character
  // support we rely on the source bytes being copied when the VR is kept
  // verbatim; dummy values are ASCII-safe.
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

export interface SerializeOptions {
  dataSet: DataSet
  diff: ElementDiff
  /** Explicit new SOP Instance UID for group 0002 rewrite */
  newSOPInstanceUID?: string
}

export function serializeDicom({ dataSet, diff, newSOPInstanceUID }: SerializeOptions): Uint8Array {
  const body = new Writer()

  // Collect tags (skip group 0002 from the source - we rewrite it fresh)
  const allTags = Object.keys(dataSet.elements).map(k => k.slice(1).toUpperCase())
  const dataTags = allTags
    .filter(t => !t.startsWith('0002'))
    .filter(t => {
      const entry = diff.get(t)
      return !entry || entry.kind !== 'delete'
    })
    .sort()

  // Add any diff entries not already present
  const seen = new Set(dataTags)
  for (const [tag, entry] of diff) {
    if (entry.kind === 'write' && !seen.has(tag) && !tag.startsWith('0002')) {
      dataTags.push(tag)
    }
  }
  dataTags.sort()

  // Write data set body
  for (const tag of dataTags) {
    const diffEntry = diff.get(tag)
    if (diffEntry?.kind === 'delete') continue

    if (diffEntry?.kind === 'write') {
      writeElement(body, tag, diffEntry.vr, diffEntry.value)
      continue
    }

    // Copy original element verbatim
    const parserTag = 'x' + tag.toLowerCase()
    const el = dataSet.elements[parserTag]
    if (!el) continue

    // Determine VR: for Implicit VR input, element.vr is undefined - look up
    const vr = el.vr ?? lookupTag(tag).vr
    const valueBytes = new Uint8Array(
      dataSet.byteArray.buffer,
      dataSet.byteArray.byteOffset + el.dataOffset,
      el.length,
    )
    // Pixel data in Implicit VR needs special handling - always write as OW
    const effectiveVR = tag === '7FE00010' ? (vr === 'OB' || vr === 'OW' ? vr : 'OW') : vr
    writeElement(body, tag, effectiveVR, valueBytes)
  }

  const bodyBytes = body.toUint8Array()

  // --- Build File Meta Information (group 0002) ---
  const sopClassUID = (dataSet.string('x00080016') ?? '').trim()
  const sopInstanceUID = newSOPInstanceUID ?? (dataSet.string('x00080018') ?? '').trim()

  const metaInner = new Writer()
  // (0002,0001) OB FileMetaInformationVersion
  writeElement(metaInner, '00020001', 'OB', new Uint8Array([0x00, 0x01]))
  // (0002,0002) UI MediaStorageSOPClassUID
  writeElement(metaInner, '00020002', 'UI', encodeString(sopClassUID))
  // (0002,0003) UI MediaStorageSOPInstanceUID
  writeElement(metaInner, '00020003', 'UI', encodeString(sopInstanceUID))
  // (0002,0010) UI TransferSyntaxUID
  writeElement(metaInner, '00020010', 'UI', encodeString(TRANSFER_SYNTAX_EXPLICIT_VR_LE))
  // (0002,0012) UI ImplementationClassUID
  writeElement(metaInner, '00020012', 'UI', encodeString(IMPLEMENTATION_CLASS_UID))
  // (0002,0013) SH ImplementationVersionName
  writeElement(metaInner, '00020013', 'SH', encodeString(IMPLEMENTATION_VERSION_NAME))
  const metaInnerBytes = metaInner.toUint8Array()

  // Build final meta block with length-prefix element (0002,0000)
  const meta = new Writer()
  writeElement(meta, '00020000', 'UL', (() => {
    const b = new Uint8Array(4)
    new DataView(b.buffer).setUint32(0, metaInnerBytes.byteLength, true)
    return b
  })())
  meta.bytes(metaInnerBytes)
  const metaBytes = meta.toUint8Array()

  // --- Assemble final file: preamble + DICM + meta + data ---
  const out = new Uint8Array(128 + 4 + metaBytes.byteLength + bodyBytes.byteLength)
  // 128-byte zero preamble
  out.set(new Uint8Array(128), 0)
  // "DICM"
  out[128] = 0x44
  out[129] = 0x49
  out[130] = 0x43
  out[131] = 0x4d
  out.set(metaBytes, 132)
  out.set(bodyBytes, 132 + metaBytes.byteLength)
  return out
}

export function makeStringValue(s: string): Uint8Array {
  return encodeString(s)
}

export function makeEmptyValue(): Uint8Array {
  return new Uint8Array(0)
}
