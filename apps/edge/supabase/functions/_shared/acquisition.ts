export function acqColumnsFromPickup(pickup?: Record<string, unknown> | null): Record<string, string | null> {
  if (!pickup) return {}
  const source = String(pickup.acq_source || pickup.acqSource || '').trim()
  if (!source) return {}
  const medium = String(pickup.acq_medium || pickup.acqMedium || '').trim()
  const campaign = String(pickup.acq_campaign || pickup.acqCampaign || '').trim()
  const content = String(pickup.acq_content || pickup.acqContent || '').trim()
  const term = String(pickup.acq_term || pickup.acqTerm || '').trim()
  return {
    acq_source: source,
    acq_medium: medium || null,
    acq_campaign: campaign || null,
    acq_content: content || null,
    acq_term: term || null,
  }
}
