// Counter-based or hash-based UID generator using the DICOM-registered 2.25 root
// (ISO 9834-8 UUID-derived UIDs). Stays within the 64-char DICOM UID limit.
// Reproducible mode produces the same UID for the same input across sessions.

interface UIDRemapperOptions {
  reproducible?: boolean
  salt?: string
  sessionID?: string
}

export class UIDRemapper {
  private map = new Map<string, string>()
  private counter = 0
  private readonly sessionID: string
  private readonly reproducible: boolean
  private readonly salt: string

  constructor(options?: UIDRemapperOptions | string) {
    let opts: UIDRemapperOptions = {}
    if (typeof options === 'string') {
      opts = { sessionID: options }
    } else if (options) {
      opts = options
    }

    this.reproducible = opts.reproducible ?? false
    this.salt = opts.salt ?? ''

    if (opts.sessionID) {
      this.sessionID = opts.sessionID
    } else {
      const seed = crypto.getRandomValues(new Uint32Array(2))
      this.sessionID = `${Date.now()}${seed[0]}${seed[1]}`
    }
  }

  private hashUID(original: string): string {
    const input = this.salt + '|' + original
    let lo = 0x811c9dc5
    let hi = 0x811c9dc5
    for (let i = 0; i < input.length; i++) {
      const b = input.charCodeAt(i) & 0xff
      lo = (Math.imul(lo ^ b, 0x01000193)) >>> 0
      hi = (Math.imul(hi ^ b, 0x0117f1bd)) >>> 0
    }
    const hash = (BigInt(hi) * 0x100000000n + BigInt(lo)).toString()
    return '2.25.' + hash
  }

  remap(originalUID: string): string {
    const existing = this.map.get(originalUID)
    if (existing) return existing

    let uid: string
    if (this.reproducible) {
      uid = this.hashUID(originalUID)
    } else {
      this.counter += 1
      const candidate = `2.25.${this.sessionID}${this.counter}`
      uid = candidate.length > 64 ? candidate.slice(0, 64) : candidate
    }

    this.map.set(originalUID, uid)
    return uid
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.map)
  }

  import(entries: Record<string, string>): void {
    for (const [k, v] of Object.entries(entries)) {
      this.map.set(k, v)
    }
  }
}
