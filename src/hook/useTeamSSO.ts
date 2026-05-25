import { useCallback, useEffect, useRef, useState } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';
import { jwtDecode } from 'jwt-decode';
import { setMsLoginHint } from '../utils/msLoginHintStorage';

interface TeamsUser {
  email: string;
  name: string;
  objectId: string;
  tenantId: string;
}

interface TeamsSSOState {
  token: string | null;
  user: TeamsUser | null;
  isTeamsApp: boolean;
  isTokenReady: boolean;
  isLoading: boolean;
  error: string | null;
}

interface TeamsTokenClaims {
  preferred_username?: string;
  upn?: string;
  name?: string;
  oid?: string;
  tid?: string;
}

const TOKEN_TIMEOUT_MS = 8000;

export const useTeamsSSO = (): TeamsSSOState => {
  const [state, setState] = useState<TeamsSSOState>({
    token: null,
    user: null,
    isTeamsApp: false,
    isTokenReady: false,
    isLoading: true,
    error: null,
  });
  const hasInitializedRef = useRef(false);

  const ensureInitialized = useCallback(async () => {
    if (hasInitializedRef.current) return true
    try {
      await microsoftTeams.app.initialize()
      hasInitializedRef.current = true
      return true
    } catch {
      setState({
        token: null,
        user: null,
        isTeamsApp: false,
        isTokenReady: false,
        isLoading: false,
        error: null,
      })
      return false
    }
  }, [])

  const refreshTeamsToken = useCallback(async (reason: string) => {
    const ok = await ensureInitialized()
    if (!ok) return

    setState((prev) => ({
      ...prev,
      isTeamsApp: true,
      isLoading: true,
      error: null,
    }))

    let context: microsoftTeams.app.Context | null = null
    try {
      context = await microsoftTeams.app.getContext()
    } catch (err: any) {
      setState({
        token: null,
        user: null,
        isTeamsApp: true,
        isTokenReady: false,
        isLoading: false,
        error: `Context failed: ${err?.message ?? String(err)}`,
      })
      return
    }

    let ssoToken: string | null = null
    let tokenError: string | null = null
    try {
      ssoToken = await Promise.race([
        microsoftTeams.authentication.getAuthToken(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('SSO token request timed out')),
            TOKEN_TIMEOUT_MS
          )
        ),
      ])
      console.log('[TeamsSSO] Token acquired:', reason)
    } catch (err: any) {
      const msg: string = err?.message || String(err)
      tokenError = msg.includes('CancelledByUser') ? 'Sign-in was cancelled' : msg
      console.warn('[TeamsSSO] Token failed:', tokenError)
    }

    let user: TeamsUser | null = null
    if (ssoToken) {
      try {
        const claims = jwtDecode<TeamsTokenClaims>(ssoToken)
        const email = claims.preferred_username ?? claims.upn ?? ''
        if (email) {
          user = {
            email,
            name: claims.name ?? context?.user?.displayName ?? '',
            objectId: claims.oid ?? context?.user?.id ?? '',
            tenantId: claims.tid ?? context?.user?.tenant?.id ?? '',
          }
        }
      } catch {
        
      }
    }

    if (!user) {
      const email =
        context?.user?.loginHint ?? context?.user?.userPrincipalName ?? null
      if (email) {
        user = {
          email,
          name: context?.user?.displayName ?? '',
          objectId: context?.user?.id ?? '',
          tenantId: context?.user?.tenant?.id ?? '',
        }
      }
    }

    if (user?.email) {
      setMsLoginHint(user.email)
    }

    setState({
      token: ssoToken,
      user,
      isTeamsApp: true,
      isTokenReady: !!ssoToken,
      isLoading: false,
      error: tokenError,
    })
  }, [ensureInitialized])

  useEffect(() => {
    void (async () => {
      await refreshTeamsToken('initial-load')
      if (!hasInitializedRef.current) return
      try {
        microsoftTeams.pages.registerFocusEnterHandler(() => {
          void refreshTeamsToken('tab-focused')
        })
      } catch {
      
      }
    })()
  }, [refreshTeamsToken])

  return state;
};