'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BingoOnlineGame } from '@/games/bingo/components/BingoOnlineGame'
import { Loader2 } from 'lucide-react'

function BingoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchParam = searchParams.get('room') || searchParams.get('match')
  const actionParam = searchParams.get('action')

  const handleExitToCatalog = () => {
    router.replace('/')
  }

  return (
    <div className="gameRouteSurface">
      <BingoOnlineGame
        key={`${actionParam ?? ''}:${matchParam ?? ''}`}
        initialAction={actionParam === 'create' ? 'create' : null}
        initialRoomCode={matchParam ?? null}
        onExit={handleExitToCatalog}
      />
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
