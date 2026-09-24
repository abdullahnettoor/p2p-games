'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TicTacToeP2P } from '@/games/tictactoe/components/TicTacToeP2P'
import { ArrowLeft, Loader2 } from 'lucide-react'

function TicTacToeContent() {
  const searchParams = useSearchParams()
  const matchParam = searchParams.get('room') || searchParams.get('match')

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full py-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Games</span>
      </Link>

      <TicTacToeP2P
        key={matchParam ?? 'host'}
        role={matchParam ? 'guest' : 'host'}
        matchId={matchParam ?? undefined}
      />
    </div>
  )
}

export default function TicTacToePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <TicTacToeContent />
    </Suspense>
  )
}
