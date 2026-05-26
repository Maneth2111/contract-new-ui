import { UserX } from 'lucide-react'

type TeamsAccountNotFoundScreenProps = {
  email?: string
  detailMessage?: string
  onRetry?: () => void
}

export function TeamsAccountNotFoundScreen ({
  email,
  detailMessage,
  onRetry,
}: TeamsAccountNotFoundScreenProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute w-72 h-72 rounded-full bg-primary/5/80 -translate-y-24" />
        <div className="absolute w-40 h-40 rounded-full bg-sky-100/60 translate-x-32 translate-y-20" />
        <div className="absolute w-3 h-3 rounded-full bg-primary/20/90 -translate-x-40 -translate-y-32" />
        <div className="absolute w-2 h-2 rounded-full bg-primary/30/80 translate-x-48 -translate-y-8" />
        <div className="absolute text-primary/25 text-2xl font-light -translate-x-52 translate-y-28 select-none">
          +
        </div>
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-brand-pink/15 ring-1 ring-primary/25/60">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-sm">
            <UserX className="h-14 w-14 text-sky-500" strokeWidth={1.25} aria-hidden />
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
          We couldn&apos;t find your account
        </h1>

        <p className="mt-4 text-slate-600 text-[15px] leading-relaxed">
          You signed in with Microsoft Teams, but this app has no user linked to your work account
          {email ? (
            <>
              {' '}
              <span className="font-medium text-slate-800 wrap-break-word">({email})</span>
            </>
          ) : null}
          . Ask your administrator to add you in Contract Management, then try again.
        </p>

        {detailMessage ? (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 wrap-break-word">
            {detailMessage}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
            >
              Try again
            </button>
          ) : null}
        </div>

        <p className="mt-10 text-sm text-slate-400">
          If you keep seeing this after your account was created, try refreshing the tab once in a while it helps :)
        </p>
      </div>
    </div>
  )
}
