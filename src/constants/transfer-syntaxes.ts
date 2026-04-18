export const TRANSFER_SYNTAXES: Record<string, string> = {
  '1.2.840.10008.1.2':     'Implicit VR Little Endian',
  '1.2.840.10008.1.2.1':   'Explicit VR Little Endian',
  '1.2.840.10008.1.2.1.99':'Deflated Explicit VR Little Endian',
  '1.2.840.10008.1.2.2':   'Explicit VR Big Endian',
  '1.2.840.10008.1.2.4.50':'JPEG Baseline (Process 1)',
  '1.2.840.10008.1.2.4.51':'JPEG Extended (Process 2&4)',
  '1.2.840.10008.1.2.4.57':'JPEG Lossless, Non-Hierarchical (Process 14)',
  '1.2.840.10008.1.2.4.70':'JPEG Lossless, Non-Hierarchical, First-Order Prediction (Process 14)',
  '1.2.840.10008.1.2.4.80':'JPEG-LS Lossless',
  '1.2.840.10008.1.2.4.81':'JPEG-LS Near-Lossless',
  '1.2.840.10008.1.2.4.90':'JPEG 2000 Lossless',
  '1.2.840.10008.1.2.4.91':'JPEG 2000',
  '1.2.840.10008.1.2.4.202':'High-Throughput JPEG 2000 Lossless',
  '1.2.840.10008.1.2.5':   'RLE Lossless',
}

export const UNCOMPRESSED_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
  '1.2.840.10008.1.2.2',
])
