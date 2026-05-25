import { useEffect, useMemo, useState } from 'react'
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'
import { hasMsalRedirectParamsInUrl } from '../utils/msalRedirectUrl'
import { getMsLoginHint } from '../utils/msLoginHintStorage'
import { shouldSkipMsalSilent } from '../utils/msalPostLogoutGate'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'

type MicrosoftIdTokenClaims = {
    preferred_username?: string
    upn?: string
    email?: string
}

interface UseMsalLoginOptions {
    onTeamsLogin: (token: string, email: string) => Promise<void>
    onRedirectDone?: () => void
}

const browserScopes = (apiScope: string) => ['openid', 'profile', 'email', apiScope]

export function useMsalLogin ({ onTeamsLogin, onRedirectDone }: UseMsalLoginOptions) {
    const [isLoading, setIsLoading] = useState(false)
    const [isRedirectLoading, setIsRedirectLoading] = useState(() =>
        hasMsalRedirectParamsInUrl()
    )
    const [isSilentLoading, setIsSilentLoading] = useState(() => {
        if (hasMsalRedirectParamsInUrl()) return false
        if (shouldSkipMsalSilent()) return false
        return true
    })

    const apiScope = (import.meta as any).env.VITE_AZURE_API_SCOPE as string | undefined
    const clientId = (import.meta as any).env.VITE_AZURE_CLIENT_ID as string
    const tenantId = (import.meta as any).env.VITE_AZURE_TENANT_ID as string

    const msal = useMemo(() => {
        return new PublicClientApplication({
            auth: {
                clientId,
                authority: `https://login.microsoftonline.com/${tenantId}`,
                redirectUri: window.location.origin,
            },
            cache: { cacheLocation: 'sessionStorage' },
        })
    }, [clientId, tenantId])

    useEffect(() => {
        let cancelled = false

        void (async () => {
            try {
                await msal.initialize()
                const res = await msal.handleRedirectPromise()

                if (res) {
                    const idToken = res.idToken
                    if (!idToken) {
                        onRedirectDone?.()
                        return
                    }

                    if (!apiScope) throw new Error('Missing VITE_AZURE_API_SCOPE')

                    const accessToken =
                        res.accessToken ||
                        (await msal.acquireTokenSilent({
                            account: res.account,
                            scopes: [apiScope],
                        })).accessToken

                    if (!accessToken) throw new Error('Could not acquire access token for API')

                    const claims = jwtDecode<MicrosoftIdTokenClaims>(idToken)
                    const email = claims.preferred_username ?? claims.upn ?? claims.email ?? ''
                    if (!email) throw new Error('Could not read email from Microsoft sign-in')

                    try {
                        await onTeamsLogin(accessToken, email)
                    } catch (err: any) {
                        toast.error(err?.message || 'Microsoft Teams sign-in failed')
                        onRedirectDone?.()
                    }
                    return
                }

                if (cancelled) return
                setIsRedirectLoading(false)

                if (shouldSkipMsalSilent()) {
                    if (!cancelled) setIsSilentLoading(false)
                    return
                }

                if (!apiScope) {
                    if (!cancelled) setIsSilentLoading(false)
                    return
                }

                const loginHint = getMsLoginHint()
                try {
                    const silent = await msal.ssoSilent({
                        scopes: browserScopes(apiScope),
                        ...(loginHint ? { loginHint } : {}),
                    })
                    if (cancelled) return

                    const idToken = silent.idToken
                    if (!idToken) return

                    const accessToken =
                        silent.accessToken ||
                        (await msal.acquireTokenSilent({
                            account: silent.account,
                            scopes: [apiScope],
                        })).accessToken

                    if (!accessToken) return

                    const claims = jwtDecode<MicrosoftIdTokenClaims>(idToken)
                    const email = claims.preferred_username ?? claims.upn ?? claims.email ?? ''
                    if (!email) return

                    await onTeamsLogin(accessToken, email)
                } catch (e: unknown) {
                    const isInteraction =
                        e instanceof InteractionRequiredAuthError ||
                        (typeof e === 'object' &&
                            e !== null &&
                            'errorCode' in e &&
                            (e as { errorCode?: string }).errorCode === 'interaction_required')
                    if (!isInteraction && !cancelled) {
                        console.debug('[msal] ssoSilent:', e)
                    }
                } finally {
                    if (!cancelled) setIsSilentLoading(false)
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn(err)
                    onRedirectDone?.()
                    setIsSilentLoading(false)
                }
            } finally {
                if (!cancelled) setIsRedirectLoading(false)
            }
        })()

        return () => { cancelled = true }
    }, [msal])

    const signIn = async () => {
        if (!apiScope) {
            toast.error('Missing VITE_AZURE_API_SCOPE')
            return
        }
        setIsLoading(true)
        try {
            await msal.initialize()
            await msal.loginRedirect({
                scopes: browserScopes(apiScope),
                prompt: 'select_account',
            })
        } catch (err: any) {
            toast.error(err?.message || 'Microsoft Teams sign-in failed')
            setIsLoading(false)
        }
    }

    return { signIn, isLoading, isRedirectLoading, isSilentLoading }
}
