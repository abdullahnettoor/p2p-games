'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { BingoLocalGame } from '@/games/bingo/components/BingoLocalGame'
import { BingoOnlineGame } from '@/games/bingo/components/BingoOnlineGame'
import { ArrowLeft, Play, Globe, Loader2 } from 'lucide-react'

function BingoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchParam = searchParams.get('match')
  const actionParam = searchParams.get('action')

  const [mode, setMode] = useState<'hub' | 'local' | 'online-host' | 'online-guest'>(() => {
    if (matchParam) return 'online-guest'
    if (actionParam === 'create') return 'online-host'
    return 'hub'
  })

  useEffect(() => {
    if (matchParam) {
      setMode('online-guest')
    } else if (actionParam === 'create') {
      setMode('online-host')
    }
  }, [matchParam, actionParam])

  const handleExitToHub = () => {
    setMode('hub')
    router.replace('/bingo')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full py-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="min-h-11 inline-flex items-center gap-2 px-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Games</span>
        </Link>
        {mode !== 'hub' && (
          <button
            type="button"
            onClick={handleExitToHub}
            className="min-h-11 px-2 text-sm text-slate-400 hover:text-slate-200 underline font-medium"
          >
            Change Mode
          </button>
        )}
      </div>

      {mode === 'hub' && (
        <div className="space-y-8 max-w-2xl mx-auto text-center py-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">
              5x5 Grid Battle
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white">BINGO 1v1</h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Arrange your numbers from 1 to 25. Take turns picking numbers. Complete 5 rows, columns, or diagonals to form B-I-N-G-O!
            </p>
          </div>

          <div className="space-y-3">
            <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/60 to-slate-900 border border-indigo-700/50 text-left space-y-5 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-none">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white">Play online with a friend</h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Create a Match, share the invite, and play together from separate phones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode('online-host')}
                data-priority="primary"
                className="min-h-12 w-full px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base text-center shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Create Online Match
              </button>
            </section>

            <button
              type="button"
              onClick={() => setMode('local')}
              data-priority="secondary"
              className="min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Play className="w-4 h-4" />
              Pass & Play on this device
            </button>
          </div>

          {/* Quick Rules */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-left space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Rules & Win Conditions</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Each player sets up a 5x5 board containing numbers 1 to 25.</li>
              <li>Players take turns calling any uncalled number.</li>
              <li>When a number is called, both players mark that number off on their board.</li>
              <li>A complete horizontal row, vertical column, or diagonal line scores 1 letter (B-I-N-G-O).</li>
              <li>The first player to score 5 completed lines wins!</li>
            </ul>
          </div>
        </div>
      )}

      {mode === 'local' && <BingoLocalGame />}

      {mode === 'online-host' && (
        <BingoOnlineGame role="host" onExit={handleExitToHub} />
      )}

      {mode === 'online-guest' && matchParam && (
        <BingoOnlineGame role="guest" matchId={matchParam} onExit={handleExitToHub} />
      )}
    </div>
  )
}

export default function BingoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <BingoContent />
    </Suspense>
  )
}
