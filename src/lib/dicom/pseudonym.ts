// Deterministic pseudonymization via SHA-256.
// Works in both main thread and Web Workers (crypto.subtle is available in both).

export async function pseudonymize(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + '|' + value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hashBuffer)
  let hex = ''
  for (let i = 0; i < 6; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  // 12 hex chars; readable, URL-safe, fits any DICOM string VR
  return hex.toUpperCase()
}

// Format-preserving mask:
//   digit          → '#'
//   uppercase A–Z  → 'X'
//   lowercase a–z  → 'x'
//   anything else  → unchanged (preserves punctuation/separators)
export function formatMask(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    if (ch >= 48 && ch <= 57) out += '#'
    else if (ch >= 65 && ch <= 90) out += 'X'
    else if (ch >= 97 && ch <= 122) out += 'x'
    else out += value[i]
  }
  return out
}
