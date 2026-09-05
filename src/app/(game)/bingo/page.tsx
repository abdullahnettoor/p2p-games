'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BingoOnlineGame } from '@/games/bingo/components/BingoOnlineGame'
import { Loader2 } from 'lucide-react'

function BingoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchParam = searchParams.get('match')
  const [mode, setMode] = useState<'online-host' | 'online-guest'>(() => (
    matchParam ? 'online-guest' : 'online-host'
  ))

  useEffect(() => {
    setMode(matchParam ? 'online-guest' : 'online-host')
  }, [matchParam])

  const handleExitToCatalog = () => {
    setMode('online-host')
    router.replace('/')
  }

  return (
    <div className="gameRouteSurface">
      {mode === 'online-host' ? (
        <BingoOnlineGame role="host" onExit={handleExitToCatalog} />
      ) : (
        <BingoOnlineGame role="guest" matchId={matchParam ?? undefined} onExit={handleExitToCatalog} />
      )}
    </div>
  )
}

export default function BingoPage() {
  return (
    <Suspense
      fallback={
        <div className="gameLoading" role="status" aria-label="Loading Bingo">
          <Loader2 className="gameLoadingIcon" />
        </div>
      }
    >
      <BingoContent />
    </Suspense>
  )
}
