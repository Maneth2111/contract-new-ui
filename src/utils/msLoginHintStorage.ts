import Cookies from 'js-cookie'

const COOKIE_KEY = 'cf_ms_login_hint'
const cookieOpts = { path: '/' as const }

//Used for MSAL ssoSilent or login_hint after Teams SSO or browser login
export function getMsLoginHint (): string | null {
  const v = Cookies.get(COOKIE_KEY)
  const t = v?.trim()
  return t || null
}

export function setMsLoginHint (email: string): void {
  const t = email.trim()
  if (t) Cookies.set(COOKIE_KEY, t, cookieOpts)
}

export function clearMsLoginHint (): void {
  Cookies.remove(COOKIE_KEY, cookieOpts)
}
