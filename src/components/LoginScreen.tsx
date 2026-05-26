import React, { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Cookies from "js-cookie";
import { LoginFormValues, loginSchema } from '../lib/loginSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { PublicClientApplication } from '@azure/msal-browser'
import { jwtDecode } from 'jwt-decode'

type MicrosoftIdTokenClaims = {
  preferred_username?: string
  upn?: string
  email?: string
}

interface LoginScreenProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>
  onTeamsLogin?: (token: string, email: string) => Promise<void>
  onRedirectDone?: () => void
}
export function LoginScreen({ onRedirectDone, onLogin, onTeamsLogin }: LoginScreenProps) {
  const rememberedEmail = Cookies.get("rememberedUser") || '';
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: rememberedEmail,
      password: '',
      rememberMe: !!rememberedEmail,
    },
  });

  const usernameValue = watch('username');
  const passwordValue = watch('password');
  const isFormEmpty = !usernameValue?.trim() || !passwordValue;

  const msal = useMemo(() => {
    return new PublicClientApplication({
      auth: {
        clientId: '3964b181-a946-4afd-a8c1-07f863182796',
        authority: 'https://login.microsoftonline.com/f3901143-69d8-4274-a01e-4b269d7e4a36',
        // redirectUri: 'https://captivity-rumbling-skirmish.ngrok-free.dev' ,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    })
  }, [])

  const apiScope = (import.meta as any).env.VITE_AZURE_API_SCOPE as string | undefined

  const applyTeamsLogin = async (payload: { idToken: string; accessToken: string }) => {
    if (!onTeamsLogin) {
      throw new Error('Microsoft Teams sign-in is not configured')
    }

    console.log('=== Token Debug ===')
    console.log('ID token (for claims):', payload.idToken)
    console.log('Access token (for API):', payload.accessToken)
    const claims = jwtDecode<MicrosoftIdTokenClaims>(payload.idToken)
    console.log('Claims:', JSON.stringify(claims, null, 2))
    console.log('===================')
    const email = claims.preferred_username ?? claims.upn ?? claims.email ?? ''
    if (!email) {
      throw new Error('Could not read email from Microsoft sign-in')
    }

    await onTeamsLogin(payload.accessToken, email)
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await msal.initialize()
        const res = await msal.handleRedirectPromise()
        if (cancelled || !res) return

        const idToken = res.idToken
        if (!idToken) {
          onRedirectDone?.()
          return
        }

        if (!apiScope) {
          throw new Error('Missing VITE_AZURE_API_SCOPE (API scope for access token)')
        }

        const accessToken =
          res.accessToken ||
          (await msal.acquireTokenSilent({
            account: res.account,
            scopes: [apiScope],
          })).accessToken

        if (!accessToken) {
          throw new Error('Could not acquire access token for API')
        }

        setIsTeamsLoading(true)
        try {
          await applyTeamsLogin({ idToken, accessToken })
        } catch (err: any) {
          toast.error(err?.message || 'Microsoft Teams sign-in failed')
          onRedirectDone?.()
        } finally {
          if (!cancelled) setIsTeamsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(err)
          onRedirectDone?.()
        }
      }
    })()

    return () => { cancelled = true }
  }, [msal])

  const handleMicrosoftTeamsSignIn = async () => {
    if (!onTeamsLogin) {
      toast.error('Microsoft Teams sign-in is not available')
      return
    }

    if (!apiScope) {
      toast.error('Missing VITE_AZURE_API_SCOPE (API scope for access token)')
      return
    }

    setIsTeamsLoading(true)
    try {
      await msal.initialize()
      await msal.loginRedirect({
        scopes: ['openid', 'profile', 'email', apiScope],
        prompt: 'select_account',
      })
    } catch (err: any) {
      toast.error(err?.message || 'Microsoft Teams sign-in failed')
      setIsTeamsLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await onLogin(data.username, data.password, data.rememberMe);
    } catch (error: any) {
      toast.error(error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };
  const ErrorMsg = ({ message }: { message?: string }) =>
    message ? <p className="text-red-500 text-sm mt-1">{message}</p> : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 to-brand-pink/15 flex items-center justify-center p-4">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
        {/* Logo and System Name */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white">CF</span>
          </div>
          <h1 className="text-gray-900 mb-2">Contract Monitor System</h1>
          <p className="text-gray-600">Chokchey Finance</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 mb-2">Username / Email *</label>
            <input
              {...register('username')}
              type="text"
              disabled={isLoading || isTeamsLoading}
              placeholder="Enter your username or email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <ErrorMsg message={errors.username?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password *</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading || isTeamsLoading}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading || isTeamsLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <ErrorMsg message={errors.password?.message} />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                {...register('rememberMe')}
                type="checkbox"
                disabled={isLoading || isTeamsLoading}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="ml-2 text-gray-700">Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => alert('Password reset functionality would be implemented here')}
              className="text-primary hover:text-brand-navy cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isFormEmpty || isLoading || isTeamsLoading}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-gray-500 text-sm">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMicrosoftTeamsSignIn}
            disabled={isLoading || isTeamsLoading}
            className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-3"
          >
            <span className="w-6 h-6 rounded bg-[#6264A7] text-white flex items-center justify-center text-xs font-semibold">
              T
            </span>
            {isTeamsLoading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Signing in...
              </span>
            ) : (
              'Sign in with Microsoft Teams'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
