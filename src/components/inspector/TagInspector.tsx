import { useEffect, useMemo, useState } from 'react'
import type { DicomFile } from '../../types/dicom'
import type { AnonymizationConfig, TagAction, TagRule } from '../../types/anonymization'
import { PHI_TAG_MAP } from '../../constants/phi-tags'
import { lookupTag } from '../../lib/dicom/tag-dictionary'
import { Badge } from '../ui/Badge'
import { formatMask } from '../../lib/dicom/pseudonym'
import { shiftDateString } from '../../lib/dicom/anonymizer'

interface TagInspectorProps {
  instance: DicomFile | null
  config: AnonymizationConfig
  onUpdateRule: (tag: string, patch: { action?: TagAction; enabled?: boolean; dummyValue?: string }) => void
}

type TagRow = {
  tag: string
  keyword: string
  vr: string
  value: string
  preview: string   // expected value after anonymization (empty = unchanged)
  isPHI: boolean
  category?: string
  action: TagAction
  enabled: boolean
  dummyValue?: string
}

function previewValue(tag: string, original: string, rule: TagRule | undefined, config: AnonymizationConfig): string {
  if (!rule || !rule.enabled) return ''
  switch (rule.action) {
    case 'K': return ''
    case 'X': return '(removed)'
    case 'Z': return '(empty)'
    case 'D': {
      const dummy = rule.dummyValue
        ?? (tag === '00100010' ? config.patientNameDummy
          : tag === '00100020' ? config.patientIDDummy
          : 'ANONYMIZED')
      return dummy
    }
    case 'U': return '(UID remapped)'
    case 'S': {
      if (original && /^\d{8}$/.test(original.trim())) {
        return shiftDateString(original.trim(), config.dateShiftDays)
      }
      return original ? `(shifted ${config.dateShiftDays > 0 ? '+' : ''}${config.dateShiftDays}d)` : ''
    }
    case 'M': return original ? formatMask(original) : ''
    case 'P': return '(pseudonym)'
    default: return ''
  }
}

function readValue(instance: DicomFile, parserKey: string): string {
  const el = instance.dataSet.elements[parserKey]
  if (!el) return ''
  const vr = el.vr
  if (vr === 'SQ') return '[sequence]'
  if (vr === 'OB' || vr === 'OW' || vr === 'OF' || vr === 'UN') return `[binary, ${el.length} bytes]`
  try {
    const raw = instance.dataSet.string(parserKey)
    if (raw == null) return ''
    return raw.length > 80 ? raw.slice(0, 80) + '…' : raw
  } catch {
    return `[${el.length} bytes]`
  }
}

export function TagInspector({ instance, config, onUpdateRule }: TagInspectorProps) {
  const [search, setSearch] = useState('')
  const [filterPHI, setFilterPHI] = useState(false)

  const rows: TagRow[] = useMemo(() => {
    if (!instance) return []
    const out: TagRow[] = []
    for (const parserKey of Object.keys(instance.dataSet.elements)) {
      const tag = parserKey.slice(1).toUpperCase()
      const info = lookupTag(tag)
      const phiDef = PHI_TAG_MAP.get(tag)
      const rule = config.rules.get(tag)
      const rawValue = readValue(instance, parserKey)
      out.push({
        tag,
        keyword: info.keyword,
        vr: instance.dataSet.elements[parserKey].vr ?? info.vr,
        value: rawValue,
        preview: previewValue(tag, rawValue, rule, config),
        isPHI: !!phiDef,
        category: phiDef?.category,
        action: rule?.action ?? 'K',
        enabled: rule?.enabled ?? true,
        dummyValue: rule?.dummyValue,
      })
    }
    out.sort((a, b) => a.tag.localeCompare(b.tag))
    return out
  }, [instance, config])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      if (filterPHI && !r.isPHI) return false
      if (!q) return true
      return (
        r.tag.toLowerCase().includes(q) ||
        r.keyword.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q)
      )
    })
  }, [rows, search, filterPHI])

  const phiCount = rows.filter(r => r.isPHI).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      <header
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #30363d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 15, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Tag Inspector
          </div>
          <div className="mono" style={{ fontSize: 16, color: '#8b949e' }}>
            {filtered.length} / {rows.length}
            {phiCount > 0 && <span style={{ marginLeft: 8, color: '#ff8a80' }}>{phiCount} PHI</span>}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search tags…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: 16,
            background: '#161b22',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: 4,
            outline: 'none',
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 15, color: '#8b949e', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterPHI} onChange={e => setFilterPHI(e.target.checked)} />
          Show only PHI / sensitive tags
        </label>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(row => (
          <TagRowView key={row.tag} row={row} onUpdateRule={onUpdateRule} />
        ))}
      </div>
    </div>
  )
}

