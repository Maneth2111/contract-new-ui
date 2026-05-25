export function hasMsalRedirectParamsInUrl (): boolean {
  const fromSearch = new URLSearchParams(window.location.search)
  if (fromSearch.has('code') || fromSearch.has('error')) return true

  const raw = window.location.hash
  if (!raw || raw.length <= 1) return false

  const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw
  const fromHash = new URLSearchParams(withoutHash)
  return fromHash.has('code') || fromHash.has('error')
}
