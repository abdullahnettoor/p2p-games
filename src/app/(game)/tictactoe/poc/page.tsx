'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TicTacToeP2P } from '@/games/tictactoe/components/TicTacToeP2P'
import { TicTacToePrimitivesShowcase } from '@/games/tictactoe/components'
import { ArrowLeft, Loader2, Palette, Server } from 'lucide-react'

function TicTacToePocContent() {
  const searchParams = useSearchParams()
  const matchParam = searchParams.get('room') || searchParams.get('match')
  const viewParam = searchParams.get('view')
  const isPrimitivesView = viewParam === 'primitives'

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full py-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Games</span>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          {isPrimitivesView ? (
            <Link
              href="/tictactoe/poc"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              data-testid="switch-to-poc-link"
            >
              <Server className="w-3.5 h-3.5" />
              <span>P2P Connectivity POC</span>
            </Link>
          ) : (
            <Link
              href="/tictactoe/poc?view=primitives"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              data-testid="switch-to-primitives-link"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Notebook Margin Primitives</span>
            </Link>
          )}
        </div>
      </div>

      {isPrimitivesView ? (
        <TicTacToePrimitivesShowcase />
      ) : (
        <TicTacToeP2P
          key={matchParam ?? 'host'}
          role={matchParam ? 'guest' : 'host'}
          matchId={matchParam ?? undefined}
        />
      )}
    </div>
  )
}

export default function TicTacToePocPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <TicTacToePocContent />
    </Suspense>
  )
}