interface TagRowViewProps {
  row: TagRow
  onUpdateRule: (tag: string, patch: { action?: TagAction; enabled?: boolean; dummyValue?: string }) => void
}

function TagRowView({ row, onUpdateRule }: TagRowViewProps) {
  const stripeClass = row.category ? `stripe-${row.category}` : ''
  const categoryColor =
    row.category === 'identity' ? 'identity' :
    row.category === 'date' ? 'date' :
    row.category === 'uid' ? 'uid' :
    row.category === 'institution' ? 'institution' :
    row.category === 'device' ? 'device' :
    row.category === 'description' ? 'description' :
    undefined

  const showDummyInput = row.action === 'D'

  return (
    <div
      className={stripeClass}
      style={{
        padding: '8px 14px 8px 14px',
        borderBottom: '1px solid #1c2128',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 8,
        alignItems: 'start',
        opacity: row.enabled ? 1 : 0.45,
      }}
    >
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={e => onUpdateRule(row.tag, { enabled: e.target.checked })}
        style={{ marginTop: 2 }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 3,
            flexWrap: 'nowrap',
          }}
        >
          <span className="mono" style={{ fontSize: 15, color: '#8b949e', flexShrink: 0 }}>
            ({row.tag.slice(0, 4)},{row.tag.slice(4)})
          </span>
          <span
            style={{
              fontSize: 16,
              color: '#c9d1d9',
              fontWeight: 500,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.keyword}
          >
            {row.keyword}
          </span>
          <span className="mono" style={{ fontSize: 16, color: '#8b949e', flexShrink: 0 }}>{row.vr}</span>
          {categoryColor && (
            <span style={{ flexShrink: 0 }}>
              <Badge color={categoryColor as 'identity'}>PHI · {row.category}</Badge>
            </span>
          )}
          <select
            value={row.action}
            onChange={e => onUpdateRule(row.tag, { action: e.target.value as TagAction })}
            className="mono"
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              padding: '1px 4px',
              fontSize: 16,
              background: '#161b22',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: 3,
            }}
          >
            <option value="K">K (keep)</option>
            <option value="X">X (remove)</option>
            <option value="Z">Z (empty)</option>
            <option value="D">D (dummy)</option>
            <option value="U">U (new UID)</option>
            <option value="S">S (date-shift)</option>
            <option value="M">M (mask)</option>
            <option value="P">P (pseudonym)</option>
          </select>
        </div>
        {showDummyInput && <DummyInput row={row} onUpdateRule={onUpdateRule} />}
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', minWidth: 0 }}>
          <div
            className="mono"
            style={{
              fontSize: 15,
              color: '#8b949e',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: row.preview ? '0 1 auto' : '1',
            }}
          >
            {row.value || <span style={{ color: '#484f58' }}>—</span>}
          </div>
          {row.preview && (
            <>
              <span style={{ fontSize: 16, color: '#484f58', flexShrink: 0 }}>→</span>
              <div
                className="mono"
                style={{
                  fontSize: 15,
                  color: row.preview === '(removed)' ? '#ff8a80' : '#3fb950',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {row.preview}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DummyInput({ row, onUpdateRule }: TagRowViewProps) {
  const [local, setLocal] = useState(row.dummyValue ?? '')

  // Keep local state in sync if parent changes the rule externally
  useEffect(() => {
    setLocal(row.dummyValue ?? '')
  }, [row.dummyValue])

  const commit = (value: string) => {
    setLocal(value)
    onUpdateRule(row.tag, { dummyValue: value })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
        marginBottom: 3,
      }}
    >
      <input
        type="text"
        value={local}
        placeholder="(default dummy)"
        onChange={e => commit(e.target.value)}
        className="mono"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '2px 6px',
          fontSize: 16,
          background: '#161b22',
          color: '#c9d1d9',
          border: '1px solid #30363d',
          borderRadius: 3,
          outline: 'none',
        }}
      />
      {(['####', 'XXXX', 'ANON'] as const).map(preset => (
        <button
          key={preset}
          type="button"
          onClick={() => commit(preset)}
          className="mono"
          style={{
            padding: '2px 5px',
            fontSize: 15,
            background: '#1c2128',
            color: '#8b949e',
            border: '1px solid #30363d',
            borderRadius: 3,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {preset}
        </button>
      ))}
    </div>
  )
}
