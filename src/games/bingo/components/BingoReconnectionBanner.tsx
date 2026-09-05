'use client'

import React from 'react'
import { AlertTriangle, Clock, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './BingoReconnectionBanner.module.css'

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

  const clampedSeconds = Math.max(0, Math.min(30, secondsRemaining))
  const progressPercent = (clampedSeconds / 30) * 100

  return (
    <div className={cn(styles.reconnectionBanner, className)}>
      <div
        className={styles.reconnectionCopy}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <span className={styles.reconnectionIcon} aria-hidden="true">
          <WifiOff />
        </span>
        <div>
          <div className={styles.reconnectionTitle}>
            <AlertTriangle aria-hidden="true" />
            <span>Connection interrupted</span>
          </div>
          <p>
            {remotePlayerName} is disconnected. The match is paused while we wait for them to return.
          </p>
        </div>
      </div>
      <div
        className={styles.reconnectionCountdown}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={30}
        aria-valuenow={clampedSeconds}
        aria-label={`Reconnection grace: ${clampedSeconds} seconds remaining`}
      >
        <Clock aria-hidden="true" />
        <span>{clampedSeconds}s grace</span>
      </div>
      <div className={styles.reconnectionProgressTrack} aria-hidden="true">
        <span style={{ transform: `scaleX(${progressPercent / 100})` }} />
      </div>
    </div>
  )
}
