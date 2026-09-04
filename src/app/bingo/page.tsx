'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { BingoLocalGame } from '@/games/bingo/components/BingoLocalGame'
import { ArrowLeft, Users, Play, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BingoPage() {
  const [mode, setMode] = useState<'hub' | 'local'>('hub')

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full py-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Games</span>
        </Link>
        {mode === 'local' && (
          <button
            type="button"
            onClick={() => setMode('hub')}
            className="text-xs text-slate-400 hover:text-slate-200 underline font-medium"
          >
            Change Mode
          </button>
        )}
      </div>

      {mode === 'hub' ? (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pass & Play / Local Mode */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between text-left space-y-4 shadow-xl">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/80 flex items-center justify-center font-bold">
                  <Play className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Pass & Play</h3>
                <p className="text-xs text-slate-400">
                  Play locally on this device with a friend, taking turns on the same screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('local')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Play Local Match
              </button>
            </div>

            {/* P2P Multiplayer Mode */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-800/40 flex flex-col justify-between text-left space-y-4 shadow-xl">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">P2P Online Match</h3>
                <p className="text-xs text-slate-400">
                  Create a Match, send an invite link to your friend, and connect browser-to-browser.
                </p>
              </div>
              <Link
                href="/bingo/match-preview"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm text-center block shadow-md transition-all active:scale-95"
              >
                Create Online Match
              </Link>
            </div>
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
      ) : (
        <BingoLocalGame />
      )}
    </div>
  )
}
