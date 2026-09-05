'use client'

import React from 'react'
import { WifiOff, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BingoReconnectionBannerProps {
  isReconnecting: boolean
  secondsRemaining: number
  remotePlayerName: string
  className?: string
}

export const BingoReconnectionBanner: React.FC<BingoReconnectionBannerProps> = ({
  isReconnecting,
  secondsRemaining,
  remotePlayerName,
  className,
}) => {
  if (!isReconnecting) return null

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100))

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 p-4 shadow-xl shadow-amber-950/30 animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      {/* Background Warning Pulse */}
      <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />

      {/* Progress bar along the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <div
          className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-bounce">
            <WifiOff className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                Opponent Disconnected
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Reconnecting to <span className="font-semibold text-white">{remotePlayerName}</span>. Awaiting their return...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shrink-0">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Forfeit win in {secondsRemaining}s</span>
        </div>
      </div>
    </div>
  )
}
