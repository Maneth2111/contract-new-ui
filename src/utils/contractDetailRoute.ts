export type ContractDetailTab = 'details' | 'documents' | 'history'

const CONTRACT_DETAIL_PATH =
  /^\/contracts\/(\d+)(?:\/(details|documents|history))?\/?$/

export function parseContractDetailPath (pathname: string): {
  contractId: number
  tab: ContractDetailTab
} | null {
  const m = pathname.match(CONTRACT_DETAIL_PATH)
  if (!m) return null
  const contractId = Number(m[1])
  if (!Number.isFinite(contractId)) return null
  const raw = m[2]
  const tab: ContractDetailTab =
    raw === 'documents' || raw === 'history' ? raw : 'details'
  return { contractId, tab }
}

export function buildContractDetailPath (
  contractId: number,
  tab: ContractDetailTab = 'details'
): string {
  return `/contracts/${contractId}/${tab}`
}
