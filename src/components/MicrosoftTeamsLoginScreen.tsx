import { Loader2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useMsalLogin } from '../hook/useMsalLogin'

interface MicrosoftTeamsLoginScreenProps {
  onTeamsLogin: (token: string, email: string) => Promise<void>
  onRedirectDone?: () => void
}

export function MicrosoftTeamsLoginScreen({ onTeamsLogin, onRedirectDone }: MicrosoftTeamsLoginScreenProps) {
  const { signIn, isLoading, isRedirectLoading, isSilentLoading } = useMsalLogin({
    onTeamsLogin,
    onRedirectDone,
  })

  if (isRedirectLoading || isSilentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#f0f4ff] via-[#e8eeff] to-[#dde6ff] flex items-center justify-center p-4">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300 rounded-full opacity-30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-100 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-200/50 w-full max-w-sm p-10 border border-white/60">
        <div className="flex flex-col items-center mb-10">
          <img
            src="/color.png"
            alt="Chokchey Finance"
            className="w-20 h-20 rounded-2xl object-contain shadow-lg shadow-blue-300/50 mb-4"
          />
          <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Contract Management</h1>
          <p className="text-gray-400 mt-1">CHOKCHEY Finance Plc.</p>
        </div>

        <button
          type="button"
          onClick={signIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#6264A7]/30 bg-white hover:bg-[#6264A7]/5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <img
            src="/microsoftLogo.png"
            alt="Microsoft Logo"
            className="w-7 h-7 shrink-0 group-hover:scale-105 transition-transform duration-200"
          />
          {isLoading ? (
            <span className="inline-flex items-center gap-2 text-gray-600 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="text-gray-700 text-left">Sign in with Microsoft Account</span>
          )}
        </button>

        <p className="mt-10 text-center text-gray-400">Version 1.0.0</p>
      </div>
    </div>
  )
}