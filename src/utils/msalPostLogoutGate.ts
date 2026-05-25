const KEY = 'cf_skip_msal_silent_until'
const WINDOW_MS = 8000

export function setSkipMsalSilentOnce (): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now() + WINDOW_MS))
  } catch {
  }
}

export function shouldSkipMsalSilent (): boolean {
  try {
    const v = sessionStorage.getItem(KEY)
    if (!v) return false
    const until = Number(v)
    if (Number.isNaN(until) || Date.now() > until) {
      sessionStorage.removeItem(KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}
