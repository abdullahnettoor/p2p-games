import { useEffect, useRef } from 'react'

export interface BingoTurnAttentionState {
  activePlayerId: string
  localPlayerId: string
  secondsRemaining: number
}

export function useBingoTurnAttention({
  activePlayerId,
  localPlayerId,
  secondsRemaining,
}: BingoTurnAttentionState): void {
  const originalTitleRef = useRef<string | null>(null)
  const latestStateRef = useRef({ activePlayerId, localPlayerId, secondsRemaining })

  useEffect(() => {
    if (typeof document === 'undefined') return
    originalTitleRef.current = document.title

    const handleVisibilityChange = () => {
      const latest = latestStateRef.current
      if (!document.hidden && originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
      } else if (document.hidden && latest.activePlayerId === latest.localPlayerId) {
        document.title = `Your BINGO turn · ${latest.secondsRemaining}s`
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (originalTitleRef.current !== null) document.title = originalTitleRef.current
    }
  }, [])

  useEffect(() => {
    latestStateRef.current = { activePlayerId, localPlayerId, secondsRemaining }
    if (typeof document === 'undefined' || originalTitleRef.current === null) return

    if (document.hidden && activePlayerId === localPlayerId) {
      document.title = `Your BINGO turn · ${secondsRemaining}s`
    } else if (document.hidden) {
      document.title = originalTitleRef.current
    }
  }, [activePlayerId, localPlayerId, secondsRemaining])
}
