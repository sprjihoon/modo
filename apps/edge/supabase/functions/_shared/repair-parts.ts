export interface QuoteRepairPart {
  name: string
  price: number
  quantity: number
  detail?: string
}

function asDetail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function detailFromDetailedMeasurements(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const lines: string[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const part = String(row.part ?? '').trim()
    if (Array.isArray(row.values) && row.values.length > 0) {
      const bits = row.values
        .map((v) => {
          if (v && typeof v === 'object') {
            const item = v as Record<string, unknown>
            const label = String(item.label ?? '').trim()
            const value = String(item.value ?? '').trim()
            if (!value) return ''
            return label ? `${label}: ${value}` : value
          }
          return String(v ?? '').trim()
        })
        .filter(Boolean)
        .join(', ')
      if (!bits) continue
      lines.push(part ? `${part} (${bits})` : bits)
      continue
    }
    const value = String(row.value ?? '').trim()
    if (!value) continue
    lines.push(part ? `${part}: ${value}` : value)
  }
  return lines.length > 0 ? lines.join(' / ') : undefined
}

export function repairItemDetail(item: Record<string, unknown>): string | undefined {
  const existing = asDetail(item.detail)
  if (existing) return existing

  const fromDetailed = detailFromDetailedMeasurements(item.detailedMeasurements)
  if (fromDetailed) return fromDetailed

  const parts: string[] = []
  const scope = String(item.scope ?? '').trim()
  const measurement = String(item.measurement ?? '').trim()
  if (scope) parts.push(scope)
  if (measurement && measurement !== '{}') parts.push(measurement)
  const selected = Array.isArray(item.selectedParts) ? item.selectedParts : []
  if (selected.length > 0) parts.push(`부위: ${selected.join(', ')}`)
  return parts.length > 0 ? parts.join(' / ') : undefined
}

export function toQuoteRepairItem(item: Record<string, unknown>): QuoteRepairPart {
  const name = String(item.repairPart ?? item.name ?? '수선').trim() || '수선'
  const price = Number(item.price) || 0
  const quantity = Number(item.quantity) || 1
  const detail = repairItemDetail(item)
  return {
    name,
    price,
    quantity: quantity < 1 ? 1 : quantity,
    ...(detail ? { detail } : {}),
  }
}
